// @flow

import { scaleBand } from 'd3-scale';
import { defaultsDeep } from 'lodash';

type X = number;
type Y = number;
type Point = [X, Y];
type Snake = Point[];
type SnakeStr = string[];

const DIR = {
    up: '↑',
    down: '↓',
    left: '←',
    right: '→',
};
type Direction = $Values<typeof DIR>;

type Config = {|
    width: number,
    height: number,
    pointSize: number,

    bg: string,
    fg: string,
    dead: string,
|};
const defaultConfig: Config = {
    width: 800,
    height: 800,
    pointSize: 36,

    bg: 'green',
    fg: 'yellow',
    dead: 'red',
};

type State = {|
    snake: Snake,
    snakeStr: SnakeStr,

    direction: Direction,
    alive: boolean,
    fps: number,
    run: boolean,
|};
const getInitialState = (): State => ({
    snake: [[0, 0], [1, 0]],
    snakeStr: [[0, 0], [1, 0]].map(String),

    direction: DIR.right,
    alive: true,
    fps: 5,
    run: true,
});

export default class SnakeCls {
    mount: HTMLElement;
    config: Config;

    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;

    // scales: { x: Function, y: Function };
    state: State = getInitialState();

    gridSize: {
        width: number,
        height: number,
    };

    constructor(mount: HTMLElement, config: Config) {
        // Store the mount-point and config
        this.mount = mount;
        this.config = defaultsDeep(config, defaultConfig);

        // Create canvas
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.config.width;
        this.canvas.height = this.config.height;
        this.mount.appendChild(this.canvas);

        // … and get it's context
        this.ctx = this.canvas.getContext('2d');

        // Scales
        // this.scales = {
        //     x: scaleBand(),
        //     y: scaleBand(),
        // };
        this.gridSize = {
            width: Math.floor(this.config.width / this.config.pointSize),
            height: Math.floor(this.config.height / this.config.pointSize),
        };

        this.start();
    }

    start = (once?: boolean): void => {
        if (once) return this.render();
        this.state.run = true;
        this.lastTick = Date.now();
        this.step();
    };
    stop = (): void => {
        this.state.run = false;
    };

    lastTick: number;
    step = (): void => {
        if (!this.state.run) return;
        window.requestAnimationFrame(this.step);

        // Framelimiter
        const now = Date.now();
        const elapsed = now - this.lastTick;
        const fpsInterval = 1e3 / this.state.fps;

        if (elapsed < fpsInterval) return;

        // Get ready for next frame by setting then=now, but also adjust for your
        // specified fpsInterval not being a multiple of RAF's interval (16.7ms)
        this.lastTick = now - (elapsed % fpsInterval);

        // Render
        const { snake, snakeStr, isDead } = this.moveSnake();
        if (isDead) {
            this.state.alive = false;
            this.state.run = false;
            this.render();
            return;
        } else {
            this.state.snake = snake;
            this.state.snakeStr = snakeStr;
        }
        this.render();
    };
    moveSnake(): { snake: Snake, snakeStr: SnakeStr, isDead: boolean } {
        const { snake, snakeStr, direction } = this.state;
        const [x, y] = snake[snake.length - 1];

        const nx = direction === DIR.left ? x - 1 : direction === DIR.right ? x + 1 : 0;
        const ny = direction === DIR.up ? y - 1 : direction === DIR.down ? y + 1 : 0;

        const newHead: Point = [nx, ny];
        const newHeadStr = String(newHead);

        // Self collition
        const isDead =
            snakeStr.includes(newHeadStr) ||
            // Wall collition
            nx < 0 ||
            nx > this.gridSize.width ||
            ny < 0 ||
            ny > this.gridSize.height;
        const sn = [...snake.slice(1), newHead];
        const ss = [...snakeStr.slice(1), newHeadStr];

        return {
            snake: sn,
            snakeStr: ss,
            isDead,
        };
    }

    renderGrid(): void {
        const { ctx, config, gridSize } = this;
        const { width, height, pointSize } = config;

        ctx.strokeStyle = 'white';
        ctx.lineWidth = 0.2;

        ctx.beginPath();
        for (let ox = 1; ox < gridSize.width; ox++) {
            const x = ox * pointSize;
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
        }
        for (let oy = 1; oy < gridSize.height; oy++) {
            const y = oy * pointSize;
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
        }
        ctx.stroke();
    }
    renderSnake(): void {
        const {
            ctx,
            state: { snake, alive },
            config: { fg, dead, pointSize },
        } = this;

        ctx.fillStyle = alive ? fg : dead;

        const half = pointSize / 2;
        const r = half * 0.75;

        const len = snake.length;
        snake.forEach(([x, y], i) => {
            ctx.beginPath();

            const cx = x * pointSize + half;
            const cy = y * pointSize + half;

            // Pacman shape for the head (last segment)
            if (i === len - 1) {
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0.15 * Math.PI, 1.15 * Math.PI, false);
                ctx.fill();

                ctx.beginPath();
                ctx.arc(cx, cy, r, 0.85 * Math.PI, 1.85 * Math.PI, false);
                ctx.fill();

                return;
            }
            // circle for the rest
            ctx.arc(cx, cy, r, 0, 2 * Math.PI);
            ctx.fill();
        });
    }
    render(): void {
        const { ctx, config, gridSize } = this;
        const { width, height, bg, fg, pointSize } = config;

        /**
         * Clear the canvas
         * For this to work, we need to reset the trasform matrix.
         *
         * If we didn't do the reset, the clear wouldn't
         * clear everything and translate would be aditive.
         */
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, config.width, config.height);

        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        this.renderGrid();
        this.renderSnake();

        ctx.fillStyle = 'black';
        ctx.fillRect(gridSize.width * pointSize, 0, width, height);
        ctx.fillRect(0, gridSize.height * pointSize, width, height);
    }
}
