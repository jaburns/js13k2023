#!/usr/bin/env node
const sh = require('shelljs')
const fs = require('fs')
const path = require('path');
const ShapeShifter = require('regpack/shapeShifter')
const advzipPath = require('advzip-bin')
const constantsJson = require('./constants.json')

const EDITOR = process.argv.indexOf('--editor') >= 0
const DEBUG = EDITOR || process.argv.indexOf('--debug') >= 0
const NO_ROADROLLER = process.argv.indexOf('--no-roadroller') >= 0
const MONO_RUN = process.platform === 'win32' ? '' : 'mono ';

//const ROADROLLER_PARAMS = '-Zab0 -Zdy0 -Zlr930 -Zmc4 -Zmd12 -Zpr15 -S0,1,2,3,5,6,13,25,58,83,225,426'
const ROADROLLER_PARAMS = '-O2'

const CLOSURE_COMPILER_EXTERNS = `
/**
 * @type {!HTMLCanvasElement}
 */
var CC;
/**
 * @type {!WebGLRenderingContext}
 */
var G;
`

const run = cmd => {
    const code = sh.exec(cmd).code
    if (code !== 0)
        process.exit(code)
}

const shaderExternalNames = {}

const buildShaderExternalNamesTable = () => {
    const idents = []

    sh.ls('shaders').forEach(x => {
        let code = fs.readFileSync(path.resolve('shaders', x), 'utf8')
        idents.push(...(code.match(/[uav]_[a-zA-Z0-9_]+/g)||[]))
    })

    let identCounter = 0
    const uniqueIdents = idents.filter((v,i,s)=>s.indexOf(v)===i)
    for (const id of uniqueIdents) {
        shaderExternalNames[id] = 'a'+(identCounter.toString(36))
        identCounter++
    }
}

const generateShaderFile = () => {
    sh.mkdir('-p', 'shadersTmp')
    sh.ls('shaders').forEach(x => {
        let code = fs.readFileSync(path.resolve('shaders', x), 'utf8')

        for (const k in constantsJson)
            code = code.replace(new RegExp( k, 'g' ), constantsJson[k])

        for (const k in shaderExternalNames)
            code = code.replace(new RegExp( k, 'g' ), shaderExternalNames[k])

        fs.writeFileSync(path.resolve('shadersTmp', x), code)
    })

    let noRenames = ['main']

    if (DEBUG) {
        run(MONO_RUN + 'tools/shader_minifier.exe' +
            ' --no-renaming' +
            ' --aggressive-inlining --format js -o build/shaders.js --preserve-externals shadersTmp/*')
    } else {
        run(MONO_RUN + 'tools/shader_minifier.exe' +
            ' --no-renaming-list ' + noRenames.join(',') +
            ' --aggressive-inlining --format js -o build/shaders.js --preserve-externals shadersTmp/*')
    }

    let shaderCode = fs.readFileSync('build/shaders.js', 'utf8').replace(/\r/g, '')

    let shaderLines = shaderCode
        .split('\n')
        .map(x => x.replace(/^var/, 'export let'))

    shaderCode = shaderLines.join('\n')

    if (DEBUG) {
        shaderCode = shaderCode.replace(/;/g, ';\\n`+\n`');
        shaderCode = shaderCode.replace(/{/g, '{\\n`+\n`');
        shaderCode = shaderCode.replace(/}/g, '}\\n`+\n`');
    }

    fs.writeFileSync('src/shaders.gen.ts', shaderCode)

    sh.rm('-rf', 'shadersTmp')
};

const hashIdentifiers = js => {
    const varsNotReassigned = ['CC','G']

    js = new ShapeShifter().preprocess(js, {
        hashWebGLContext: true,
        contextVariableName: 'G',
        contextType: 1,
        reassignVars: true,
        varsNotReassigned,
        useES6: true,
    })[2].contents

    js = js.replace('for(', 'for(let ')

    return js
}

const main = () => {
    sh.cd(__dirname)
    sh.mkdir('-p', 'build')

    buildShaderExternalNamesTable()

    console.log('Minifying shaders...');
    generateShaderFile();

    console.log('Compiling typescript...')
    run('tsc --outDir build')

    console.log('Rolling up bundle...')
    run('rollup -c' + (EDITOR ? ' --config-editor' : DEBUG ? ' --config-debug' : ''))

    let x = fs.readFileSync('build/bundle.js', 'utf8');

    for (const k in shaderExternalNames)
        x = x.replace(new RegExp( k, 'g' ), shaderExternalNames[k])

    if (!DEBUG) {
        sh.cd('build')
        fs.writeFileSync('bundle1.js', x)
        console.log('Applying closure compiler...')
        fs.writeFileSync('externs.js', CLOSURE_COMPILER_EXTERNS)
        run('google-closure-compiler -O ADVANCED bundle1.js --js_output_file bundle2.js --externs externs.js')

        fs.writeFileSync('bundle2.js', fs.readFileSync('bundle2.js', 'utf8').replace(/var /g, 'let '))

        console.log('Applying terser...')
        run('terser --ecma 2020 --mangle reserved=[CC,G] --mangle_props keep_quoted --compress passes=10,keep_fargs=false,pure_getters=true,unsafe=true,unsafe_arrows=true,unsafe_comps=true,unsafe_math=true,unsafe_methods=true,unsafe_symbols=true --format quote_style=1 --output bundle3.js bundle2.js')
        sh.cd('..')

        x = fs.readFileSync('build/bundle3.js', 'utf8');
        x = hashIdentifiers(x, true)
    }

    x = "G=CC.getContext('webgl',{antialias:!1});" + x

    if (!DEBUG && !NO_ROADROLLER) {
        fs.writeFileSync('/tmp/aaa.js', x)
        run(`roadroller -D ${ROADROLLER_PARAMS} -o /tmp/bbb.js /tmp/aaa.js`)
        x = fs.readFileSync('/tmp/bbb.js', 'utf8')
    }

    if (x.endsWith(';')) {
        x = x.substring(0, x.length - 1)
    }

    fs.writeFileSync('build/index.html', `<canvas id=CC style=image-rendering:pixelated><script>${x}</script>`)

    if (!DEBUG) {
        run(advzipPath + ' --shrink-insane -i 10 -a out.zip build/index.html')

        const zipStat = fs.statSync('out.zip')
        const percent = Math.floor((zipStat.size / 13312) * 100)
        console.log('')
        console.log(`  Final bundle size: ${zipStat.size} / 13312 bytes (${percent} %)`)
        console.log('')
    }
}

main()
