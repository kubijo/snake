// @flow

import {
    UP,
    DOWN,
    LEFT,
    RIGHT,
    POSITIVE,
    NEGATIVE,
    type X,
    type Y,
    type Point,
    type GridSize,
    type Direction,
    type DirectionRelative,
    type SnakeInterface,
} from './constants';
import { clamp } from './lib';

// Translate relative direction to absolute
const relative2absolute: { [current: Direction]: { [DirectionRelative]: Direction } } = {
    [RIGHT]: {
        [NEGATIVE]: UP,
        [POSITIVE]: DOWN,
    },
    [DOWN]: {
        [NEGATIVE]: RIGHT,
        [POSITIVE]: LEFT,
    },
    [LEFT]: {
        [NEGATIVE]: DOWN,
        [POSITIVE]: UP,
    },
    [UP]: {
        [NEGATIVE]: LEFT,
        [POSITIVE]: RIGHT,
    },
};

function getInitialPath(offset?: ?Point, gridSize: GridSize): Point[] {
    // Make sure that numbers are in sensible range and floored
    const off = (offset || [0, 0]).map((n, i) => Math.floor(clamp(n, 0, gridSize[i] * 0.7)));

    // Shift the default value
    return [[0, 0], [1, 0], [2, 0], [3, 0]].map(p => [p[0] + off[0], p[1] + off[1]]);
}

export default class Snake implements SnakeInterface {
    gridSize: [X, Y];
    wrap: boolean = false;

    constructor(gridSize: GridSize, offset?: ?Point = this.gridSize, wrap?: boolean = this.wrap) {
        this.init(gridSize, offset, wrap);
    }
    init(gridSize: GridSize, offset?: ?Point = this.gridSize, wrap?: boolean = this.wrap): void {
        this.wrap = !!wrap;
        this.gridSize = gridSize;
        this.path = getInitialPath(offset, this.gridSize);
        this.checkCollition(this.path, this.head);
    }

    isDead: boolean = false;
    direction: Direction = RIGHT;
    path: Point[];

    // Do not trim the path tail until this is 0
    eatBuffer: number = 0;

    $wrapHead = (n: number, i: number): number => {
        const ref = this.gridSize[i];
        if (n > ref) return 0;
        if (n < 0) return ref;
        return n;
    };
    $moveHead(head: Point, direction: Direction): Point {
        const [x, y] = head;
        let newHead: Point = [x, y];

        if (direction === UP) newHead[1] -= 1;
        if (direction === DOWN) newHead[1] += 1;
        if (direction === LEFT) newHead[0] -= 1;
        if (direction === RIGHT) newHead[0] += 1;

        // $FlowIgnore
        if (this.wrap) newHead = newHead.map(this.$wrapHead);

        return newHead;
    }

    turn(dir: Direction | DirectionRelative): void {
        const d = dir === NEGATIVE || dir === POSITIVE ? relative2absolute[this.direction][dir] : dir;
        const [neck, head] = this.path.slice(-2);

        // Abort when trying to dow 180° in place
        if (String(this.$moveHead(head, d)) === String(neck)) return console.info('Stopped an attempt at 180° turn');

        this.direction = d;
    }
    step(): void {
        const { path } = this;
        const newHead: Point = this.$moveHead(this.head, this.direction);

        let lead;
        if (this.eatBuffer > 0) {
            lead = path.slice(0);
            this.eatBuffer -= 1;
        } else {
            lead = path.slice(1);
        }

        if (!this.checkCollition(this.path, newHead)) this.path = [...lead, newHead];
    }

    eat(size?: number = 1): void {
        this.eatBuffer += clamp(size, 0, Infinity);
    }
    checkCollition(path: Point[], head: Point): boolean {
        const [width, height] = this.gridSize;
        const [x, y] = head;

        const self = path.length > 4 && this.liesOnPoint([x, y]);
        const walls = this.wrap ? false : x < 0 || x >= width || y < 0 || y >= height;

        this.isDead = self || walls;
        return this.isDead;
    }

    liesOnPoint(point: Point): boolean {
        return JSON.stringify(this.path).includes(JSON.stringify(point));
    }

    get head(): Point {
        return [...this.path[this.path.length - 1]];
    }
    set head([x, y]: Point): void {
        const {
            gridSize: [width, height],
        } = this;
        this.path[this.path.length - 1] = [clamp(x, 0, width), clamp(y, 0, height)];
        this.checkCollition(this.path, this.head);
    }

    get tail(): Point {
        return [...this.path[0]];
    }
    get tailDirection(): ?Direction {
        // Exit early if we have only 1 segment
        if (this.length === 1) return this.direction;

        const tail = this.tail;
        const pre = this.path[1];

        if (tail[0] < pre[0]) return LEFT;
        if (tail[0] > pre[0]) return RIGHT;
        if (tail[1] < pre[1]) return UP;
        if (tail[1] > pre[1]) return DOWN;
    }

    get length(): number {
        return this.path.length;
    }
    forEach(fn: (point: Point, index: number, path: Point[]) => void): void {
        this.path.forEach(fn);
    }
}
