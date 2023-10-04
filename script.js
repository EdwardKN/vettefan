var images = [];

var map = [];

var lines = [];

var player = undefined;

const mapSize = 15;
const tileSize = 20;

const gravity = 0.5;

var currentEditingLine = undefined;

async function init() {
    initiateMap();
    fixCanvas();
    //await loadImages(images);
    player = new Player(100, 100)
    update();
}

function initiateMap() {
    map = [];
    for (let x = 0; x < mapSize; x++) {
        let row = [];
        for (let y = 0; y < mapSize; y++) {
            row.push(new Point(x, y))
        }
        map.push(row);
    }
}

function update() {
    requestAnimationFrame(update);
    renderC.clearRect(0, 0, renderCanvas.width, renderCanvas.height)
    c.clearRect(0, 0, canvas.width, canvas.height);

    render();

    renderC.imageSmoothingEnabled = false;
    renderC.drawImage(canvas, 0, 0, renderCanvas.width, renderCanvas.height);
}

function render() {
    map.forEach(e => e.forEach(g => g.update()));

    drawLineToMouse();

    player.update();
}

function drawLineToMouse() {
    if (currentEditingLine) {
        drawLine({ x: currentEditingLine.x - player.x / tileSize, y: currentEditingLine.y - player.y / tileSize }, { x: mouse.x / tileSize, y: mouse.y / tileSize });
    }
}



class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;

        this.color = "black";

        this.connectedTo = [];
    }

    update() {
        this.draw();
        this.hover = (distance(this.x * tileSize - player.x, this.y * tileSize - player.y, mouse.x, mouse.y) < 5);

        this.color = this.hover ? "gray" : "black";

        if (this.hover && mouse.down && !currentEditingLine) {
            currentEditingLine = this;
            mouse.down = false;
        } else if (this.hover && mouse.down && currentEditingLine !== this) {
            let line = new Line(currentEditingLine, this);
            currentEditingLine.connectedTo.push(line);
            this.connectedTo.push(line);
            lines.push(line);
            currentEditingLine = undefined;
            mouse.down = false;
        } else if (this.hover && mouse.down && currentEditingLine == this) {
            currentEditingLine = undefined;
            mouse.down = false;
        }
        this.connectedTo.forEach(e => e.update());

    }

    draw() {
        drawCircle(this.x * tileSize - player.x, this.y * tileSize - player.y, 2, this.color);
    }
}

class Line {
    constructor(from, to) {
        this.from = from;
        this.to = to;
        this.color = "black";
        this.hover = false;
    }
    update() {
        this.hover = lineCircleCollide([this.from.x * tileSize - player.x, this.from.y * tileSize - player.x], [this.to.x * tileSize - player.x, this.to.y * tileSize - player.x], [mouse.x, mouse.y], 2);
        this.color = this.hover ? "gray" : "black"
        this.draw();
    }
    draw() {
        drawLine({ x: this.from.x - player.x / tileSize, y: this.from.y - player.y / tileSize }, { x: this.to.x - player.x / tileSize, y: this.to.y - player.y / tileSize }, this.color);
    }

    getAngle() {
        return angleFromPoints(this.from.x, this.from.y, this.to.x, this.to.y)
    }
}







class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        

        this.acc = 0.4
        this.speedLoss = 0.9;
        this.speedClamp = 4;

        this.w = 10;
        this.h = 20;
        this.oldX = x;
        this.oldY = y;
        this.gravityOn = false;
        this.angle = 0
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
        this.x += this.vx;
        this.y += this.vy;

        this.checkCollisions();

        this.draw()
    }
    updateVelocity() {
        this.vx = this.vx > this.speedClamp ? this.speedClamp : (this.vx < -this.speedClamp ? -this.speedClamp : this.vx);
        this.vy = this.vy > this.speedClamp ? this.speedClamp : (this.vy < -this.speedClamp ? -this.speedClamp : this.vy);
        this.vx *= this.speedLoss;
        this.vy *= this.speedLoss;
        this.vy += (this.gravityOn ? gravity : 0)

        let oX = 0
        let oY = 0
        if (pressedKeys['KeyD']) {
            oX += this.acc
        }

        if (pressedKeys['KeyA']) {
            oX -= this.acc
        }

        if (pressedKeys['KeyW']) {
            oY -= this.acc
        }

        if (pressedKeys['KeyS']) {
            oY += this.acc
        }

        if (oX !== 0 && oY !== 0) {
            let mag = Math.sqrt(oX * oX + oY * oY)
            oX *= this.acc / mag
            oY *= this.acc / mag
        }

        this.vx += oX
        this.vy += oY
    }
    checkCollisions() {
        lines.forEach(e => {
            let collisionArray = movingObjectToLineIntersect({ x: e.from.x * tileSize, y: e.from.y * tileSize }, { x: e.to.x * tileSize, y: e.to.y * tileSize }, this.x + Math.floor(canvas.width / 2 - this.w / 2), this.y + Math.floor(canvas.height / 2 - this.h / 2), this.w, this.h, this.oldX + Math.floor(canvas.width / 2 - this.w / 2), this.oldY + Math.floor(canvas.height / 2 - this.h / 2))
            //console.log(collisionArray)
            let angle = e.getAngle() * Math.PI / 180
            if (collisionArray.includes("left") && collisionArray.includes("right")) {
                this.y -= this.vy;
                this.vy = 0
            }

            if (collisionArray.includes("up")) {
                this.y -= this.vy * (1 - Math.sin(angle));
                this.x += this.vy * Math.cos(angle)
            }


            if (collisionArray.includes("down")) {
                if (!pressedKeys['KeyW']) {
                    this.y -= this.vy * (1 - Math.sin(angle))
                    this.x += this.vy * Math.cos(angle)
                } else {
                    if (this.vy > 0) this.y -= this.vy
                }
                
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


function fysik3(x1, y1, x2, y2, x3, y3) {
    let lineAngle = Math.atan2(y3 - y2, x3 - x2)
    let playerAngle = Math.atan2(y1, x1)
    let alpha = lineAngle - playerAngle

    let mag = Math.sqrt(x1 * x1 + y1 * y1)

    player.vx = mag * Math.cos((180 - alpha) * 180 / Math.PI)
    player.vy = mag * Math.sin((180 - alpha) * 180 / Math.PI)
}


function fysik2(x1, y1, x2, y2, x3, y3) {
    x2 = x3 - x2
    y2 = y3 - y2
    let dotProduct = x1 * x2 + y1 * y2
    let mag1 = Math.sqrt(x1 * x1 + y1 * y1)
    let mag2 = Math.sqrt(x2 * x2 + y2 * y2)

    let alpha = Math.acos(dotProduct / (mag1 * mag2))

    console.log(alpha)
}

function fysik(x1, y1, x2, y2, x3, y3) {
    let lineAngle = Math.atan2(y3 - y2, x3 - x2) * toDeg
    let playerAngle = Math.atan2(y1, x1)
    let infallsvinkel = playerAngle - (lineAngle + 90)
    let utvinkel = lineAngle + 90 - infallsvinkel
    
}
    