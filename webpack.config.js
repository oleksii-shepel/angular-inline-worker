const path = require('path');

module.exports = {
  entry: { main: './projects/nygma/web-workers/src/public-api.ts' },
  optimization: {
    minimize: false,
  },
  resolve: {
    extensions: ['.js', '.ts']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        /**
         * Exclude `node_modules` except the ones that need transpiling for IE11 compatibility.
         * Run `$ npx are-you-es5 check . -r` to get a list of those modules.
         */
        exclude: '/node_modules',
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { exclude: ["proposal-async-generator-functions", "transform-async-to-generator", "transform-regenerator",  "@babel/plugin-transform-modules-commonjs"] }],
              ['@babel/preset-typescript']
            ]
          }
        }
      }
    ]
  }
};
