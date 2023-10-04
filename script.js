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
}

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 10;
        this.h = 20;
        this.vx = 0;
        this.vy = 0;
        this.speedLoss = 0.9;
        this.speedClamp = 20;

        this.oldX = x;
        this.oldY = y;

        this.gravityOn = true;
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



        this.draw()

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
