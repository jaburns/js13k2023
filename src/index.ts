import { gl_COLOR_BUFFER_BIT, gl_FRAGMENT_SHADER, gl_VERTEX_SHADER } from './glConsts'
import { main_vert, main_frag } from './shaders.gen';

declare const DEBUG: boolean;
//declare const C: HTMLCanvasElement
declare const G: WebGLRenderingContext
//declare const DEBUG: boolean
declare const k_tickMillis: number

let accTime = 0
let prevNow = NaN

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
    if (isNaN(prevNow)) prevNow = newNow
    let dt = Math.min (newNow - prevNow, 1000)
    accTime += dt
    prevNow = newNow

    while (accTime > k_tickMillis) {
        accTime -= k_tickMillis
        console.log('tick')
    }

    G.clearColor(0,1,0,1)
    G.clear(gl_COLOR_BUFFER_BIT)
    console.log('frame')
}

console.log(compileShader(main_vert, main_frag))
frame()
