import * as gl from './glConsts'
import { main_frag, main_vert, sky_frag, sky_vert } from "./shaders.gen"
import { GameState } from "./state"
import { m4Mul, m4MulPoint, m4Perspective, m4RotX, m4RotY, m4Translate, Mat4, v3Add, v3Sub } from "./types"
import { worldGetGeo, worldGetPlayer, worldGetSky } from "./world"
import { generatedTextures } from "./textures"
import { ModelGeo } from "./csg"

declare const DEBUG: boolean
declare const G: WebGLRenderingContext
declare const CC: HTMLCanvasElement
declare const k_mouseSensitivity: number
declare const k_packedTexWidth: number

export let textures: WebGLTexture[] = generatedTextures.map(pixels => {
    let tex = G.createTexture()!
    G.bindTexture(gl.TEXTURE_2D, tex)
    G.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, k_packedTexWidth, k_packedTexWidth, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
    G.generateMipmap(gl.TEXTURE_2D)
    G.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    G.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    G.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
    G.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
    return tex
})

G.enable(gl.DEPTH_TEST)
G.depthFunc(gl.LEQUAL)

export let shaderCompile = (vert: string, frag: string): WebGLProgram => {
    let vs = G.createShader(gl.VERTEX_SHADER)!
    let fs = G.createShader(gl.FRAGMENT_SHADER)!
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
    G.bindBuffer(gl.ARRAY_BUFFER, self.vertexBuffer)
    let posLoc = G.getAttribLocation(shaderProg, 'a_position')
    G.enableVertexAttribArray(posLoc)
    G.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0)

    G.bindBuffer(gl.ARRAY_BUFFER, self.normalBuffer)
    posLoc = G.getAttribLocation(shaderProg, 'a_normal')
    if (posLoc >= 0) {
        G.enableVertexAttribArray(posLoc)
        G.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0)

        G.bindBuffer(gl.ARRAY_BUFFER, self.tagBuffer)
        posLoc = G.getAttribLocation(shaderProg, 'a_tag')
        G.enableVertexAttribArray(posLoc)
        G.vertexAttribPointer(posLoc, 1, gl.FLOAT, false, 0, 0)
    }

    G.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, self.indexBuffer)
    G.drawElements(gl.TRIANGLES, self.indexBufferLen, gl.UNSIGNED_SHORT, 0)
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
        10000
    )
    let modelMat = m4Translate(state.pos)
    let mvp: Mat4

    // Player
    mvp = m4Mul(projectionMat, m4Mul(viewMat, modelMat))
    G.useProgram(mainShader)
    G.uniformMatrix4fv(G.getUniformLocation(mainShader, 'u_mvp'), false, mvp)
    G.uniform1iv(G.getUniformLocation(mainShader, 'u_tex'), textures.map((tex, i) => (
        G.activeTexture(gl.TEXTURE0 + i),
        G.bindTexture(gl.TEXTURE_2D, tex),
        i
    )))
    modelGeoDraw(worldGetPlayer(), mainShader)

    // World
    mvp = m4Mul(projectionMat, viewMat)
    G.useProgram(mainShader)
    G.uniformMatrix4fv(G.getUniformLocation(mainShader, 'u_mvp'), false, mvp)
    G.uniform1iv(G.getUniformLocation(mainShader, 'u_tex'), textures.map((tex, i) => (
        G.activeTexture(gl.TEXTURE0 + i),
        G.bindTexture(gl.TEXTURE_2D, tex),
        i
    )))
    modelGeoDraw(worldGetGeo(), mainShader)

    // Skybox
    G.disable(gl.CULL_FACE)
    G.useProgram(skyShader)
    G.uniformMatrix4fv(G.getUniformLocation(skyShader, 'u_mvp'), false, m4Mul(projectionMat, lookMat))
    modelGeoDraw(worldGetSky(), skyShader)
    G.enable(gl.CULL_FACE)

    //let sky = worldGetSky()
    //G.disable(gl.CULL_FACE)
    //G.useProgram(skyShader)
    //G.uniformMatrix4fv(G.getUniformLocation(skyShader, 'u_mvp'), false, m4Mul(projectionMat, lookMat))
    //G.bindBuffer(gl.ARRAY_BUFFER, worldGetSky().vertexBuffer)
    //let posLoc = G.getAttribLocation(skyShader, 'a_position')
    //G.enableVertexAttribArray(posLoc)
    //G.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0)
    //G.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sky.indexBuffer)
    //G.drawElements(gl.TRIANGLES, sky.indexBufferLen, gl.UNSIGNED_SHORT, 0)
    //G.enable(gl.CULL_FACE)
}
