import { csgSolidBake, csgSolidSphere, ModelGeo } from "./csg"
import { gl_ARRAY_BUFFER, gl_COLOR_BUFFER_BIT, gl_DEPTH_TEST, gl_ELEMENT_ARRAY_BUFFER, gl_FLOAT, gl_LINES, gl_TEXTURE0, gl_TEXTURE_2D, gl_UNSIGNED_SHORT } from "./glConsts"
import { InputsFrame, inputsNew } from "./inputs"
import { modelGeoDraw, shaderCompile, textures } from "./render"
import { debugLines_frag, debugLines_vert, main_frag, main_vert, debugGeo_frag } from "./shaders.gen"
import { m4Mul, m4MulPoint, m4Perspective, m4RotX, m4RotY, m4Translate, Mat4, v3Add, v3AddScale, v3Cross, v3Negate, Vec3 } from "./types"
import { evaluateNewWorld, worldGetGeo, worldSourceList } from "./world"

declare const CC: HTMLCanvasElement
declare const G: WebGLRenderingContext
declare const k_tickMillis: number
declare const k_mouseSensitivity: number

type EditorState = {
    yaw: number,
    pitch_: number,
    pos: Vec3,
    showLines: boolean,
}

let state: EditorState = {
    yaw: 0,
    pitch_: 0,
    pos: [0,0,0],
    showLines: true,
}

let handleGeo: ModelGeo
let mainShader: WebGLProgram
let debugLinesShader: WebGLProgram
let debugGeoShader: WebGLProgram

let lastInputs: InputsFrame

let sourceElem: HTMLTextAreaElement
let sourceList: [number,string[]][]

let rebuildSourceText = (): void => {
    sourceElem.value = sourceList.map(([indent, items]) => {
        let line = ' '.repeat(indent)
        let comment = items[0].startsWith('#')
        for (let i = 0; i < items.length; ++i) {
            line += items[i]
            if (!comment && (i-1)%3===0) {
                line += '|'
            } else {
                line += ' '
            }
        }
        line = line.substring(0, line.length - 1)
        return line
    }).join('\n')
}

export let editorInit = (): void => {
    mainShader = shaderCompile(main_vert, main_frag)
    debugGeoShader = shaderCompile(main_vert, debugGeo_frag)
    debugLinesShader = shaderCompile(debugLines_vert, debugLines_frag)
    lastInputs = inputsNew()

    handleGeo = csgSolidBake(csgSolidSphere(0, 0,0,0, 10))[0]

    sourceElem = document.createElement('textarea')
    sourceElem.style.zIndex = '10'
    sourceElem.style.position = 'absolute'
    sourceElem.style.left = '0px'
    sourceElem.style.top = '0px'
    sourceElem.style.width = '25%'
    sourceElem.style.height = '50%'

    sourceList = worldSourceList
    rebuildSourceText()

    sourceElem.onkeydown = (e: KeyboardEvent): void => {
        try {
            if (e.code === 'Enter' && e.ctrlKey) {
                navigator.clipboard.writeText(evaluateNewWorld(sourceList))
            }
        } catch (e) {
            console.error(e)
        }
    }
    sourceElem.oninput = () => {
        sourceList = sourceElem.value
            .replace(/\|/g,' ')
            .split('\n')
            .map(x => {
                let trimmed = x.trim()
                return [x.length - trimmed.length, trimmed.replace(/\s+/g, ' ').split(' ')]
            })
    }

    document.body.appendChild(sourceElem)
}

export let editorFrame = (dt: number, inputs: InputsFrame): void => {
    update(dt, inputs)
    render()
}

let update = (dt: number, inputs: InputsFrame): void => {
    if (document.activeElement !== sourceElem) {
        if (inputs.keysDown['0']) {
            state.yaw += inputs.mouseAccX * k_mouseSensitivity * dt / k_tickMillis
            state.pitch_ += inputs.mouseAccY * k_mouseSensitivity * dt / k_tickMillis
            state.pitch_ = Math.max(-1.5, Math.min(1.5, state.pitch_))
            state.yaw %= 2*Math.PI
        }
        let lookVec = m4MulPoint(m4Mul(m4RotY(state.yaw), m4RotX(-state.pitch_)), [0,0,-1])
        let strafeVec = m4MulPoint(m4RotY(state.yaw+Math.PI/2), [0,0,-1])
        let fallVec = v3Cross(lookVec, strafeVec)
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
        if (inputs.keysDown['Q']) {
            moveVec = v3AddScale(moveVec, fallVec, 0.1*dt)
        }
        if (inputs.keysDown['E']) {
            moveVec = v3AddScale(moveVec, fallVec, -0.1*dt)
        }
        if (inputs.keysDown['P'] && !lastInputs.keysDown['P']) {
            state.showLines = !state.showLines
        }
        state.pos = v3Add(state.pos, moveVec)
    }
    lastInputs = inputs
}

let render = (): void => {
    let lookMat = m4Mul(m4RotX(state.pitch_), m4RotY(-state.yaw))
    let viewMat = m4Mul(lookMat, m4Translate(v3Negate(state.pos)))
    let projectionMat = m4Perspective(
        CC.height / CC.width,
        0.1,
        1000
    )
    let vp: Mat4 = m4Mul(projectionMat, viewMat)

    G.clearColor(0,0,0,1)
    G.clear(gl_COLOR_BUFFER_BIT)

    G.useProgram(mainShader)
    G.uniformMatrix4fv(G.getUniformLocation(mainShader, 'u_mvp'), false, vp)
    G.uniform1iv(G.getUniformLocation(mainShader, 'u_tex'), textures.map((tex, i) => (
        G.activeTexture(gl_TEXTURE0 + i),
        G.bindTexture(gl_TEXTURE_2D, tex),
        i
    )))
    modelGeoDraw(worldGetGeo(), mainShader)

    if (!state.showLines) {
        return;
    }

    G.disable(gl_DEPTH_TEST)

    G.useProgram(debugGeoShader)
    for (let line of sourceList) {
        if (line[1][0] !== 'cube' && line[1][0] !== 'sphere') {
            continue;
        }
        let translate = line[1].slice(2, 5).map((x: any) => parseInt(x)) as any as Vec3
        G.uniformMatrix4fv(G.getUniformLocation(debugGeoShader, 'u_mvp'), false, m4Mul(vp, m4Translate(translate)))
        G.uniform3f(G.getUniformLocation(debugGeoShader, 'u_color'), 0,1,1)
        modelGeoDraw(handleGeo, debugGeoShader)
    }

    G.enable(gl_DEPTH_TEST)

    G.useProgram(debugLinesShader)
    G.uniformMatrix4fv(G.getUniformLocation(debugLinesShader, 'u_mvp'), false, vp)
    modelGeoDrawLines(worldGetGeo(), debugLinesShader)
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
