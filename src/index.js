// @flow

import Snake from './snake';

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

const b = document.body;
if (b) {
    b.appendChild(n);
    new Snake(n);
}
