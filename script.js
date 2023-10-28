var images = {
    stone: "stone",
    brick: "brick"
};

var points = [];

var shapes = [];

var lines = [];

var player = undefined;

const mapSize = 50;
const tileSize = 20;
const lightSteps = 16;

const gravity = 0.5;

var currentEditingLine = undefined;

let softbodies = [];

async function init() {
    shapes.push(new Shape())
    initiateMap();
    fixCanvas();
    await loadImages(images);
    player = new Player(200, 800);

    softbodies.push(new SoftBody(300,750,20,0.3,1))
    softbodies.push(new SoftBody(300,200,20,0.5,1))
    softbodies.push(new SoftBody(300,300,20,0.5,1))
    softbodies.push(new SoftBody(300,400,20,0.5,1))
    softbodies.push(new SoftBody(300,500,20,0.5,1))

    update();

};



function initiateMap() {
    points = [];
    for (let x = 0; x < mapSize; x++) {
        let row = [];
        for (let y = 0; y < mapSize; y++) {
            row.push(new Point(x, y));
        };
        points.push(row);
    };

    let topLine = new Line(points[0][0], points[points.length - 1][0])
    points[0][0].connectedTo.push(topLine)
    points[points.length - 1][0].connectedTo.push(topLine)
    lines.push(topLine)

    let rightLine = new Line(points[points.length - 1][0], points[points.length - 1][points[points.length - 1].length - 1])
    points[0][0].connectedTo.push(rightLine)
    points[points.length - 1][0].connectedTo.push(rightLine)
    lines.push(rightLine)

    let downLine = new Line(points[points.length - 1][points[points.length - 1].length - 1], points[0][points[points.length - 1].length - 1])
    points[0][0].connectedTo.push(downLine)
    points[points.length - 1][0].connectedTo.push(downLine)
    lines.push(downLine)

    let leftLine = new Line(points[0][points[points.length - 1].length - 1], points[0][0])
    points[0][0].connectedTo.push(leftLine)
    points[points.length - 1][0].connectedTo.push(leftLine)
    lines.push(leftLine)
};

function update() {
    requestAnimationFrame(update);
    renderC.clearRect(0, 0, renderCanvas.width, renderCanvas.height)
    c.clearRect(0, 0, canvas.width, canvas.height);

    render();

    c.fillStyle = "white"
    c.font = "10px Arial"
    c.fillText(fps, 5, 10)

    renderC.imageSmoothingEnabled = false;
    renderC.drawImage(canvas, 0, 0, renderCanvas.width, renderCanvas.height);


};

function render() {
    for (let x = -1; x < canvas.width / 64 + 1; x++) {
        for (let y = -1; y < canvas.height / 64 + 1; y++) {
            c.drawImageFromSpriteSheet(x * 64 - player.x % 64, y * 64 - player.y % 64, 64, 64, images.brick, 0, 0, 64, 64)
        }

    }

    shapes.forEach(e => e.draw());
    points.forEach(e => e.forEach(g => g.update()));
    lines.forEach(e => e.update());

    //drawShadows();

    //drawViewCone();

    drawLineToMouse();

    softbodies.forEach(e => e.update());
    

    player.update();
};

function getShadowClippingForPoint(fromX, fromY) {
    let pointsToDrawShadowAround = [];

    lines.forEach(e => {
        if (!lines.connectedSoftBody) {
            if (!lines.filter(g => lineIntersect(g.from.x * tileSize - Math.floor(player.x), g.from.y * tileSize - Math.floor(player.y), g.to.x * tileSize - Math.floor(player.x), g.to.y * tileSize - Math.floor(player.y), e.from.x * tileSize - Math.floor(player.x), e.from.y * tileSize - Math.floor(player.y), fromX, fromY)).length) {
                let tmpAngle = angleFromPoints(e.from.x * tileSize - Math.floor(player.x), e.from.y * tileSize - Math.floor(player.y), fromX, fromY) + 180;

                let thisLineIntersections = [];

                lines.forEach(g => {
                    thisLineIntersections.push({ angle: tmpAngle - 0.1, line: checkLineIntersection(-1000000 * Math.cos((tmpAngle - 180 - 0.1) * toRad) + fromX, -1000000 * Math.sin((tmpAngle - 180 - 0.1) * toRad) + fromY, fromX, fromY, g.from.x * tileSize - Math.floor(player.x), g.from.y * tileSize - Math.floor(player.y), g.to.x * tileSize - Math.floor(player.x), g.to.y * tileSize - Math.floor(player.y)) });
                    thisLineIntersections.push({ angle: tmpAngle + 0.1, line: checkLineIntersection(-1000000 * Math.cos((tmpAngle - 180 + 0.1) * toRad) + fromX, -1000000 * Math.sin((tmpAngle - 180 + 0.1) * toRad) + fromY, fromX, fromY, g.from.x * tileSize - Math.floor(player.x), g.from.y * tileSize - Math.floor(player.y), g.to.x * tileSize - Math.floor(player.x), g.to.y * tileSize - Math.floor(player.y)) });
                })

                let tmp = thisLineIntersections.filter(g => g.line.onLine2 && g.line.onLine1);
                tmp = tmp.filter(g => distance(g.line.x, g.line.y, e.from.x * tileSize - Math.floor(player.x), e.from.y * tileSize - Math.floor(player.y)) > 0.001)
                tmp = getGroupedBy(tmp, "angle")

                tmp.forEach(g => {
                    e = g.sort((a, b) => distance(a.line.x, a.line.y, fromX, fromY) - distance(b.line.x, b.line.y, fromX, fromY))

                    pointsToDrawShadowAround.push({ x: (g[0].line.x + Math.floor(player.x)) / tileSize, y: (g[0].line.y + Math.floor(player.y)) / tileSize, angle: g[0].angle })
                })
            }
        }

    })
    pointsToDrawShadowAround = pointsToDrawShadowAround.sort((a, b) => a.angle - b.angle);

    let clipping2 = new Path2D();
    pointsToDrawShadowAround.forEach((e, i, a) => {
        clipping2.moveTo(fromX, fromY);
        clipping2.lineTo(e.x * tileSize - Math.floor(player.x), e.y * tileSize - Math.floor(player.y));
        clipping2.lineTo(a[(i < a.length - 1) ? i + 1 : 0].x * tileSize - Math.floor(player.x), a[(i < a.length - 1) ? i + 1 : 0].y * tileSize - Math.floor(player.y));
        clipping2.lineTo(fromX, fromY);
    })
    return clipping2;
}

function drawShadows() {
    let clipping2 = getShadowClippingForPoint(canvas.width / 2, canvas.height / 2);
    let newCanvas = document.createElement("canvas");
    newCanvas.width = canvas.width;
    newCanvas.height = canvas.height;
    let newC = newCanvas.getContext("2d");

    newC.fillStyle = "black";
    newC.fillRect(0, 0, canvas.width, canvas.height);

    newC.save();
    newC.clip(clipping2);

    newC.clearRect(0, 0, canvas.width, canvas.height);

    newC.restore();

    c.drawImage(newCanvas, 0, 0)

}

function drawViewCone() {
    let clipping = new Path2D();
    clipping.arc(canvas.width / 2, canvas.height / 2, 40, 0, 2 * Math.PI, false);

    clipping.moveTo(canvas.width / 2, canvas.height / 2);

    let viewingAngle = 60;
    let viewLength = 1000;
    let angle = angleFromPoints(canvas.width / 2, canvas.height / 2, mouse.x, mouse.y);

    clipping.lineTo(viewLength * Math.cos((angle - viewingAngle) * toRad) + canvas.width / 2, viewLength * Math.sin((angle - viewingAngle) * toRad) + canvas.height / 2)
    clipping.lineTo(viewLength * Math.cos((angle + viewingAngle) * toRad) + canvas.width / 2, viewLength * Math.sin((angle + viewingAngle) * toRad) + canvas.height / 2)

    let newCanvas = document.createElement("canvas");
    newCanvas.width = canvas.width;
    newCanvas.height = canvas.height;
    let newC = newCanvas.getContext("2d");

    newC.fillStyle = "black";
    newC.fillRect(0, 0, canvas.width, canvas.height);

    newC.save();
    newC.clip(clipping);

    newC.clearRect(0, 0, canvas.width, canvas.height);

    newC.restore();
    c.globalAlpha = 0.5;
    c.drawImage(newCanvas, 0, 0)
    c.globalAlpha = 1;

}

function drawShape(shape) {
    if (shape.lines.length) {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (let i = 0; i < shape.lines.length; i++) {
            minX = Math.min(minX, Math.min(shape.lines[i].from.x, shape.lines[i].to.x))
            minY = Math.min(minY, Math.min(shape.lines[i].from.y, shape.lines[i].to.y))
            maxX = Math.max(maxX, Math.max(shape.lines[i].from.x, shape.lines[i].to.x))
            maxY = Math.max(maxY, Math.max(shape.lines[i].from.y, shape.lines[i].to.y))
        }
        if (minX == maxX || minY == maxY) return;
        let newCanvas = document.createElement("canvas");
        newCanvas.width = (maxX - minX) * tileSize;
        newCanvas.height = (maxY - minY) * tileSize;
        let newC = newCanvas.getContext("2d");
        newC.beginPath();
        newC.moveTo((shape.lines[0].from.x - minX) * tileSize, (shape.lines[0].from.y - minY) * tileSize);
        for (var i = 1; i < shape.lines.length; i++) {
            newC.lineTo((shape.lines[i].from.x - minX) * tileSize, (shape.lines[i].from.y - minY) * tileSize);
        }
        newC.lineTo((shape.lines[0].from.x - minX) * tileSize, (shape.lines[0].from.y - minY) * tileSize);
        newC.closePath();
        newC.clip();
        for (let x = 0; x < (newCanvas.width + minX * tileSize) / images.stone.frame.w; x++) {
            for (let y = 0; y < (newCanvas.height + minY * tileSize) / images.stone.frame.h; y++) {
                newC.drawImageFromSpriteSheet(x * images.stone.frame.w - minX * tileSize, y * images.stone.frame.h - minY * tileSize, images.stone.frame.w, images.stone.frame.h, images.stone, 0, 0, images.stone.frame.w, images.stone.frame.h);
            };
        };
        shape.img = new Image();
        shape.img.src = newCanvas.toDataURL();

        shape.x = minX;
        shape.y = minY;

    }
}

function drawLineToMouse() {
    if (currentEditingLine) {
        drawLine({ x: currentEditingLine.x - player.x / tileSize, y: currentEditingLine.y - player.y / tileSize }, { x: mouse.x / tileSize, y: mouse.y / tileSize });
    };
};

function save() {
    localStorage.setItem("lines", JSON.prune(lines));
}
function load() {
    lines = [];
    let tmpLines = JSON.parse(localStorage.getItem("lines"));

    tmpLines?.forEach(e => {
        lines.push(new Line(e.from, e.to))
    });
}

class Shape {
    constructor() {
        this.lines = [];
        this.x = undefined;
        this.y = undefined;
        this.img = undefined;
    }
    draw() {
        if (this.img) c.drawImage(this.img, Math.floor(this.x * tileSize - player.x), Math.floor(this.y * tileSize - player.y));
    }
}
class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;

        this.color = "black";

        this.connectedTo = [];
        this.light = 0;
    };

    update() {
        this.draw();
        this.hover = (distance(this.x * tileSize - player.x, this.y * tileSize - player.y, mouse.x, mouse.y) < tileSize / 4);

        this.color = this.hover ? "white" : "gray";

        if (this.hover && pressedKeys["KeyF"]) {
            this.light++;
            pressedKeys["KeyF"] = false;
        };

        if (this.hover && mouse.down && !currentEditingLine) {
            currentEditingLine = this;
            mouse.down = false;
        } else if (this.hover && mouse.down && currentEditingLine !== this) {
            mouse.down = false;
            let line = new Line(currentEditingLine, this);
            currentEditingLine.connectedTo.push(line);
            this.connectedTo.push(line);
            lines.push(line);
            shapes[shapes.length - 1].lines.push(line)
            if (this.x == shapes[shapes.length - 1].lines[0].from.x && this.y == shapes[shapes.length - 1].lines[0].from.y) {
                currentEditingLine = undefined;
                mouse.down = false;
                shapes[shapes.length - 1].lines.forEach(e => e.shouldDraw = false)
                drawShape(shapes[shapes.length - 1])
                shapes.push(new Shape());
            } else {
                currentEditingLine = this;
            }
        } else if (this.hover && mouse.down && currentEditingLine == this) {
            shapes[shapes.length - 1].lines.forEach(e => {
                lines.forEach((g, i) => {
                    if (e.x == g.x && e.y == g.y) {
                        lines.splice(i, 1);
                    }
                })
            })
            shapes[shapes.length - 1].lines = [];
            currentEditingLine = undefined;
            mouse.down = false;
        };
    };
    draw() {
        if (distance(this.x * tileSize - player.x, this.y * tileSize - player.y, mouse.x, mouse.y) < tileSize * 1.5) {
            drawCircle(Math.floor(this.x * tileSize - player.x), Math.floor(this.y * tileSize - player.y), 2, this.color);
        }
    };
};

class Line {
    constructor(from, to, connectedSoftBody) {
        this.from = from;
        this.to = to;
        this.color = "gray";
        this.shouldDraw = true;
        this.connectedSoftBody = connectedSoftBody;
    };
    update() {
        this.draw();
    };
    draw() {
        if (this.shouldDraw) {
            drawLine({ x: this.from.x - player.x / tileSize, y: this.from.y - player.y / tileSize }, { x: this.to.x - player.x / tileSize, y: this.to.y - player.y / tileSize }, this.color);
        }
    };
};

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 10;
        this.h = 20;
        this.vx = 0;
        this.vy = 0;
        this.speedLoss = 0.9;
        this.speedClamp = 5;

        this.oldX = x;
        this.oldY = y;

        this.gravityOn = false;
    }
    draw() {
        c.fillStyle = "black"
        c.fillRect(Math.floor(canvas.width / 2 - this.w / 2), Math.floor(canvas.height / 2 - this.h / 2), this.w, this.h)

        //c.fillRect(Math.floor(canvas.width / 2 - this.w / 2) - (this.x - this.oldX), Math.floor(canvas.height / 2 - this.h / 2)- (this.y - this.oldY), this.w, this.h)
    }
    update() {
        this.oldX = this.x;
        this.oldY = this.y;

        this.updateVelocity();

        this.vy += (this.gravityOn ? gravity : 0);

        this.x += this.vx;
        this.y += this.vy;

        this.checkCollisions();
        this.draw();
    }
    updateVelocity() {
        this.vx = this.vx > this.speedClamp ? this.speedClamp : (this.vx < -this.speedClamp ? -this.speedClamp : this.vx);
        this.vy = this.vy > this.speedClamp ? this.speedClamp : (this.vy < -this.speedClamp ? -this.speedClamp : this.vy);
        this.vx *= this.speedLoss;
        this.vy *= this.speedLoss;
        this.vx += (pressedKeys['KeyD'] ? 1 : (pressedKeys['KeyA'] ? -1 : 0));
        this.vy += (pressedKeys['KeyS'] ? 1 : (pressedKeys['KeyW'] ? -1 : 0));
    }
    checkCollisions() {
        lines.forEach(e => {
            let collisionArray = movingObjectToLineIntersect({ x: e.from.x * tileSize, y: e.from.y * tileSize }, { x: e.to.x * tileSize, y: e.to.y * tileSize }, this.x + Math.floor(canvas.width / 2 - this.w / 2), this.y + Math.floor(canvas.height / 2 - this.h / 2), this.w, this.h, this.oldX + Math.floor(canvas.width / 2 - this.w / 2), this.oldY + Math.floor(canvas.height / 2 - this.h / 2))
            if (collisionArray.includes("left") && collisionArray.includes("right")) {
                this.y -= this.vy;
                this.vy = 0;
            }
            if (collisionArray.includes("up")) {
                this.y -= this.vy;
                this.vy = 0;
            }
            if (collisionArray.includes("down")) {
                this.y -= this.vy;
                this.vy = 0;
            }
            if (collisionArray.includes("left")) {
                if (this.vx < 0) {
                    this.x -= this.vx;
                    this.vx = 0;
                }
            }
            if (collisionArray.includes("right")) {
                if (this.vx > 0) {
                    this.x -= this.vx;
                    this.vx = 0;
                }
            }
        })
    }
}

class SoftBody{
    constructor(x,y,mass,stiff,damp){
        let self = this;
        this.massPoints = [];
        this.springs = [];
        this.originalPointOffsets = [
            {
                x:0,y:0
            },{
                x:20,y:0
            },{
                x:40,y:0
            },{
                x:40,y:20
            },{
                x:40,y:40
            },{
                x:20,y:40
            },{
                x:0,y:40
            },{
                x:0,y:20
            },{
                x:20,y:20
            }
        ]
        this.originalPointOffsetCenter = new Vector(0,0);
        this.originalPointOffsets.forEach(e => {
            self.originalPointOffsetCenter[0] += e.x;
            self.originalPointOffsetCenter[1] += e.y;
        })
        this.originalPointOffsetCenter[0] = this.originalPointOffsetCenter[0] / this.originalPointOffsets.length
        this.originalPointOffsetCenter[1] = this.originalPointOffsetCenter[1] / this.originalPointOffsets.length
        this.shapeMaintainingPoints = [];
        this.shapeMaintainingSprings = [];

        this.originalPointOffsets.forEach(offset =>{
            self.massPoints.push(new MassPoint(x+offset.x, y+offset.y, mass,this,false))
        })

        this.springs.push(new Spring(this.massPoints[0], this.massPoints[1], stiff, 20, damp, true, true,this))
        this.springs.push(new Spring(this.massPoints[1], this.massPoints[2], stiff, 20, damp, true, true,this))
        this.springs.push(new Spring(this.massPoints[2], this.massPoints[3], stiff, 20, damp, true, true,this))
        this.springs.push(new Spring(this.massPoints[3], this.massPoints[4], stiff, 20, damp, true, true,this))
        this.springs.push(new Spring(this.massPoints[4], this.massPoints[5], stiff, 20, damp, true, true,this))
        this.springs.push(new Spring(this.massPoints[5], this.massPoints[6], stiff, 20, damp, true, true,this))
        this.springs.push(new Spring(this.massPoints[6], this.massPoints[7], stiff, 20, damp, true, true,this))
        this.springs.push(new Spring(this.massPoints[7], this.massPoints[0], stiff, 20, damp, true, true,this))

        this.springs.push(new Spring(this.massPoints[1], this.massPoints[8], stiff, 20, damp,true, false,this))
        this.springs.push(new Spring(this.massPoints[7], this.massPoints[8], stiff, 20, damp,true, false,this))
        this.springs.push(new Spring(this.massPoints[3], this.massPoints[8], stiff, 20, damp,true, false,this))
        this.springs.push(new Spring(this.massPoints[5], this.massPoints[8], stiff, 20, damp,true, false,this))

        this.springs.push(new Spring(this.massPoints[0], this.massPoints[8], stiff, Math.sqrt(800), damp,true, false,this))
        this.springs.push(new Spring(this.massPoints[1], this.massPoints[7], stiff, Math.sqrt(800), damp,true, false,this))

        this.springs.push(new Spring(this.massPoints[1], this.massPoints[3], stiff, Math.sqrt(800), damp,true, false,this))
        this.springs.push(new Spring(this.massPoints[2], this.massPoints[8], stiff, Math.sqrt(800), damp,true, false,this))

        this.springs.push(new Spring(this.massPoints[3], this.massPoints[5], stiff, Math.sqrt(800), damp,true, false,this))
        this.springs.push(new Spring(this.massPoints[4], this.massPoints[8], stiff, Math.sqrt(800), damp,true, false,this))

        this.springs.push(new Spring(this.massPoints[5], this.massPoints[7], stiff, Math.sqrt(800), damp,true, false,this))
        this.springs.push(new Spring(this.massPoints[6], this.massPoints[8], stiff, Math.sqrt(800), damp,true, false,this))

        this.massPoints.forEach(masspoint => {
            self.shapeMaintainingPoints.push(new StablePoint(masspoint.pos[0],masspoint.pos[1]));
            self.shapeMaintainingSprings.push(new Spring(self.shapeMaintainingPoints[self.shapeMaintainingPoints.length-1],masspoint,0.2,0,0.5,true,false,this,"blue",5));
        })
    }
    updateShapeMaintaining(){
        let self = this;
        let center = new Vector(0,0);

        this.massPoints.forEach(e =>{
            center.forEach((g,i)=>{
                center[i] += e.pos[i]
            });
        });
        center.forEach((g,i)=>{
            center[i] =  center[i] / self.massPoints.length;
        });
        this.shapeMaintainingPoints.forEach(e => e.draw());

        let degs = [];
        this.massPoints.forEach((masspoint,i) => {
            degs.push(Math.floor(angle360(self.originalPointOffsetCenter[0],self.originalPointOffsetCenter[0],self.originalPointOffsets[i].x,self.originalPointOffsets[i].y) - angle360(masspoint.pos[0],masspoint.pos[1],center[0],center[1])) );
        });

        degs = -meanAngleDeg(degs) + 180

        this.shapeMaintainingPoints.forEach((point,i) => {
            point.pos[0] = center[0] + Math.cos(degs*toRad) * (this.originalPointOffsets[i].x -this.originalPointOffsetCenter[0])- Math.sin(degs*toRad) * (this.originalPointOffsets[i].y-this.originalPointOffsetCenter[1]);
            point.pos[1] = center[1] + Math.cos(degs*toRad) *( this.originalPointOffsets[i].y-this.originalPointOffsetCenter[1]) + Math.sin(degs*toRad) * (this.originalPointOffsets[i].x-this.originalPointOffsetCenter[0]);
        })
        this.shapeMaintainingSprings.forEach(e => e.update());
    }
    update(){
        this.springs.forEach(e => {e.update();})
        this.massPoints.forEach(e => {e.update();})
        this.updateShapeMaintaining();

    }
}

class StablePoint{
    constructor(x,y){
        this.lastPos = new Vector(x,y);
        this.pos = new Vector(x,y);
        this.Targetpos = new Vector(x,y);
        this.v = new Vector(0,0);
        this.connectedSprings = [];
        this.moveSpeed = 1;
    }
    draw(){
        //drawCircle(Math.floor(this.pos[0] - player.x), Math.floor(this.pos[1] - player.y), 2, "yellow");
    }
    

}

class MassPoint {
    constructor(x, y, m, connectedSoftBody,draw) {
        this.pos = new Vector(x, y);
        this.v = new Vector(0, 0);
        this.f = new Vector(0, 0);
        this.m = m;
        this.connectedSprings = [];
        this.drawing = draw == undefined ? true : draw;
        this.connectedSoftBody = connectedSoftBody;
    }

    update() {
        let self = this;
        this.f.reset();
        this.f.forEach((u, i) => {
            let f = 0;
            f += (i == 1 ? gravity * self.m / 100 : 0)

            this.connectedSprings.forEach(spring => {
                if (spring.massP1 == this) {
                    f += spring.forceForPoint1[i]
                }
                if (spring.massP2 == this) {
                    f += spring.forceForPoint2[i]
                }
            })
            self.f[i] = f;
        })
        this.v.forEach((v, i) => {
            let vel = v;
            vel += self.f[i] * deltaTime / self.m;
            vel = vel.clamp(-100,100)
            self.v[i] = vel;
        })
        this.pos.forEach((pos, i) => {
            let p = pos;
            p += this.v[i] * deltaTime;
            self.pos[i] = p;
        })
        lines.forEach(line => {
            if (line.connectedSoftBody !== self.connectedSoftBody) {
                if (lineCircleCollide([line.from.x * tileSize, line.from.y * tileSize], [line.to.x * tileSize, line.to.y * tileSize], this.pos, 3)) {
                    this.pos.forEach((pos, i) => {
                        let p = pos;
                        p -= this.v[i] * deltaTime;
                        self.pos[i] = p;
                    })
                    this.v.forEach((v, i) => {
                            self.v[i] = 0;
                    })
                }
            }
        })
        if (this.drawing) {
            this.draw();
        }
    }
    draw() {
        drawCircle(Math.floor(this.pos[0] - player.x), Math.floor(this.pos[1] - player.y), 2, "black");
    }
}

class Spring {
    constructor(massP1, massP2, stiffness, restLength, dampingFactor, draw, hasCollision,softbody,color,ignoreIfUnder) {
        this.massP1 = massP1;
        this.massP2 = massP2;
        this.stiffness = stiffness;
        this.restLength = restLength;
        this.dampingFactor = dampingFactor;
        this.forceAngle = 0;
        this.force = 0;
        this.forceForPoint1 = new Vector(0, 0);
        this.forceForPoint2 = new Vector(0, 0);
        this.massP1.connectedSprings.push(this);
        this.massP2.connectedSprings.push(this);
        this.drawing = draw == undefined ? true : draw;
        this.hasCollision = hasCollision == undefined ? false : true;
        if (this.hasCollision) {
            this.line = new Line({ x: this.massP1.pos[0] / tileSize, y: this.massP1.pos[1] / tileSize }, { x: this.massP2.pos[0] / tileSize, y: this.massP2.pos[1] / tileSize }, softbody)
            this.line.shouldDraw = false;
            lines.push(this.line);
        }
        this.color = !color ? "red" : color;
        this.ignoreIfUnder = ignoreIfUnder == undefined ? 0 : ignoreIfUnder;
    }
    update() {
        if(distance(this.massP1.pos[0], this.massP1.pos[1], this.massP2.pos[0], this.massP2.pos[1]) > this.ignoreIfUnder){
            let velDiff = this.massP1.v.subtract(this.massP2.v);
            this.force = this.stiffness * ((distance(this.massP1.pos[0], this.massP1.pos[1], this.massP2.pos[0], this.massP2.pos[1]) - this.restLength));
            this.forceAngle = angleFromPoints(this.massP1.pos[0], this.massP1.pos[1], this.massP2.pos[0], this.massP2.pos[1]);
            this.forceForPoint1[0] = Math.cos(this.forceAngle * toRad) * this.force - velDiff[0] * this.dampingFactor;
            this.forceForPoint1[1] = Math.sin(this.forceAngle * toRad) * this.force - velDiff[1] * this.dampingFactor;
            this.forceForPoint2[0] = -Math.cos(this.forceAngle * toRad) * this.force + velDiff[0] * this.dampingFactor;
            this.forceForPoint2[1] = -Math.sin(this.forceAngle * toRad) * this.force + velDiff[1] * this.dampingFactor;
    
            if (this.hasCollision) {
                this.line.from = { x: this.massP1.pos[0].toPrecision(3) / tileSize, y: this.massP1.pos[1].toPrecision(3) / tileSize };
                this.line.to = { x: this.massP2.pos[0].toPrecision(3) / tileSize, y: this.massP2.pos[1].toPrecision(3) / tileSize };
            };
            if (this.drawing) {
                this.draw();
            };
        }else{
            this.forceForPoint1[0] = 0;
            this.forceForPoint1[1] = 0;
            this.forceForPoint2[0] = 0;
            this.forceForPoint2[1] = 0;
    
            if (this.hasCollision) {
                this.line.from = { x: this.massP1.pos[0].toPrecision(3) / tileSize, y: this.massP1.pos[1].toPrecision(3) / tileSize };
                this.line.to = { x: this.massP2.pos[0].toPrecision(3) / tileSize, y: this.massP2.pos[1].toPrecision(3) / tileSize };
            };
        };
        
    };
    draw() {
        drawLine({ x: (this.massP1.pos[0] - player.x) / tileSize, y: (this.massP1.pos[1] - player.y) / tileSize }, { x: (this.massP2.pos[0] - player.x) / tileSize, y: (this.massP2.pos[1] - player.y) / tileSize }, "rgb("+this.force*20+","+this.force*20+","+this.force*20+")")
    };
};

class Vector extends Array {
    add(other) {
        return this.map((e, i) => e + other[i]);
    }
    subtract(other) {
        return this.map((e, i) => e - other[i]);
    }
    reset() {
        this.map(e => (e = 0));
    }
}

init();