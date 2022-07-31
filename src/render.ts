import {
    gl_ARRAY_BUFFER, gl_CULL_FACE, gl_DEPTH_TEST, gl_ELEMENT_ARRAY_BUFFER, gl_FLOAT, gl_FRAGMENT_SHADER, gl_LEQUAL,
    gl_NEAREST, gl_REPEAT, gl_RGBA, gl_TEXTURE0, gl_TEXTURE_2D, gl_TEXTURE_MAG_FILTER, gl_TEXTURE_MIN_FILTER,
    gl_TEXTURE_WRAP_S, gl_TEXTURE_WRAP_T, gl_TRIANGLES, gl_UNSIGNED_BYTE, gl_UNSIGNED_SHORT, gl_VERTEX_SHADER
} from "./glConsts"
import { main_frag, main_vert, sky_frag, sky_vert } from "./shaders.gen"
import { GameState } from "./state"
import { m4Mul, m4MulPoint, m4Perspective, m4RotX, m4RotY, m4Translate, Mat4, v3Add, v3Sub } from "./types"
import { worldGetGeo, worldGetPlayer, worldGetSky } from "./world"
import { tttTextures } from "./textures"
import { ModelGeo } from "./csg"

declare const DEBUG: boolean
declare const G: WebGLRenderingContext
declare const CC: HTMLCanvasElement
declare const k_mouseSensitivity: number

export let textures: WebGLTexture[] = tttTextures.map(canvas => {
    let tex = G.createTexture()!
    G.bindTexture(gl_TEXTURE_2D, tex)
    G.texImage2D(gl_TEXTURE_2D, 0, gl_RGBA, gl_RGBA, gl_UNSIGNED_BYTE, canvas)
    G.generateMipmap(gl_TEXTURE_2D)
    G.texParameteri(gl_TEXTURE_2D, gl_TEXTURE_MIN_FILTER, gl_NEAREST) // gl_LINEAR)
    G.texParameteri(gl_TEXTURE_2D, gl_TEXTURE_MAG_FILTER, gl_NEAREST) // gl_LINEAR)
    G.texParameteri(gl_TEXTURE_2D, gl_TEXTURE_WRAP_S, gl_REPEAT)
    G.texParameteri(gl_TEXTURE_2D, gl_TEXTURE_WRAP_T, gl_REPEAT)
    document.body.appendChild(canvas)
    return tex
})

G.enable(gl_DEPTH_TEST)
G.depthFunc(gl_LEQUAL)

export let shaderCompile = (vert: string, frag: string): WebGLProgram => {
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
    return shader
}

let mainShader = shaderCompile(main_vert, main_frag)
let skyShader = shaderCompile(sky_vert, sky_frag)

export let modelGeoDraw = (self: ModelGeo, shaderProg: WebGLProgram): void => {
    G.bindBuffer(gl_ARRAY_BUFFER, self.vertexBuffer)
    let posLoc = G.getAttribLocation(shaderProg, 'a_position')
    G.enableVertexAttribArray(posLoc)
    G.vertexAttribPointer(posLoc, 3, gl_FLOAT, false, 0, 0)

    G.bindBuffer(gl_ARRAY_BUFFER, self.normalBuffer)
    posLoc = G.getAttribLocation(shaderProg, 'a_normal')
    G.enableVertexAttribArray(posLoc)
    G.vertexAttribPointer(posLoc, 3, gl_FLOAT, false, 0, 0)

    G.bindBuffer(gl_ARRAY_BUFFER, self.uvTagBuffer)
    posLoc = G.getAttribLocation(shaderProg, 'a_uvTag')
    G.enableVertexAttribArray(posLoc)
    G.vertexAttribPointer(posLoc, 3, gl_FLOAT, false, 0, 0)

    console.log('DRAW ELEMENTS')
    G.bindBuffer(gl_ELEMENT_ARRAY_BUFFER, self.indexBuffer)
    G.drawElements(gl_TRIANGLES, self.indexBufferLen, gl_UNSIGNED_SHORT, 0)
}

export let renderGame = (earlyInputs: {mouseAccX: number, mouseAccY: number}, state: GameState): void => {
    let predictedYaw = earlyInputs.mouseAccX * k_mouseSensitivity + state.yaw
    let predictedPitch = earlyInputs.mouseAccY * k_mouseSensitivity + state.pitch_
    predictedPitch = Math.max(-1.5, Math.min(1.5, predictedPitch))
    let lookVec = m4MulPoint(m4Mul(m4RotY(predictedYaw), m4RotX(-predictedPitch)), [0,0,-state.camBack])

    let lookMat = m4Mul(m4RotX(predictedPitch), m4RotY(-predictedYaw))
    let viewMat = m4Mul(lookMat, m4Translate(v3Sub(lookVec, v3Add(state.pos, [0,20,0]))))
    let projectionMat = m4Perspective(
        CC.height / CC.width,
        0.1,
        1000
    )
    let modelMat = m4Translate(state.pos)
    let mvp: Mat4

    console.log('renderGame')

    // Player
    //mvp = m4Mul(projectionMat, m4Mul(viewMat, modelMat))
    //G.useProgram(mainShader)
    //G.uniformMatrix4fv(G.getUniformLocation(mainShader, 'u_mvp'), false, mvp)
    //G.uniform1iv(G.getUniformLocation(mainShader, 'u_tex'), textures.map((tex, i) => (
    //    G.activeTexture(gl_TEXTURE0 + i),
    //    G.bindTexture(gl_TEXTURE_2D, tex),
    //    i
    //)))
    //modelGeoDraw(worldGetPlayer(), mainShader)

    // World
    mvp = m4Mul(projectionMat, viewMat)
    G.useProgram(mainShader)
    G.uniformMatrix4fv(G.getUniformLocation(mainShader, 'u_mvp'), false, mvp)
    G.uniform1iv(G.getUniformLocation(mainShader, 'u_tex'), textures.map((tex, i) => (
        G.activeTexture(gl_TEXTURE0 + i),
        G.bindTexture(gl_TEXTURE_2D, tex),
        i
    )))
    modelGeoDraw(worldGetGeo(), mainShader)

    // Skybox
    // G.disable(gl_CULL_FACE)
    // G.useProgram(skyShader)
    // G.uniformMatrix4fv(G.getUniformLocation(skyShader, 'u_mvp'), false, m4Mul(projectionMat, lookMat))
    // modelGeoDraw(worldGetSky(), skyShader)
    // G.enable(gl_CULL_FACE)
}
