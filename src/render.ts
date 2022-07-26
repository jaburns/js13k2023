import {modelGeoDraw} from "./geo"
import { gl_CULL_FACE, gl_DEPTH_TEST, gl_FRAGMENT_SHADER, gl_LEQUAL, gl_LINEAR, gl_REPEAT, gl_RGBA, gl_TEXTURE0, gl_TEXTURE1, gl_TEXTURE_2D, gl_TEXTURE_MAG_FILTER, gl_TEXTURE_MIN_FILTER, gl_TEXTURE_WRAP_S, gl_TEXTURE_WRAP_T, gl_UNSIGNED_BYTE, gl_VERTEX_SHADER } from "./glConsts"
import { main_frag, main_vert, sky_frag, sky_vert } from "./shaders.gen"
import { GameState } from "./state"
import { m4Mul, m4Perspective, Mat4 } from "./types"
import { worldGetGeo, worldGetSky } from "./world"
import { tttTextures } from "./textures"

declare const DEBUG: boolean
declare const G: WebGLRenderingContext
declare const CC: HTMLCanvasElement

let mainShader: WebGLProgram
let skyShader: WebGLProgram

let textures: WebGLTexture[] = tttTextures.map(canvas => {
    let tex = G.createTexture()!
    G.bindTexture(gl_TEXTURE_2D, tex)
    G.texImage2D(gl_TEXTURE_2D, 0, gl_RGBA, gl_RGBA, gl_UNSIGNED_BYTE, canvas)
    G.generateMipmap(gl_TEXTURE_2D)
    G.texParameteri(gl_TEXTURE_2D, gl_TEXTURE_MIN_FILTER, gl_LINEAR)
    G.texParameteri(gl_TEXTURE_2D, gl_TEXTURE_MAG_FILTER, gl_LINEAR)
    G.texParameteri(gl_TEXTURE_2D, gl_TEXTURE_WRAP_S, gl_REPEAT)
    G.texParameteri(gl_TEXTURE_2D, gl_TEXTURE_WRAP_T, gl_REPEAT)
    document.body.appendChild(canvas)
    return tex
})

G.enable(gl_DEPTH_TEST)
G.depthFunc(gl_LEQUAL)

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
    let predictedYaw = earlyInputs.mouseAccX + state.yaw

    let c = Math.cos(predictedYaw / 100)
    let s = Math.sin(predictedYaw / 100)

    let mv: Mat4 = [
         c, 0, s, 0,
         0, 1, 0, 0,
        -s, 0, c, 0,
         0,-2 + Math.sin(state.tick / 100),-5, 1
    ]
    let ppp = m4Perspective(
        CC.width / CC.height,
        0.1,
        1000
    )
    let mvp = m4Mul(ppp, mv)
    G.useProgram(mainShader)

    G.uniformMatrix4fv(G.getUniformLocation(mainShader, 'u_mvp'), false, mvp)

    G.uniform1iv(G.getUniformLocation(mainShader, 'u_tex'), textures.map((tex, i) => (
        G.activeTexture(gl_TEXTURE0 + i),
        G.bindTexture(gl_TEXTURE_2D, tex),
        i
    )))
    G.enable(gl_CULL_FACE)
    modelGeoDraw(worldGetGeo(), mainShader)

    G.useProgram(skyShader)
    G.activeTexture(gl_TEXTURE0)
    G.bindTexture(gl_TEXTURE_2D, textures[0])
    G.activeTexture(gl_TEXTURE1)
    G.bindTexture(gl_TEXTURE_2D, textures[1])
    mv = [
         c, 0, s, 0,
         0, 1, 0, 0,
        -s, 0, c, 0,
         0, 0, 0, 1
    ]
    ppp = m4Perspective(
        CC.width / CC.height,
        0.1,
        1000
    )
    mvp = m4Mul(ppp, mv)
    G.uniformMatrix4fv(G.getUniformLocation(skyShader, 'u_mvp'), false, mvp)
    G.disable(gl_CULL_FACE)
    modelGeoDraw(worldGetSky(), skyShader)
}

mainShader = shaderCompile(main_vert, main_frag)
skyShader = shaderCompile(sky_vert, sky_frag)
