module.exports = {
    presets: [
        [
            '@babel/preset-env',
            {
                modules: false,
                targets: { edge: '17', firefox: '60', chrome: '67', safari: '11.1' },
                useBuiltIns: 'usage',
            },
        ],

        '@babel/preset-flow',
    ],
    plugins: [['@babel/plugin-proposal-class-properties', { spec: true }], '@babel/plugin-proposal-object-rest-spread'],
};
