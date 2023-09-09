import replace from '@rollup/plugin-replace'
import replaceConfig from './constants.json'

const EDITOR = process.argv.indexOf( '--config-editor' ) >= 0
const DEBUG = EDITOR || process.argv.indexOf( '--config-debug' ) >= 0

replaceConfig.preventAssignment = true
replaceConfig.DEBUG = DEBUG
replaceConfig.EDITOR = EDITOR

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
