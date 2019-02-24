// @flow

import { random } from 'lodash';

import { type Direction, type DirectionRelative, type SnakeInterface } from './constants';
import { type State } from './Game';

export const color = {
    bg: 'green',
    fg: 'yellow',
    dead: 'red',
};
export const interval = {
    foodDrop: 3e3,
};
export const size = {
    cellContentScale: 0.6,
    cell: 32,
};
export const menu = {
    shadeBgColor: 'rgba(0, 0, 0, 0.75)',
    bgColor: 'rgba(0, 0, 0, 0.75)',
    padding: 10,

    itemHeight: 30,
    itemPaddingV: 8,
    itemPaddingH: 25,

    itemFont: '20px sans',
    color: 'rgba(255, 255, 255, 0.7)',
    itemBgColor: 'rgba(0, 0, 0, 0.7)',
    itemBgColorActive: 'rgba(0, 100, 255, 0.85)',
    letterWidthMultiplier: 20,
};

export const debug = {
    enabled: false,
};

export interface Demo {
    +enabled: boolean;
    +interval: number;
    state?: $Shape<State>;
    turn(snake: SnakeInterface): null | Direction | DirectionRelative;
}

const arrows = [/*'←', '↓', */ '↑', '→'];
export const demo: Demo = {
    enabled: false,
    interval: 1 / 60,
    state: {
        fps: 15,
        wrap: true,
    },
    turn: () => arrows[random(0, arrows.length - 1)],
};
