import * as gl from './glConsts'
import { main_frag, main_vert, sky_frag, sky_vert, aimRay_frag, aimRay_vert } from "./shaders.gen"
import { GameState } from "./state"
import { m4AxisAngle, m4Ident, m4Mul, m4MulPoint, m4Perspective, m4RotX, m4RotY, m4Scale, m4Translate, Mat4, v3Add, v3AddScale, v3Sub, Vec3 } from "./types"
import { worldGetCannon, worldGetGeo, worldGetPlayer, worldGetSky } from "./world"
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
G.enable(gl.BLEND)
G.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
G.depthFunc(gl.LEQUAL)

let drawRayIndex = G.createBuffer()!
G.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, drawRayIndex)
G.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0,1]), gl.STATIC_DRAW)
let drawRayVertex = G.createBuffer()!
G.bindBuffer(gl.ARRAY_BUFFER, drawRayVertex)
G.bufferData(gl.ARRAY_BUFFER, new Float32Array([0,1]), gl.STATIC_DRAW)

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
let aimRayShader = shaderCompile(aimRay_vert, aimRay_frag)

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

let ballRot: Mat4 = m4Ident

let pp = 0
let py = 0

export let renderGame = (earlyInputs: {mouseAccX: number, mouseAccY: number}, state: GameState, dt: number): void => {
    let predictedYaw = earlyInputs.mouseAccX * k_mouseSensitivity + state.yaw
    let predictedPitch = earlyInputs.mouseAccY * k_mouseSensitivity + state.pitch
    predictedPitch = Math.max(-1.5, Math.min(1.5, predictedPitch))
    let lookVec = m4MulPoint(m4Mul(m4RotY(predictedYaw), m4RotX(-predictedPitch)), [0,0,-state.camBack])
    pp += (predictedPitch - pp) * 0.1
    py += (predictedYaw - py) * 0.1
    let lazyLookVec = m4MulPoint(m4Mul(m4RotY(py), m4RotX(-pp)), [0,0,-state.camBack])

    ballRot = m4Mul(m4AxisAngle(state.rotAxis, state.rotSpeed * dt), ballRot)

    let lookMat = m4Mul(m4RotX(predictedPitch), m4RotY(-predictedYaw))
    let viewMat = m4Mul(lookMat, m4Translate(v3Sub(lookVec, v3Add(state.pos, [0,60,0])))) // 20 for ball, 60 for cannon
    let projectionMat = m4Perspective(
        CC.height / CC.width,
        0.1,
        10000
    )
    let modelMat = m4Mul(m4Mul(m4Translate(state.pos), m4Scale(0.2)), ballRot)
    let vp = m4Mul(projectionMat, viewMat)

    // Player
    G.useProgram(mainShader)
    G.uniformMatrix4fv(G.getUniformLocation(mainShader, 'u_model'), false, modelMat)
    G.uniformMatrix4fv(G.getUniformLocation(mainShader, 'u_vp'), false, vp)
    G.uniform1iv(G.getUniformLocation(mainShader, 'u_tex'), textures.map((tex, i) => (
        G.activeTexture(gl.TEXTURE0 + i),
        G.bindTexture(gl.TEXTURE_2D, tex),
        i
    )))
    modelGeoDraw(worldGetPlayer(), mainShader)


    // Cannon
    modelMat = m4Mul(m4RotY(py), m4RotX(-pp))
    G.useProgram(mainShader)
    G.uniformMatrix4fv(G.getUniformLocation(mainShader, 'u_model'), false, modelMat)
    G.uniformMatrix4fv(G.getUniformLocation(mainShader, 'u_vp'), false, vp)
    G.uniform1iv(G.getUniformLocation(mainShader, 'u_tex'), textures.map((tex, i) => (
        G.activeTexture(gl.TEXTURE0 + i),
        G.bindTexture(gl.TEXTURE_2D, tex),
        i
    )))
    modelGeoDraw(worldGetCannon(), mainShader)

    // World
    G.useProgram(mainShader)
    G.uniformMatrix4fv(G.getUniformLocation(mainShader, 'u_model'), false, m4Ident)
    G.uniformMatrix4fv(G.getUniformLocation(mainShader, 'u_vp'), false, vp)
    G.uniform3fv(G.getUniformLocation(mainShader, 'u_ballPos'), state.pos)
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

    // Aim line
    G.useProgram(aimRayShader)
    G.uniform3fv(G.getUniformLocation(aimRayShader, 'u_pos0'), state.pos)
    G.uniform3fv(G.getUniformLocation(aimRayShader, 'u_pos1'), v3AddScale(state.pos, lazyLookVec, 100))
    G.uniformMatrix4fv(G.getUniformLocation(aimRayShader, 'u_vp'), false, vp)
    G.bindBuffer(gl.ARRAY_BUFFER, drawRayVertex)
    let posLoc = G.getAttribLocation(aimRayShader, 'a_index')
    G.enableVertexAttribArray(posLoc)
    G.vertexAttribPointer(posLoc, 1, gl.FLOAT, false, 0, 0)
    G.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, drawRayIndex)
    G.drawElements(gl.LINES, 2, gl.UNSIGNED_SHORT, 0)
}
