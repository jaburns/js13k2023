import {modelGeoDraw} from "./geo"
import { gl_COLOR_BUFFER_BIT, gl_CULL_FACE, gl_FRAGMENT_SHADER, gl_NONE, gl_VERTEX_SHADER } from "./glConsts"
import { main_frag, main_vert } from "./shaders.gen"
import { GameState } from "./state"
import { m4Mul, m4Perspective, Mat4 } from "./types"
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

//let mat4_perspective = (aspect: any, near: any, far: any): any => {
////  let f = 1.0 / Math.tan(fovy / 2), nf = 1 / (near - far)
//    let f = 1, nf = 1 / (near - far);  // Hard-coded FOV to PI / 2 here.
//
//    return [
//        f / aspect, 0, 0, 0,
//        0, f, 0, 0,
//        0, 0, (far + near) * nf, -1,
//        0, 0, (2 * far * near) * nf, 0
//    ];
//};

export let renderGame = (earlyInputs: {mouseAccX: number, mouseAccY: number}, state: GameState): void => {
    G.viewport(0,0,window.innerWidth, window.innerHeight)
    G.clearColor(0,1,0,1)
    G.clear(gl_COLOR_BUFFER_BIT)

    let mv: Mat4 = [
        1,0,0,0,
        0,1,0,0,
        0,0,1,0,
        0,0,-5,1
    ]
    let ppp = m4Perspective(
        window.innerWidth / window.innerHeight,
        0.1,
        100
    )
    let mvp = m4Mul(ppp, mv)

    G.useProgram(mainShader)

    G.uniformMatrix4fv(G.getUniformLocation(mainShader, 'u_mvp'), false, mvp)

    modelGeoDraw(worldGetGeo(), mainShader)
}

mainShader = shaderCompile(main_vert, main_frag)
