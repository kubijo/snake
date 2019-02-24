// @flow

import { drawImage } from './lib';

// Generics
export type Seconds = number;
export type Length = number;
export type X = number;
export type Y = number;
export type Point = [X, Y];

// Generic composits
export type Box = {|
    top: number,
    right: number,
    bottom: number,
    left: number,
|};
export type ClickHandler = (x: number, y: number) => mixed;

// Directions
export const UP = '↑';
export const DOWN = '↓';
export const LEFT = '←';
export const RIGHT = '→';
export const POSITIVE = '+';
export const NEGATIVE = '-';
export type Direction = typeof UP | typeof DOWN | typeof LEFT | typeof RIGHT;
export type DirectionRelative = typeof POSITIVE | typeof NEGATIVE;

// Fruits
export const renderFruit = {
    apple: {
        render: drawImage.bind(
            null,
            'data:image/png;base64,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',
        ),
        size: 1,
        timeout: 3,
    },
    grapes: {
        render: drawImage.bind(
            null,
            'data:image/png;base64,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',
        ),
        size: 2,
        timeout: 2.5,
    },
};
export type Fruit = {|
    +image: ?HTMLImageElement,
    +size: number,
    +timeout: Seconds,
    position: ?Point,
    timestamp: ?number,
|};

// UI
export type MenuEntry = {|
    handle: () => void,
    label: string,
|};
