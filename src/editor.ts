import { ModelGeo } from "./csg"
import { gl_ARRAY_BUFFER, gl_COLOR_BUFFER_BIT, gl_ELEMENT_ARRAY_BUFFER, gl_FLOAT, gl_LINES, gl_TEXTURE0, gl_TEXTURE_2D, gl_UNSIGNED_SHORT } from "./glConsts"
import { InputsFrame } from "./inputs"
import { modelGeoDraw, shaderCompile, textures } from "./render"
import {debugLines_frag, debugLines_vert, main_frag, main_vert} from "./shaders.gen"
import { m4Mul, m4MulPoint, m4Perspective, m4RotX, m4RotY, m4Translate, Mat4, v3Add, v3AddScale, v3Cross, v3Negate, Vec3 } from "./types"
import { evaluateNewWorld, worldGetGeo } from "./world"

declare const CC: HTMLCanvasElement
declare const G: WebGLRenderingContext
declare const k_tickMillis: number
declare const k_mouseSensitivity: number

type EditorState = {
    yaw: number,
    pitch_: number,
    pos: Vec3,
}

let state: EditorState = {
    yaw: 0,
    pitch_: 0,
    pos: [0,5,0],
}

let mainShader: WebGLProgram
let debugLinesShader: WebGLProgram
let source: HTMLTextAreaElement

export let editorInit = (): void => {
    mainShader = shaderCompile(main_vert, main_frag)
    debugLinesShader = shaderCompile(debugLines_vert, debugLines_frag)

    source = document.createElement('textarea')
    source.style.zIndex = '10'
    source.style.position = 'absolute'
    source.style.left = '0px'
    source.style.top = '0px'
    source.style.width = '25%'
    source.style.height = '50%'
    source.value = `
cube   0|0 -10 0|100 10 100|.75 .1 0
sphere 1|0 0 0|5
add
`
    source.onkeydown = (e: KeyboardEvent): void => {
        try {
            if (e.code === 'Enter' && e.ctrlKey) {
                let compiled = source.value
                    .split('\n')
                    .filter(x => x.trim().length > 0)
                    .map(x => '['+
                        x.replace(/\|/g,' ')
                        .trim()
                        .replace(/\s+/g, ',')
                        .replace(/([a-z]+)/g, '"$1"')
                    +']')
                    .join(',')
                let builtJs = new Function('fn', `return fn([${compiled}])`)(evaluateNewWorld)
                console.log(builtJs)
            }
        } catch (e) {
            console.error(e)
        }
    }

    document.body.appendChild(source)
}

export let editorFrame = (dt: number, inputs: InputsFrame): void => {
    update(dt, inputs)
    render()
}

let update = (dt: number, inputs: InputsFrame): void => {
    if (document.activeElement !== source) {
        if (inputs.keysDown['0']) {
            state.yaw += inputs.mouseAccX * k_mouseSensitivity * dt / k_tickMillis
            state.pitch_ += inputs.mouseAccY * k_mouseSensitivity * dt / k_tickMillis
            state.pitch_ = Math.max(-1.5, Math.min(1.5, state.pitch_))
            state.yaw %= 2*Math.PI
        }
        let lookVec = m4MulPoint(m4Mul(m4RotY(state.yaw), m4RotX(-state.pitch_)), [0,0,-1])
        let strafeVec = m4MulPoint(m4RotY(state.yaw+Math.PI/2), [0,0,-1])
        let riseVec = v3Cross(lookVec, strafeVec)
        let moveVec: Vec3 = [0,0,0]
        if (inputs.keysDown['W']) {
            moveVec = v3AddScale(moveVec, lookVec, 0.1*dt)
        }
        if (inputs.keysDown['S']) {
            moveVec = v3AddScale(moveVec, lookVec, -0.1*dt)
        }
        if (inputs.keysDown['D']) {
            moveVec = v3AddScale(moveVec, strafeVec, 0.1*dt)
        }
        if (inputs.keysDown['A']) {
            moveVec = v3AddScale(moveVec, strafeVec, -0.1*dt)
        }
        if (inputs.keysDown['f']) {
            moveVec = v3AddScale(moveVec, riseVec, 0.1*dt)
        }
        if (inputs.keysDown['c']) {
            moveVec = v3AddScale(moveVec, riseVec, -0.1*dt)
        }
        state.pos = v3Add(state.pos, moveVec)
    }
}

let render = (): void => {
    let lookMat = m4Mul(m4RotX(state.pitch_), m4RotY(-state.yaw))
    let viewMat = m4Mul(lookMat, m4Translate(v3Negate(state.pos)))
    let projectionMat = m4Perspective(
        CC.width / CC.height,
        0.1,
        1000
    )
    let mvp: Mat4 = m4Mul(projectionMat, viewMat)

    G.clearColor(0,0,0,1)
    G.clear(gl_COLOR_BUFFER_BIT)

    G.useProgram(mainShader)
    G.uniformMatrix4fv(G.getUniformLocation(mainShader, 'u_mvp'), false, mvp)
    G.uniform1iv(G.getUniformLocation(mainShader, 'u_tex'), textures.map((tex, i) => (
        G.activeTexture(gl_TEXTURE0 + i),
        G.bindTexture(gl_TEXTURE_2D, tex),
        i
    )))
    modelGeoDraw(worldGetGeo(), mainShader)

    //G.disable(gl_DEPTH_TEST)
    mvp = m4Mul(projectionMat, viewMat)
    G.useProgram(debugLinesShader)
    G.uniformMatrix4fv(G.getUniformLocation(debugLinesShader, 'u_mvp'), false, mvp)
    modelGeoDrawLines(worldGetGeo(), debugLinesShader)
    //G.enable(gl_DEPTH_TEST)
}

let modelGeoDrawLines = (self: ModelGeo, shaderProg: WebGLProgram): void => {
    G.bindBuffer(gl_ARRAY_BUFFER, self.lines!.vertexBuffer)
    let posLoc = G.getAttribLocation(shaderProg, 'a_position')
    G.enableVertexAttribArray(posLoc)
    G.vertexAttribPointer(posLoc, 3, gl_FLOAT, false, 0, 0)

    G.bindBuffer(gl_ARRAY_BUFFER, self.lines!.tagBuffer)
    posLoc = G.getAttribLocation(shaderProg, 'a_tag')
    G.enableVertexAttribArray(posLoc)
    G.vertexAttribPointer(posLoc, 1, gl_FLOAT, false, 0, 0)

    G.bindBuffer(gl_ELEMENT_ARRAY_BUFFER, self.lines!.indexBuffer)
    G.drawElements(gl_LINES, self.lines!.indexBufferLen, gl_UNSIGNED_SHORT, 0)
}
