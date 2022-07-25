import replace from '@rollup/plugin-replace'
import replaceConfig from './constants.json'

const DEBUG = process.argv.indexOf( '--config-debug' ) >= 0

replaceConfig.preventAssignment = true
replaceConfig.DEBUG = DEBUG

const plugins = [
    replace(replaceConfig)
]

export default {
    input: 'build/index.js',
    output: {
        file: 'build/bundle.js',
        strict: false,
    },
    plugins
}
