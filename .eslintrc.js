module.exports = {
    extends: ['@braiins/eslint-config', 'plugin:prettier/recommended', 'prettier/flowtype', 'prettier/react'],
    env: {
        browser: true,
        jasmine: true,
        es6: true,
    },
    // Non-overwritable globals replaced by babel build
    settings: {
        'import/resolver': {
            webpack: {
                config: 'webpack.config.browser.js',
            },
        },
    },
};
