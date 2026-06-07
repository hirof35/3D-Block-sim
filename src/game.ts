// 型定義
interface Point3D {
    x: number;
    y: number;
    z: number;
}

interface Point2D {
    x: number;
    y: number;
}

// Cubeクラスの定義
class Cube {
    public x: number;
    public y: number;
    public w: number;
    public h: number;
    public color: string;
    public vertices: Point3D[];
    public pos: Point3D[] = [];
    public readonly polygons: number[][];

    constructor(x: number, y: number, z: number, w: number, h: number, d: number, color: string) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.color = color;

        this.vertices = [
            { x: x - w, y: y - h, z: z + d },
            { x: x - w, y: y + h, z: z + d },
            { x: x + w, y: y + h, z: z + d },
            { x: x + w, y: y - h, z: z + d },
            { x: x - w, y: y - h, z: z - d },
            { x: x - w, y: y + h, z: z - d },
            { x: x + w, y: y + h, z: z - d },
            { x: x + w, y: y - h, z: z - d },
        ];

        this.polygons = [
            [2, 1, 5, 6],
            [0, 1, 2, 3],
            [4, 5, 1, 0],
            [2, 6, 7, 3],
            [7, 6, 5, 4],
            [0, 3, 7, 4]
        ];
    }

    public rotateXY(radX: number, radY: number): void {
        for (let i = 0; i < this.vertices.length; i++) {
            const c = this.vertices[i];
            const { x, y, z } = c;

            // X軸周りの回転
            const q = y * Math.cos(radX) - z * Math.sin(radX);
            const r = y * Math.sin(radX) + z * Math.cos(radX);

            // Y軸周りの回転
            const rx = x * Math.cos(radY) + r * Math.sin(radY);
            const ry = q;
            const rz = -x * Math.sin(radY) + r * Math.cos(radY);

            this.pos[i] = { x: rx, y: ry, z: rz };
        }
    }

    public isHit(x: number, y: number): boolean {
        return this.x - this.w < x && x < this.x + this.w &&
               this.y - this.h < y && y < this.y + this.h;
    }

    public translate(dx: number, dy: number): void {
        this.x += dx;
        this.y += dy;

        for (const vertex of this.vertices) {
            vertex.x += dx;
            vertex.y += dy;
        }
    }
}

// ゲーム管理クラス
class Game {
    private ctx!: CanvasRenderingContext2D;
    private timerId: number | null = null;
    private keymap: { [key: number]: boolean } = {};
    private blocks: Cube[] = [];
    private paddle!: Cube;
    private ball!: Cube;
    private speed = 5;
    private message = "";
    private theta = 260 + Math.floor(Math.random() * 20);

    constructor() {
        // DOMがロードされたら初期化
        window.addEventListener("DOMContentLoaded", () => this.init());
    }

    private deg2rad(val: number): number {
        return (Math.PI * val) / 180;
    }

    private init(): void {
        const canvas = document.getElementById("field") as HTMLCanvasElement;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;
        this.ctx = context;
        this.ctx.font = "20pt Arial";

        const colors = ['red', 'orange', 'yellow', 'green', 'purple', 'blue'];
        for (let y = 0; y < colors.length; y++) {
            for (let x = -3; x < 4; x++) {
                const b = new Cube(x * 70, y * 50 + 450, 0, 30, 10, 5, colors[y]);
                this.blocks.push(b);
            }
        }

        this.paddle = new Cube(0, 0, 0, 30, 10, 5, "white");
        this.blocks.push(this.paddle);

        this.ball = new Cube(0, 400, 0, 5, 5, 5, "yellow");
        this.blocks.push(this.ball);

        window.addEventListener("keydown", (e) => { this.keymap[e.keyCode] = true; });
        window.addEventListener("keyup", (e) => { this.keymap[e.keyCode] = false; });

        this.timerId = window.setInterval(() => this.tick(), 20);
    }

    private tick(): void {
        if (this.keymap[37]) { if (this.paddle.x > -250) this.paddle.translate(-5, 0); } // Left
        if (this.keymap[39]) { if (this.paddle.x < +250) this.paddle.translate(5, 0); }  // Right

        // カメラの傾き計算
        const radY = this.paddle.x / 1000;
        const radX = 0.5 + this.ball.y / 2000;
        this.blocks.forEach((b) => b.rotateXY(radX, radY));

        // ボールの移動
        const dx = Math.cos(this.deg2rad(this.theta)) * this.speed;
        const dy = Math.sin(this.deg2rad(this.theta)) * this.speed;
        this.ball.translate(dx, dy);

        const count = this.blocks.length;
        this.blocks = this.blocks.filter((b) => {
            return b === this.ball || b === this.paddle || !b.isHit(this.ball.x, this.ball.y);
        });

        // ブロックとの衝突判定
        if (this.blocks.length !== count) {
            this.theta = -this.theta;
        }
        
        // クリア判定 (ボールとパドルのみ残った場合)
        if (this.blocks.length === 2) {
            this.stop("CLEARED");
        }

        // 壁との衝突判定
        if (this.ball.y > 800) { // 天井 (元のコードの仕様ママ)
            this.theta = -this.theta;
            this.speed = 10;
        }
        if (this.ball.y < -1200) { // 底（ゲームオーバー）
            this.stop("GAME OVER");
        }
        if (this.ball.x < -250 || this.ball.x > 250) { // 左右の壁
            this.theta = 180 - this.theta;
        }
        if (this.paddle.isHit(this.ball.x, this.ball.y)) { // パドル
            this.theta = 90 + ((this.paddle.x - this.ball.x) / this.paddle.w) * 80;
        }

        this.paint();
    }

    private stop(str: string): void {
        this.message = str;
        if (this.timerId !== null) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
    }

    private paint(): void {
        // 背景クリア
        this.ctx.fillStyle = "black";
        this.ctx.fillRect(0, 0, 600, 600);

        // ブロックの描画
        this.blocks.forEach((b) => {
            this.ctx.strokeStyle = b.color;
            this.ctx.beginPath();
            for (let i = 0; i < b.polygons.length; i++) {
                for (let j = 0; j < 4; j++) {
                    const index = b.polygons[i][j];
                    const v = b.pos[index];
                    if (!v) continue;

                    // 3Dプロジェクション計算
                    const x = (v.x / (v.z + 500)) * 500 + 300;
                    const y = (-v.y / (v.z + 500)) * 500 + 500;

                    if (j === 0) {
                        this.ctx.moveTo(x, y);
                    } else {
                        this.ctx.lineTo(x, y);
                    }
                }
                this.ctx.closePath();
                this.ctx.stroke();
            }
        });

        // メッセージ描画
        if (this.timerId === null) {
            this.ctx.fillStyle = "yellow";
            this.ctx.fillText(this.message, 220, 250);
        }
    }
}

// ゲームのインスタンス化
new Game();