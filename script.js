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

const gravity = 0.5;

var currentEditingLine = undefined;

async function init() {
    shapes.push(new Shape())
    initiateMap();
    fixCanvas();
    await loadImages(images);
    player = new Player(200, 200);
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

    renderC.imageSmoothingEnabled = false;
    renderC.drawImage(canvas, 0, 0, renderCanvas.width, renderCanvas.height);
};

function render() {
    for (let x = -1; x < canvas.width / 64 + 1; x++) {
        for (let y = -1; y < canvas.height / 64 + 1; y++) {
            c.drawImageFromSpriteSheet(x * 64 - player.x % 64, y * 64 - player.y % 64, 64, 64, images.brick, 0, 0, 64, 64)
        }

    }
    lines.forEach(e => e.update());
    shapes.forEach(e => e.draw());
    points.forEach(e => e.forEach(g => g.update()));

    drawLight();

    drawLineToMouse();

    player.update();
};

function drawLight() {
    lightC.clearRect(0, 0, lightCanvas.width, lightCanvas.height)
    lightC.fillStyle = "black";
    lightC.globalAlpha = 0.5;
    lightC.fillRect(0, 0, lightCanvas.width, lightCanvas.height);
    lightC.globalAlpha = 1;

    lightC.save();

    let clipping = new Path2D();
    clipping.arc(canvas.width / 2, canvas.height / 2, 40, 0, 2 * Math.PI, false);

    clipping.moveTo(canvas.width / 2, canvas.height / 2);

    let viewingAngle = 60;
    let viewLength = 1000;
    let angle = angleFromPoints(canvas.width / 2, canvas.height / 2, mouse.x, mouse.y);

    clipping.lineTo(viewLength * Math.cos((angle - viewingAngle) * toRad) + canvas.width / 2, viewLength * Math.sin((angle - viewingAngle) * toRad) + canvas.height / 2)
    clipping.lineTo(viewLength * Math.cos((angle + viewingAngle) * toRad) + canvas.width / 2, viewLength * Math.sin((angle + viewingAngle) * toRad) + canvas.height / 2)

    lightC.clip(clipping);

    lightC.clearRect(0, 0, lightCanvas.width, lightCanvas.height);

    lightC.restore();

    lightC.fillStyle = "black";
    lightC.globalAlpha = 0.5;
    lightC.fillRect(0, 0, lightCanvas.width, lightCanvas.height);
    lightC.globalAlpha = 1;

    let pointsToDrawShadowAround = [];

    lines.forEach(e => {
        if (!lines.filter(g => lineIntersect(g.from.x * tileSize - Math.floor(player.x), g.from.y * tileSize - Math.floor(player.y), g.to.x * tileSize - Math.floor(player.x), g.to.y * tileSize - Math.floor(player.y), e.from.x * tileSize - Math.floor(player.x), e.from.y * tileSize - Math.floor(player.y), canvas.width / 2, canvas.height / 2)).length) {
            let tmpAngle = angleFromPoints(e.from.x * tileSize - Math.floor(player.x), e.from.y * tileSize - Math.floor(player.y), canvas.width / 2, canvas.height / 2) + 180;

            let thisLineIntersections = [];

            lines.forEach(g => {
                thisLineIntersections.push({ angle: tmpAngle - 0.01, line: checkLineIntersection(-1000000 * Math.cos((tmpAngle - 180 - 0.01) * toRad) + canvas.width / 2, -1000000 * Math.sin((tmpAngle - 180 - 0.01) * toRad) + canvas.height / 2, canvas.width / 2, canvas.height / 2, g.from.x * tileSize - Math.floor(player.x), g.from.y * tileSize - Math.floor(player.y), g.to.x * tileSize - Math.floor(player.x), g.to.y * tileSize - Math.floor(player.y)) });
                thisLineIntersections.push({ angle: tmpAngle + 0.01, line: checkLineIntersection(-1000000 * Math.cos((tmpAngle - 180 + 0.01) * toRad) + canvas.width / 2, -1000000 * Math.sin((tmpAngle - 180 + 0.01) * toRad) + canvas.height / 2, canvas.width / 2, canvas.height / 2, g.from.x * tileSize - Math.floor(player.x), g.from.y * tileSize - Math.floor(player.y), g.to.x * tileSize - Math.floor(player.x), g.to.y * tileSize - Math.floor(player.y)) });
            })

            let tmp = thisLineIntersections.filter(g => g.line.onLine2 && g.line.onLine1);
            tmp = tmp.filter(g => distance(g.line.x, g.line.y, e.from.x * tileSize - Math.floor(player.x), e.from.y * tileSize - Math.floor(player.y)) > 0.001)
            tmp = getGroupedBy(tmp, "angle")

            tmp.forEach(g => {
                e = g.sort((a, b) => distance(a.line.x, a.line.y, canvas.width / 2, canvas.height / 2) - distance(b.line.x, b.line.y, canvas.width / 2, canvas.height / 2))

                pointsToDrawShadowAround.push({ x: (g[0].line.x + Math.floor(player.x)) / tileSize, y: (g[0].line.y + Math.floor(player.y)) / tileSize, angle: g[0].angle })
            })
        }
    })
    pointsToDrawShadowAround = pointsToDrawShadowAround.sort((a, b) => a.angle - b.angle);

    lightC.save();

    let clipping2 = new Path2D();
    pointsToDrawShadowAround.forEach((e, i, a) => {
        clipping2.moveTo(canvas.width / 2, canvas.height / 2);
        clipping2.lineTo(e.x * tileSize - Math.floor(player.x), e.y * tileSize - Math.floor(player.y));
        clipping2.lineTo(a[(i < a.length - 1) ? i + 1 : 0].x * tileSize - Math.floor(player.x), a[(i < a.length - 1) ? i + 1 : 0].y * tileSize - Math.floor(player.y));
        clipping2.lineTo(canvas.width / 2, canvas.height / 2);
    })
    lightC.clip(clipping);
    lightC.clip(clipping2);

    lightC.clearRect(0, 0, lightCanvas.width, lightCanvas.height);

    lightC.restore();

    c.drawImage(lightCanvas, 0, 0)

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
    };

    update() {
        this.draw();
        this.hover = (distance(this.x * tileSize - player.x, this.y * tileSize - player.y, mouse.x, mouse.y) < tileSize / 4);

        this.color = this.hover ? "gray" : "black";

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
    constructor(from, to) {
        this.from = from;
        this.to = to;
        this.color = "black";
        this.shouldDraw = true;
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

init();