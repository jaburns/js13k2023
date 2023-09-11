#!/usr/bin/env node
const sh = require('shelljs')
const fs = require('fs')
const path = require('path');
const ShapeShifter = require('regpack/shapeShifter')
const advzipPath = require('advzip-bin')
const constantsJson = require('./constants.json')

const EDITOR = process.argv.indexOf('--editor') >= 0
const DEBUG = EDITOR || process.argv.indexOf('--debug') >= 0
const SEARCH = process.argv.indexOf('--search') >= 0
const MONO_RUN = process.platform === 'win32' ? '' : 'mono ';

const BEST_ROADROLLER_PARAMS = '-Zab0 -Zdy0 -Zlr1113 -Zmc4 -Zmd21 -Zpr14 -S0,1,2,3,4,7,13,21,30,42,202,241'

// $ npm run search 2>&1 | grep '<-'
const ROADROLLER_PARAMS = SEARCH ? '-OO' : BEST_ROADROLLER_PARAMS

const CLOSURE_COMPILER_EXTERNS = `
/**
 * @type {!HTMLCanvasElement}
 */
var CC;
/**
 * @type {!HTMLCanvasElement}
 */
var C2;
/**
 * @type {!WebGLRenderingContext}
 */
var G;
`

const run = cmd => {
    console.log('==>',cmd)
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

const generateDebugShaderFile = () => {
    let outLines = []

    sh.ls('shaders').forEach(x => {
        let code = fs.readFileSync(path.resolve('shaders', x), 'utf8')

        for (const k in constantsJson)
            code = code.replace(new RegExp( k, 'g' ), constantsJson[k])

        outLines.push(`export let ${x.replace('.', '_')} = \`${code}\``)
    })

    fs.writeFileSync('src/shaders.gen.ts', outLines.join('\n'))
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

    const noRenames = ['main']

    run(MONO_RUN + 'tools/shader_minifier.exe' +
        ' --no-renaming-list ' + noRenames.join(',') +
        ' --aggressive-inlining --format js -o build/shaders.js --preserve-externals shadersTmp/*')

    const shaderCode = fs.readFileSync('build/shaders.js', 'utf8').replace(/\r/g, '')
        .split('\n')
        .map(x => x.replace(/^var/, 'export let'))
        .join('\n')

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

    if (DEBUG) {
        generateDebugShaderFile();
    } else {
        buildShaderExternalNamesTable()
        generateShaderFile();
    }

    run('tsc --outDir build')

    run('rollup -c' + (EDITOR ? ' --config-editor' : DEBUG ? ' --config-debug' : ''))

    let x = fs.readFileSync('build/bundle.js', 'utf8');

    for (const k in shaderExternalNames)
        x = x.replace(new RegExp( k, 'g' ), shaderExternalNames[k])

    if (!DEBUG) {
        sh.cd('build')
        fs.writeFileSync('bundle1.js', x)
        fs.writeFileSync('externs.js', CLOSURE_COMPILER_EXTERNS)
        run('google-closure-compiler -O ADVANCED bundle1.js --js_output_file bundle2.js --externs externs.js')

        fs.writeFileSync('bundle2.js', fs.readFileSync('bundle2.js', 'utf8').replace(/var /g, 'let '))

        run('terser --ecma 2020 --mangle reserved=[CC,C2,G] --mangle_props keep_quoted --compress passes=10,keep_fargs=false,pure_getters=true,unsafe=true,unsafe_arrows=true,unsafe_comps=true,unsafe_math=true,unsafe_methods=true,unsafe_symbols=true --format quote_style=1 --output bundle3.js bundle2.js')
        sh.cd('..')

        x = fs.readFileSync('build/bundle3.js', 'utf8');
        x = hashIdentifiers(x, true)
    }

    if (x.endsWith(';')) {
        x = x.substring(0, x.length - 1)
    }

    x = "(()=>{let G=CC.getContext('webgl',{antialias:!1});" + x + "})()"
    let noRr = x

    if (!DEBUG) {
        fs.writeFileSync('/tmp/aaa.js', x)
        run(`roadroller -D ${ROADROLLER_PARAMS} -o /tmp/bbb.js /tmp/aaa.js`)
        x = fs.readFileSync('/tmp/bbb.js', 'utf8')
    }

    let html = js => `<canvas id=CC style=image-rendering:pixelated></canvas><canvas id=C2></canvas><script>${js}</script>`

    fs.writeFileSync('build/index.html', html(x))
    fs.writeFileSync('build/index_no_rr.html', html(noRr))

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
