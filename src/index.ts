import { gl_COLOR_BUFFER_BIT, gl_FRAGMENT_SHADER, gl_VERTEX_SHADER } from './glConsts'
import {inputsConsumeFrame} from './inputs';
import { main_vert, main_frag } from './shaders.gen';
import { sndOllie, zzfxP } from './zzfx';

declare const DEBUG: boolean;
declare const C0: HTMLCanvasElement
declare const G: WebGLRenderingContext

const TICK_MILLIS = 33

let setStyle = (elem: HTMLElement): void => {
    let style = elem.style
    style.overflow = 'hidden'
    style.margin = 0 as any
    style.width = '100%'
    style.height = '100%'
    style.cursor = 'pointer'
    style.imageRendering = 'pixelated'
}

setStyle(document.body)
setStyle(C0)

window.onresize = () => {
    let w = window.innerWidth, h = window.innerHeight
    C0.width = w
    C0.height = h
    G.viewport(0, 0, w, h)
}

let accTime = 0
let prevNow = 0

let compileShader = (vert: string, frag: string): WebGLProgram => {
    let vs = G.createShader(gl_VERTEX_SHADER)!
    let fs = G.createShader(gl_FRAGMENT_SHADER)!
    let shader = G.createProgram()!

    G.shaderSource(vs, vert)
    G.compileShader(vs)
    G.shaderSource(fs, frag)
    G.compileShader(fs)

    if (DEBUG) {
        let log = G.getShaderInfoLog(fs)
        if (log === null || log.length > 0) {
            console.log('Shader info log:\n' + log)
            if (log !== null && log.indexOf('ERROR') >= 0) {
                console.error(frag.split('\n').map((x,i) => `${i+1}: ${x}`).join('\n'));
            }
        }
    }

    G.attachShader(shader, vs)
    G.attachShader(shader, fs)
    G.linkProgram(shader)
    G.deleteShader(fs)
    G.deleteShader(vs)
    return shader;
};

let frame = () => {
    requestAnimationFrame(frame)

    let newNow = performance.now()
    if (!prevNow) prevNow = newNow
    let dt = Math.min (newNow - prevNow, 1000)
    accTime += dt
    prevNow = newNow

    while (accTime > TICK_MILLIS) {
        accTime -= TICK_MILLIS
    }

    G.clearColor(0,1,0,1)
    G.clear(gl_COLOR_BUFFER_BIT)

    console.log(JSON.stringify(inputsConsumeFrame()))

    if (Math.random() < 0.01) {
        zzfxP(sndOllie)
    }
}

console.log(compileShader(main_vert, main_frag))
frame()
