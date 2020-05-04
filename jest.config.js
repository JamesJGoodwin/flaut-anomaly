module.exports = {
  preset: 'ts-jest',
  rootDir: './',
  testRegex: '__tests__/.*\\.(ts)$',
  moduleDirectories: ['node_modules', 'src'],
  globals: {
      'ts-jest': {
          isolatedModules: true
      }
  },
  collectCoverage: false
}