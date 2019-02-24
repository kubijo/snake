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
    type Length,
    type Point,
    type Direction,
    type DirectionRelative,
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

function getInitialPath(offset?: Point, gridSize: Length[]): Point[] {
    // Make sure that numbers are in sensible range and floored
    const off = (offset || [0, 0]).map((n, i) => Math.floor(clamp(n, 0, gridSize[i] * 0.7)));

    // Shift the default value
    return [[0, 0], [1, 0], [2, 0], [3, 0]].map(p => [p[0] + off[0], p[1] + off[1]]);
}
function move(head: Point, direction: Direction): Point {
    const [x, y] = head;
    const newHead: Point = [x, y];

    if (direction === UP) newHead[1] -= 1;
    if (direction === DOWN) newHead[1] += 1;
    if (direction === LEFT) newHead[0] -= 1;
    if (direction === RIGHT) newHead[0] += 1;

    return newHead;
}

export default class Snake {
    gridSize: [X, Y];
    constructor(cellCountX: Length, cellCountY: Length, offset?: Point) {
        this.resize(cellCountX, cellCountY, offset);
    }
    resize(cellCountX: Length, cellCountY: Length, offset?: Point): void {
        this.gridSize = [cellCountX, cellCountY];
        this.path = getInitialPath(offset, this.gridSize);
        this.checkCollition(this.path, this.head);
    }

    isDead: boolean = false;
    direction: Direction = RIGHT;
    path: Point[];

    // Do not trim the path tail until this is 0
    eatBuffer: number = 0;

    turn(dir: Direction | DirectionRelative): mixed {
        const d = dir === NEGATIVE || dir === POSITIVE ? relative2absolute[this.direction][dir] : dir;
        const [neck, head] = this.path.slice(-2);

        // Abort when trying to dow 180° in place
        if (String(move(head, d)) === String(neck)) return console.info('Stopped an attempt at 180° turn');

        this.direction = d;
    }
    step(): void {
        const { path } = this;
        const newHead: Point = move(this.head, this.direction);

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
        const walls = x < 0 || x >= width || y < 0 || y >= height;

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
