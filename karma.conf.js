// Karma configuration
// Generated on Tue Aug 15 2023 10:32:00 GMT+0300 (Eastern European Summer Time)

module.exports = function(config) {
  config.set({
    customHeaders: [{
        match: /\.*$/,
        name: 'Cross-Origin-Embedder-Policy',
        value: 'require-corp'
      }, {
        match: /\.*$/,
        name: 'Cross-Origin-Opener-Policy',
        value: 'same-origin'
      }
    ],
    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: "",

    plugins: [
      "@babel/core",
      "karma-jasmine",
      "karma-chrome-launcher",
      "karma-jasmine-html-reporter",
      "karma-webpack",
    ],

    // frameworks to use
    // available frameworks: https://www.npmjs.com/search?q=keywords:karma-adapter
    frameworks: ["jasmine", "webpack"],

    babelPreprocessor: {
      options: require("./babel.config.json"),
    },
    // list of files / patterns to load in the browser
    files: [
      { pattern: "./projects/**/*.ts", type: "module" },
    ],

    // list of files / patterns to exclude
    exclude: [],

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://www.npmjs.com/search?q=keywords:karma-preprocessor
    preprocessors: {
      "./projects/**/*.js": ["webpack"],
      "./projects/**/*.ts": ["webpack"],
    },

    webpack: require("./webpack.config.js"),

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://www.npmjs.com/search?q=keywords:karma-reporter
    reporters: ["kjhtml"],

    client: {
      clearContext: false, // leave Jasmine Spec Runner output visible in browser
      captureConsole: false
    },
    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,

    // start these browsers
    // available browser launchers: https://www.npmjs.com/search?q=keywords:karma-launcher
    browsers: ["Chrome"],

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false,

    // Concurrency level
    // how many browser instances should be started simultaneously
    concurrency: Infinity,
  });
}
