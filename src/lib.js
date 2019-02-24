// @flow

export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
export const clampGrid = (n: number, cellSize: number): number => n - (n % cellSize);

export function drawImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

export function info(label: string, expanded?: boolean): { end: typeof console.groupEnd, log: typeof console.log } {
    (expanded ? console.group : console.groupCollapsed)(
        `%c${label}`,
        'color: blue; font-weight: bold; font-size: 1.2rem;',
    );
    return {
        end: console.groupEnd.bind(console),
        log: console.log.bind(console),
    };
}
