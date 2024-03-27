// jest.config.js
module.exports = {
  coveragePathIgnorePatterns: [
    "tests/setup",
    "jest-dynalite-config.js"
  ],
  verbose: true,
  testRegex: '.*\\.test\\.ts$',
  transform: {
    "^.+\\.(t|j)s?$": ["babel-jest", {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' }} ],
        '@babel/preset-typescript'
      ]
    }]
  },
  reporters: [ "jest-progress-bar-reporter" ],
  preset: "jest-dynalite",
  setupFilesAfterEnv: ["./tests/setup/setup.ts"],
  transformIgnorePatterns: [
    `<rootdir>/node_modules`
  ],
  //https://jestjs.io/docs/configuration#workeridlememorylimit-numberstring
  //The issue:  https://github.com/facebook/jest/issues/11956
  workerIdleMemoryLimit: "2GB"
};
