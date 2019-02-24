// @flow

import { defaultsDeep, random } from 'lodash';
import * as config from './config';
import {
    UP,
    DOWN,
    LEFT,
    RIGHT,
    POSITIVE,
    NEGATIVE,
    renderFruit,
    type Box,
    type ClickHandler,
    type Fruit,
    type GridSize,
    type Dimensions,
    type MenuEntry,
    type Direction,
    type DirectionRelative,
    type SnakeInterface,
} from './constants';

import { /* clamp, clampGrid, */ info } from './lib';
import Snake from './Snake';

export type State = {|
    fps: number,
    wrap: boolean,

    outerSize: Dimensions,
    innerSize: Dimensions,
    gridSize: GridSize,

    fruits: $ObjMap<typeof renderFruit, () => Fruit>,

    inMenu: boolean,
    didMove: boolean,

    menuItems: MenuEntry[],
    activeMenuItem: number,
|};
const getInitialState = (): State => ({
    fps: 10,
    wrap: true,

    outerSize: [100, 100],
    innerSize: [100, 100],
    gridSize: [100 / config.size.cell, 100 / config.size.cell],

    fruits: {},

    inMenu: true,
    didMove: false,

    menuItems: [],
    activeMenuItem: 0,
});

export default class Game {
    mount: HTMLElement;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;

    snake: SnakeInterface;
    state: State;

    constructor(mount: HTMLElement) {
        this.init(mount);

        // Attach event handlers
        document.addEventListener('keydown', this.handleKeypress, false);
        document.addEventListener('resize', this.handleResize, false);
        document.addEventListener('click', this.handleClick, false);
        document.addEventListener('contextmenu', this.handleContextMenu, false);
        document.addEventListener('wheel', this.handleWheel, false);
    }
    init = (mount: HTMLElement): void => {
        // Store the mount-point and config
        this.mount = mount;
        mount.innerHTML = '';

        // Render fruit images into memory
        Object.keys(renderFruit).forEach(k => {
            const { render, ...rest } = renderFruit[k];
            render().then(img => {
                this.state.fruits[k] = { ...rest, image: img, position: null, timestamp: null };
            });
        });

        this.state = getInitialState();
        this.snake = new Snake([0, 0], null, this.state.wrap);

        // Create canvas and get it's context
        this.canvas = document.createElement('canvas');
        this.mount.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        this.handleResize();
        this.togglePause(true);
    };

    handleResize = (): void => {
        // Measure available space
        const outerWidth = window.innerWidth;
        const outerHeight = window.innerHeight;

        const innerWidth = outerWidth - (outerWidth % config.size.cell);
        const innerHeight = outerHeight - (outerHeight % config.size.cell);

        const gridSizeX = innerWidth / config.size.cell;
        const gridSizeY = innerHeight / config.size.cell;

        this.state.outerSize = [outerWidth, outerHeight];
        this.state.innerSize = [innerWidth, innerHeight];
        this.state.gridSize = [gridSizeX, gridSizeY];

        this.canvas.width = innerWidth;
        this.canvas.height = innerHeight;
        this.snake.init(this.state.gridSize, [gridSizeX / 3, gridSizeY / 3], this.state.wrap);
        this.render();
    };
    handleKeypress = (e: KeyboardEvent): void => {
        const con = info('handleKeypress');

        const { inMenu } = this.state;
        const key = e.key.toLowerCase();
        con.log('keypress: ', key);

        if (key === 'escape') {
            this.togglePause();
        } else if (inMenu) {
            this.$handleMenuKeypress(key);
        } else {
            // Snake handling
            let dir: ?Direction;
            switch (key) {
                case 'arrowup':
                case 'w':
                    dir = UP;
                    break;

                case 'arrowdown':
                case 's':
                    dir = DOWN;
                    break;

                case 'arrowright':
                case 'd':
                    dir = RIGHT;
                    break;

                case 'arrowleft':
                case 'a':
                    dir = LEFT;
                    break;
            }
            if (dir) this.$$snakeTurnImpl(dir);
        }

        con.end();
    };
    $$snakeTurnImpl(direction: Direction | DirectionRelative): void {
        this.state.didMove = true;
        const { debug } = config;
        this.snake.turn(direction);
        if (debug.enabled && !debug.isDemo) this.renderTickImpl();
    }

    pointHandlers: Map<ClickHandler, Box> = new Map();
    handleClick = (e: MouseEvent) => {
        if (e.target !== this.canvas) return;
        const con = info('handleClick');

        const el = this.canvas;
        const x = e.pageX - el.offsetLeft;
        const y = e.pageY - el.offsetTop;

        if (!this.state.inMenu) {
            // FIXME: Tottaly broken and fucked-up…
            // const cell = config.size.cell;
            // const [snakeGridX, snakeGridY] = this.snake.head;
            // const [gridX, gridY] = [x, y].map(n => clampGrid(n, cell) / cell);
            //
            // const dx = gridX - snakeGridX;
            // const dy = gridY - snakeGridY;
            // console.warn({dx,dy});
            //
            // // const xIsBiggerDelta = Math.abs(x - snakeGridX * cell) >= Math.abs(y - snakeGridY * cell);
            //
            // if (Math.abs(dx) > cell) this.$$snakeTurnImpl(dx < 0 ? LEFT : RIGHT);
            // if (Math.abs(dy) > cell) this.$$snakeTurnImpl(dy < 0 ? UP : DOWN);
        } else if (this.pointHandlers.size) {
            this.pointHandlers.forEach((box: Box, handler: ClickHandler) => {
                if (x >= box.left && x <= box.right && y >= box.top && y <= box.bottom) {
                    con.log('calling the click handler for position:', x, y);
                    handler(x, y);
                }
            });
        }

        con.end();
    };
    handleContextMenu = (e: MouseEvent): void => {
        e.stopPropagation();
        e.preventDefault();
        this.togglePause();
    };
    handleWheel = (e: WheelEvent): void => {
        e.stopPropagation();
        e.preventDefault();

        const dx = e.deltaX;
        const dy = e.deltaY;

        // Pick the value with the biggets delta
        const v = Math.abs(dx) > Math.abs(dy) ? dx : dy;

        // And choose direction base on its sign
        this.$$snakeTurnImpl(v < 0 ? NEGATIVE : POSITIVE);
    };

    $handleMenuKeypress = (key: string) => {
        switch (key) {
            case 'arrowup':
            case 'w':
                this.$$handleMenuMove('up');
                break;

            case 'arrowdown':
            case 's':
                this.$$handleMenuMove('down');
                break;

            case 'enter':
                this.$$handleMenuSelect();
                break;
        }
    };
    $$handleMenuMove = (direction: 'up' | 'down'): void => {
        const { menuItems, activeMenuItem } = this.state;

        const delta = direction === 'up' ? -1 : +1;
        const len = menuItems.length;
        const val = (activeMenuItem + delta) % len;

        this.state.activeMenuItem = val === -1 ? len - 1 : val;
        this.render();
    };
    $$handleMenuSelect = (): void => {
        const { activeMenuItem, menuItems } = this.state;
        menuItems[activeMenuItem].handle();
    };

    handleFruitDrop = (): void => {
        const { snake } = this;
        const {
            gridSize: [width, height],
            fruits,
        } = this.state;

        const col = random(0, width - 1, false);
        const row = random(0, height - 1, false);

        // Don't drop on the snake
        if (snake.liesOnPoint([col, row])) return;

        // Choose which fruit it will be, remove timed-out & exclude already rendered
        const fruitKeys = Object.keys(fruits).filter(k => {
            const now = performance.now();
            const v: Fruit = fruits[k];

            // Hide timed-out fruits
            if (!config.debug.enabled && v.timestamp && now > v.timestamp + v.timeout * 1e3) {
                v.position = null;
                v.timestamp = null;
                return true;
            }

            // exclude already rendered
            const isRendered = !!v.position;
            return !isRendered;
        });
        const whichFruit = !fruitKeys.length ? null : fruitKeys[random(0, fruitKeys.length - 1, false)];

        // …and set it as rendered now
        if (whichFruit) {
            fruits[whichFruit].position = [col, row];
            fruits[whichFruit].timestamp = performance.now();
        }
    };
    handleFruitCollitionDetection = (): void => {
        const { fruits } = this.state;
        const head = String(this.snake.head);
        for (let k in fruits) {
            const fruit: Fruit = fruits[k];
            if (String(fruit.position) === head) {
                fruits[k].position = null;
                fruits[k].timestamp = null;
                this.snake.eat(fruit.size);
                break;
            }
        }
    };

    fruitDroppingIntervalID = null;
    start = (): void => {
        const con = info('start');
        const { debug, demo, interval } = config;
        this.fruitDroppingIntervalID = setInterval(this.handleFruitDrop, interval.foodDrop);

        if (debug.enabled) {
            this.render();
        } else {
            if (demo.enabled) this.demo();
            this.renderTick4Timer();
        }

        con.end();
    };
    stop = (): void => {
        const con = info('stop');
        clearInterval(this.fruitDroppingIntervalID);
        con.end();
    };
    restart = (): void => {
        const con = info('restart');

        this.init(this.mount);
        this.togglePause(false);

        con.end();
    };
    togglePause = (pause?: boolean): void => {
        const isDead = this.snake.isDead;
        const { didMove } = this.state;

        this.state.inMenu = typeof pause === 'boolean' ? pause : !this.state.inMenu;

        if (this.state.inMenu) {
            this.stop();
            this.state.menuItems = [
                !isDead ? { label: didMove ? 'Resume' : 'Play', handle: this.togglePause } : null,
                didMove || isDead ? { label: 'Restart', handle: this.restart } : null,
            ].filter(Boolean);
        } else {
            this.start();
        }
        this.render();
    };

    demoTickIntervalID: any;
    demo = (): void => {
        const { snake } = this;
        const { demo } = config;

        if (
            demo.state &&
            Object.prototype.toString.call(demo.state) === '[object Object]' &&
            Object.keys(demo.state).length
        )
            Object.assign(this.state, demo.state);

        const tick = () => {
            const dir = demo.turn(snake);
            if (dir) snake.turn(dir);
        };
        clearTimeout(this.demoTickIntervalID);
        this.demoTickIntervalID = setInterval(tick, demo.interval);
    };

    i: number = 0;
    lastTick: number;
    renderTick4Timer = (): void => {
        const { inMenu } = this.state;
        if (inMenu) return;
        window.requestAnimationFrame(this.renderTick4Timer);

        // Framelimiter
        if (!this.lastTick) this.lastTick = performance.now();
        const now = performance.now();
        const elapsed = now - this.lastTick;
        const fpsInterval = 1e3 / this.state.fps;

        if (elapsed < fpsInterval) return;

        // Get ready for next frame by setting then=now, but also adjust for your
        // specified fpsInterval not being a multiple of RAF's interval (16.7ms)
        this.lastTick = now - (elapsed % fpsInterval);

        // Render
        this.renderTickImpl();
    };
    renderTickImpl = (): void => {
        const { snake } = this;

        snake.step();
        if (snake.isDead) {
            this.render();
            this.togglePause();
            return;
        }

        this.handleFruitCollitionDetection();
        this.render();
    };

    $renderHead(x: number, y: number, cx: number, cy: number): void {
        const { ctx, snake } = this;
        const half = config.size.cell / 2;
        const r = half * config.size.cellContentScale;

        const angleMod: number = {
            [UP]: 1.5,
            [DOWN]: 0.5,
            [LEFT]: 1,
            [RIGHT]: 0,
        }[snake.direction];

        ctx.beginPath();
        ctx.arc(cx, cy, r, (0.15 + angleMod) * Math.PI, (1.15 + angleMod) * Math.PI, false);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx, cy, r, (0.85 + angleMod) * Math.PI, (1.85 + angleMod) * Math.PI, false);
        ctx.fill();

        ctx.fillStyle = 'blue';
        const eyeOffset = [config.size.cell * 0.05, config.size.cell * 0.2];
        const eyePosition = {
            [LEFT]: [cx + eyeOffset[0], cy - eyeOffset[1]],
            [RIGHT]: [cx + eyeOffset[0], cy - eyeOffset[1]],
            [UP]: [cx - eyeOffset[1], cy + eyeOffset[0]],
            [DOWN]: [cx + eyeOffset[1], cy - eyeOffset[0]],
        }[snake.direction] || [0, 0];
        ctx.beginPath();
        ctx.arc(...eyePosition, config.size.cell * 0.06, 0, 2 * Math.PI, false);
        ctx.fill();
    }
    $renderTail(x: number, y: number, cx: number, cy: number) {
        const { ctx, snake } = this;
        const tSize = config.size.cell * config.size.cellContentScale;
        const tOffs = config.size.cell - tSize;

        /**
         *         up
         *      ╭──┷──╮
         * left ┨     ┠ right
         *      ╰──┯──╯
         *        down
         */
        const middle = {
            up: [cx, y + tOffs],
            down: [cx, y + tSize],
            left: [x + tOffs, cy],
            right: [x + tSize, cy],
        };
        /**
         * A      B
         *  ┏────┓
         *  │    │
         *  ┗────┛
         * C      D
         */
        const corner = {
            a: [x + tOffs, y + tOffs],
            b: [x + tSize, y + tOffs],
            c: [x + tSize, y + tSize],
            d: [x + tOffs, y + tSize],
        };

        ctx.beginPath();
        switch (snake.tailDirection) {
            // ◀
            case LEFT: {
                ctx.moveTo(...middle.left);
                ctx.lineTo(corner.b[0] + tOffs, corner.b[1]);
                ctx.lineTo(corner.c[0] + tOffs, corner.c[1]);
                break;
            }
            // ▶
            case RIGHT: {
                ctx.moveTo(...middle.right);
                ctx.lineTo(corner.a[0] - tOffs, corner.a[1]);
                ctx.lineTo(corner.d[0] - tOffs, corner.d[1]);
                break;
            }
            // ▲
            case UP: {
                ctx.moveTo(...middle.up);
                ctx.lineTo(corner.c[0], corner.c[1] + tOffs);
                ctx.lineTo(corner.d[0], corner.d[1] + tOffs);
                break;
            }
            // ▼
            case DOWN: {
                ctx.moveTo(...middle.down);
                ctx.lineTo(corner.a[0], corner.a[1] - tOffs);
                ctx.lineTo(corner.b[0], corner.b[1] - tOffs);
                break;
            }
        }

        ctx.closePath();
        ctx.fill();
    }
    $renderBody(x: number, y: number, cx: number, cy: number, bodyIndex: number) {
        const { ctx } = this;
        // Progresively scale-down tail part
        // (snake coordinates are is tail-first!)
        let tailScalingFactor = 1;
        const triggerPoint = 2;
        if (bodyIndex <= triggerPoint) tailScalingFactor -= (triggerPoint - bodyIndex) * 0.1;

        const d = config.size.cell * config.size.cellContentScale * tailScalingFactor;
        ctx.arc(cx, cy, d * 0.5, 0, 2 * Math.PI);
        ctx.fill();
    }
    renderSnake(): void {
        const { ctx, snake } = this;
        const { size, color } = config;

        ctx.fillStyle = !snake.isDead ? color.fg : color.dead;
        const half = size.cell / 2;

        const len = snake.length;
        snake.forEach(([x, y], i) => {
            ctx.beginPath();

            const lx = x * size.cell;
            const cx = lx + half;
            const ly = y * size.cell;
            const cy = ly + half;

            switch (i) {
                case len - 1:
                    return this.$renderHead(lx, ly, cx, cy);
                case 0:
                    return this.$renderTail(lx, ly, cx, cy);
                default:
                    return this.$renderBody(lx, ly, cx, cy, i - 1);
            }
        });
    }

    renderOverlay(): void {
        const { ctx } = this;
        const { menu } = config;
        const {
            innerSize: [width, height],
            activeMenuItem,
            menuItems,
            inMenu,
        } = this.state;

        if (!inMenu) return;

        ctx.fillStyle = menu.shadeBgColor;
        ctx.fillRect(0, 0, width, height);

        // Font setup: this needs to be setup this early so that we can get relevant text metrics
        ctx.font = menu.itemFont;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const labelsMetrics = menuItems.map(x => ctx.measureText(x.label).width);
        const longestLabelWidth = Math.max.apply(null, labelsMetrics) + 2 * menu.itemPaddingH;
        const menuWidth = longestLabelWidth + 2 * menu.padding;
        const menuHeight = menuItems.length * (menu.itemHeight + 2 * menu.itemPaddingV) + 2 * menu.padding;

        const menuLeft = width / 2 - menuWidth / 2;
        const menuTop = height / 2 - menuHeight / 2;

        ctx.fillStyle = menu.bgColor;
        ctx.fillRect(menuLeft, menuTop, menuWidth, menuHeight);

        // Reset click handlers
        this.pointHandlers = new Map();

        menuItems.forEach((menuItem, index) => {
            const isActive = index === activeMenuItem;

            const w = menuWidth - 2 * menu.padding;
            const h = menu.itemHeight + 2 * menu.itemPaddingV;

            const x = menuLeft + menu.padding;
            const y = menuTop + menu.padding + index * h;

            // Add click handler
            this.pointHandlers.set(menuItem.handle, { top: y, bottom: y + h, left: x, right: x + w });

            // Render items background
            ctx.fillStyle = isActive ? menu.itemBgColorActive : menu.itemBgColor;
            ctx.fillRect(x, y, w, h);

            ctx.fillStyle = menu.color;
            ctx.fillText(menuItem.label.toUpperCase(), x + longestLabelWidth / 2, y + h / 2);
        });
    }
    renderFood(): void {
        const { size } = config;
        const { ctx } = this;
        const { fruits } = this.state;

        Object.keys(fruits).forEach(k => {
            const v = fruits[k];
            if (!v.position) return;

            const w = size.cell * 0.75;
            const offset = (size.cell - w) / 2;
            const x = v.position[0] * size.cell + offset;
            const y = v.position[1] * size.cell + offset;

            // $FlowIgnore
            ctx.drawImage(v.image, x, y, w, w);
        });
    }
    renderGrid(): void {
        const { size, debug } = config;
        const { ctx } = this;
        const {
            innerSize: [width, height],
            gridSize,
        } = this.state;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 0.2;
        ctx.font = '16px serif';

        ctx.beginPath();
        for (let ox = 1; ox <= gridSize[0]; ox++) {
            const x = ox * size.cell;
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            if (debug.enabled) {
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillText(String(ox - 1), x - size.cell / 2, 0);
            }
        }
        for (let oy = 1; oy <= gridSize[1]; oy++) {
            const y = oy * size.cell;
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            if (debug.enabled) {
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(String(oy - 1), 0, y - size.cell / 2);
            }
        }
        ctx.stroke();
    }
    render(): void {
        const { ctx } = this;
        const { color, size } = config;
        const {
            innerSize: [width, height],
        } = this.state;

        // const realWidth =
        // const realHeight =

        /**
         * Clear the canvas
         * For this to work, we need to reset the trasform matrix.
         *
         * If we didn't do the reset, the clear wouldn't
         * clear everything and translate would be aditive.
         */
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, size[0] * size.cell, size[1] * size.cell);

        ctx.fillStyle = color.bg;
        ctx.fillRect(0, 0, width, height);

        this.renderFood();
        this.renderSnake();
        this.renderGrid();
        this.renderOverlay();
    }
}
