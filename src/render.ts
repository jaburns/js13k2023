import { gl_FRAGMENT_SHADER, gl_VERTEX_SHADER } from "./glConsts"
import { main_frag, main_vert } from "./shaders.gen"
import { GameState } from "./state"
import { worldGetGeo } from "./world"

declare const DEBUG: boolean
declare const G: WebGLRenderingContext

let mainShader: WebGLProgram

let shaderCompile = (vert: string, frag: string): WebGLProgram => {
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
                console.error(frag.split('\n').map((x,i) => `${i+1}: ${x}`).join('\n'))
            }
        }
    }

    G.attachShader(shader, vs)
    G.attachShader(shader, fs)
    G.linkProgram(shader)
    G.deleteShader(fs)
    G.deleteShader(vs)
    return shader
}

export let renderGame = (earlyInputs: {mouseAccX: number, mouseAccY: number}, state: GameState): void => {
    console.log(earlyInputs, state, worldGetGeo())
}

mainShader = shaderCompile(main_vert, main_frag)
