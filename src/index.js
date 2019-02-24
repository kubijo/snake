// @flow

import Game from './Game';

const n = document.createElement('div');
n.style.cssText = `
    position: absolute;
    top: 0; bottom: 0;
    left: 0; right: 0;
    width: 100%;
    height: 100%;
    
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    
    background: #333;
    color:white;
`;

window.document.body.style.padding = 0;
window.document.body.style.margin = 0;
window.document.body.appendChild(n);

console.log(new Game(n));
