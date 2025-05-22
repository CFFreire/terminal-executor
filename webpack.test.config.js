//@ts-check

'use strict';

const path = require('path');

/**@type {import('webpack').Configuration}*/
const config = {
    target: 'node',

    entry: {
        'test/runTest': './src/test/runTest.ts',
        'test/suite/index': './src/test/suite/index.ts',
        'test/suite/extension.test': './src/test/suite/extension.test.ts'
    },
    output: {
        path: path.resolve(__dirname, 'out'),
        filename: '[name].js',
        libraryTarget: "commonjs2",
        devtoolModuleFilenameTemplate: "../[resource-path]"
    },
    devtool: 'source-map',
    externals: {
        vscode: "commonjs vscode",
        mocha: "commonjs mocha"
    },
    resolve: {
        extensions: ['.ts', '.js']
    },
    module: {
        rules: [{
            test: /\.ts$/,
            exclude: /node_modules/,
            use: [{
                loader: 'ts-loader'
            }]
        }]
    }
};

module.exports = config;