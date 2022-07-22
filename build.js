#!/usr/bin/env node
const sh = require('shelljs')
const fs = require('fs')
const path = require('path');
const ShapeShifter = require('regpack/shapeShifter')
const advzipPath = require('advzip-bin')
const constantsJson = require('./src/constants.json')

const DEBUG = process.argv.indexOf('--debug') >= 0
const RELEASE = process.argv.indexOf('--release') >= 0
const MONO_RUN = process.platform === 'win32' ? '' : 'mono ';

const run = cmd => {
    const code = sh.exec(cmd).code
    if (code !== 0)
        process.exit(code)
}

const replaceSimple = (x, y, z) => {
    const idx = x.indexOf(y)
    if (idx < 0) return x
    return x.substr(0, idx) + z + x.substr(idx + y.length)
}

const applyConstants = code => {
    for( let k in constantsJson )
        code = code.replace( new RegExp( k, 'g' ), constantsJson[k] )
    return code
}

const generateShaderFile = () => {
    sh.mkdir('-p', 'shadersTmp')
    sh.ls('src').forEach(x => {
        if (x.endsWith('.frag') || x.endsWith('.vert')) {
            let code = fs.readFileSync(path.resolve('src', x), 'utf8')
            code = applyConstants(code)
            fs.writeFileSync(path.resolve('shadersTmp', x), code)
        }
    })

    let noRenames = ['main']

    if (DEBUG) {
        run(MONO_RUN + 'tools/shader_minifier.exe' +
            ' --no-renaming' +
            ' --format js -o build/shaders.js --preserve-externals shadersTmp/*')
    } else {
        run(MONO_RUN + 'tools/shader_minifier.exe' +
            ' --no-renaming-list ' + noRenames.join(',') +
            ' --format js -o build/shaders.js --preserve-externals shadersTmp/*')
    }

    let shaderCode = fs.readFileSync('build/shaders.js', 'utf8').replace(/\r/g, '')

    let shaderLines = shaderCode
        .split('\n')
        .map(x => x.replace(/^var/, 'export let'))

    shaderCode = shaderLines.join('\n')

    if (DEBUG) {
        shaderCode = shaderCode.replace(/" \+/g, '\\n" +');
    }

    fs.writeFileSync('src/shaders.gen.ts', shaderCode)

    sh.rm('-rf', 'shadersTmp')
};

const hashIdentifiers = js => {
    const varsNotReassigned = ['C0','G']

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

const wrapWithHTML = js => {
    let htmlTemplate = fs.readFileSync( 'src/index.html', 'utf8' );

    htmlTemplate = applyConstants(htmlTemplate)

    htmlTemplate = htmlTemplate
        .split('\n')
        .map(line => line.trim())
        .join(DEBUG ? '\n' : '')
        .trim();

    return replaceSimple(htmlTemplate, '__CODE__', js.trim());
};

const main = () => {
    sh.cd(__dirname)
    sh.mkdir('-p', 'build')

    console.log('Minifying shaders...');
    generateShaderFile();

    console.log('Compiling typescript...')
    run('tsc --outDir build')

    console.log('Rolling up bundle...')
    run('rollup -c' + (DEBUG ? ' --config-debug' : RELEASE ? ' --config-release' : ''))

    let x = fs.readFileSync('build/bundle.js', 'utf8');
    if (!DEBUG) x = hashIdentifiers(x, true)

    if (!DEBUG && x.indexOf('const ') > 0) {
        console.warn('\n    WARNING: "const" appears in packed JS\n')
    }

    x = applyConstants(x)
    x = 'G=C0.getContext`webgl`;' + x

    if (RELEASE) {
        fs.writeFileSync('/tmp/aaa.js', x)
        run('roadroller -D -O2 -o /tmp/bbb.js /tmp/aaa.js')
        x = fs.readFileSync('/tmp/bbb.js', 'utf8')
    }

    x = wrapWithHTML(x)

    fs.writeFileSync('build/index.html', x)

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
