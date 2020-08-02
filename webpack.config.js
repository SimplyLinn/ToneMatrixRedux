/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');

const isDev = process.env.NODE_ENV !== 'production';

if (isDev) process.env.NODE_ENV = 'development';

module.exports = {
  entry: './src/index.ts',
  devtool: isDev ? 'inline-source-map' : 'source-map',
  mode: isDev ? 'development' : 'production',
  output: {
    library: 'ToneMatrixLib',
    libraryTarget: 'umd',
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  resolve: {
    extensions: ['.webpack.js', '.web.js', '.ts', '.js'],
  },
  module: {
    rules: [{ test: /\.ts$/, loader: 'ts-loader' }],
  },
};
