import replace from '@rollup/plugin-replace';
import replaceConfig from './src/constants.json';
const constantsJson = require('./src/constants.json')

const DEBUG = process.argv.indexOf( '--config-debug' ) >= 0;

replaceConfig.preventAssignment = true;
replaceConfig.DEBUG = DEBUG;

for (let k in constantsJson) {
  replaceConfig[k] = constantsJson[k]
}

const plugins = [
  replace(replaceConfig)
];

export default {
  input: 'build/index.js',
  output: {
    file: 'build/bundle.js',
    strict: false,
  },
  plugins
};
