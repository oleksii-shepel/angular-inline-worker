const path = require('path');

module.exports = {
  optimization: {
    minimize: false,
  },
  resolve: {
    extensions: ['.js', '.ts']
  },
  module: {
    rules: [
      {
        test: /\.[jt]s$/,
        /**
         * Exclude `node_modules` except the ones that need transpiling for IE11 compatibility.
         * Run `$ npx are-you-es5 check . -r` to get a list of those modules.
         */
        exclude: '/node_modules',
        use: {
          loader: 'babel-loader',
          options: require('./babel.config.json')
        }
      }
    ]
  }
};
