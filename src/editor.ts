import { csgSolidBake, csgSolidSphere, ModelGeo } from "./csg"
import { gl_ARRAY_BUFFER, gl_COLOR_BUFFER_BIT, gl_DEPTH_TEST, gl_ELEMENT_ARRAY_BUFFER, gl_FLOAT, gl_LINES, gl_STATIC_DRAW, gl_TEXTURE0, gl_TEXTURE_2D, gl_UNSIGNED_SHORT } from "./glConsts"
import { InputsFrame, inputsNew } from "./inputs"
import { modelGeoDraw, shaderCompile, textures } from "./render"
import { debugLines_frag, debugLines_vert, main_frag, main_vert, debugGeo_frag, debugRay_vert, debugRay_frag } from "./shaders.gen"
import { m4Mul, m4MulPoint, m4Perspective, m4RotX, m4RotY, m4Translate, Mat4, v3Add, v3AddScale, v3Cross, v3Dot, v3Length, v3Negate, v3Normalize, v3Sub, Vec3 } from "./types"
import { evaluateNewWorld, worldGetGeo, worldSourceList } from "./world"

declare const CC: HTMLCanvasElement
declare const G: WebGLRenderingContext
declare const k_tickMillis: number

let yaw: number
let pitch: number
let pos: Vec3
let showLines: boolean
let showHandles: boolean
let pickedIndex: number
let cameraDragging: boolean
let objectDragging: number|false

let ivp: Mat4
let handleGeo: ModelGeo
let mainShader: WebGLProgram
let debugLinesShader: WebGLProgram
let debugRayShader: WebGLProgram
let debugGeoShader: WebGLProgram
let mouseRayOrigin: Vec3
let mouseRayDir: Vec3

let lastInputs: InputsFrame
let sourceOldText: string
let sourceDirty: boolean
let sourceElem: HTMLTextAreaElement
let sourceList: [number,string[]][]
let undoStack: [number,string[]][][]
let redoStack: [number,string[]][][]

export let editorInit = (): void => {
    yaw = 0
    pitch = 0
    pos = [0,0,0]
    showLines = true
    showHandles = true
    pickedIndex = -1
    cameraDragging = false
    objectDragging = false

    mainShader = shaderCompile(main_vert, main_frag)
    debugGeoShader = shaderCompile(main_vert, debugGeo_frag)
    debugRayShader = shaderCompile(debugRay_vert, debugRay_frag)
    debugLinesShader = shaderCompile(debugLines_vert, debugLines_frag)
    lastInputs = inputsNew()

    drawRayInit()

    ivp = [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]
    mouseRayOrigin = [0,0,0]
    mouseRayDir = [0,0,-1]
    undoStack = []
    redoStack = []

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
    sourceDirty = false
    sourceOldText = sourceElem.value

    sourceElem.onkeydown = (e: KeyboardEvent): void => {
        try {
            if (e.code === 'Enter' && e.ctrlKey) {
                sourceDirty = false
                rebuildScene()
            }
        } catch (e) {
            console.error(e)
        }
    }
    sourceElem.oninput = () => {
        if (!sourceDirty) {
            redoStack = []
            undoStack.push(sourceTextToList(sourceOldText))
            if (undoStack.length > 100) undoStack.shift()
            sourceDirty = true
        }
        sourceOldText = sourceElem.value
        sourceList = sourceTextToList(sourceElem.value)
    }

    document.body.appendChild(sourceElem)
}

export let editorFrame = (dt: number, inputs: InputsFrame): void => {
    update(dt, inputs)
    render()
}

let sourceTextToList = (txt: string): typeof sourceList =>
    txt.replace(/\|/g,' ')
        .split('\n')
        .map(x => {
            let trimmed = x.trim()
            return [x.length - trimmed.length, trimmed.replace(/\s+/g, ' ').split(' ')]
        })

let rebuildSourceText = (): void => {
    sourceDirty = false
    sourceOldText = sourceElem.value = sourceList.map(([indent, items]) => {
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

let rebuildScene = (): void => {
    navigator.clipboard.writeText(evaluateNewWorld(sourceList))
}

let update = (dt: number, inputs: InputsFrame): void => {
    if (document.activeElement === sourceElem) {
        lastInputs = inputs
        return
    }

    if (inputs.keysDown['0']) {
        if (!lastInputs.keysDown['0']) {
            if (pickedIndex >= 0) {
                objectDragging = pickedIndex
                undoStack.push(JSON.parse(JSON.stringify(sourceList)))
                if (undoStack.length > 100) undoStack.shift()
                redoStack = []
            } else {
                cameraDragging = true
            }
        }
    } else {
        cameraDragging = false
        objectDragging = false
    }

    if (cameraDragging) {
        yaw += inputs.mouseAccX * 0.01 * dt / k_tickMillis
        pitch += inputs.mouseAccY * 0.01 * dt / k_tickMillis
        pitch = Math.max(-1.5, Math.min(1.5, pitch))
        yaw %= 2*Math.PI
    }
    if (objectDragging !== false && (inputs.mouseAccX !== 0 || inputs.mouseAccY !== 0)) {
        let offset = 2

        if (inputs.keysDown['E']) {
            offset = 5
        } else if (inputs.keysDown['R']) {
            offset = 8
        }

        let vals = sourceList[objectDragging][1].slice(offset,offset+3).map(x => parseInt(x)) as any as Vec3
        if (inputs.keysDown['X']) {
            vals = v3Add(vals, [Math.sign(v3Dot(mouseRayDir, [0,0,-1]))*inputs.mouseAccX, 0, 0])
        } else if (inputs.keysDown['Y']) {
            vals = v3Add(vals, [0,-inputs.mouseAccY, 0])
        } else if (inputs.keysDown['Z']) {
            vals = v3Add(vals, [0, 0, Math.sign(v3Dot(mouseRayDir, [1,0,0]))*inputs.mouseAccX])
        }
        sourceList[objectDragging][1].splice(offset,3,...vals.map(x => x.toString()))

        rebuildSourceText()
        rebuildScene()
    }

    if (inputs.keysDown['U'] && !lastInputs.keysDown['U']) {
        if (inputs.keysDown['f']) {
            if (redoStack.length > 0) {
                undoStack.push(JSON.parse(JSON.stringify(sourceList)))
                sourceList = redoStack.pop()!
                rebuildSourceText()
                rebuildScene()
            }
        } else if (undoStack.length > 0) {
            redoStack.push(JSON.parse(JSON.stringify(sourceList)))
            sourceList = undoStack.pop()!
            rebuildSourceText()
            rebuildScene()
        }
    }

    let lookVec = m4MulPoint(m4Mul(m4RotY(yaw), m4RotX(-pitch)), [0,0,-1])
    let strafeVec = m4MulPoint(m4RotY(yaw+Math.PI/2), [0,0,-1])
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
    if (inputs.keysDown['f']) { // Shi f t
        moveVec = v3AddScale(moveVec, fallVec, 0.1*dt)
    }
    if (inputs.keysDown['c']) { // Spa c e
        moveVec = v3AddScale(moveVec, fallVec, -0.1*dt)
    }
    if (inputs.keysDown['L'] && !lastInputs.keysDown['L']) {
        showLines = !showLines
    }
    if (inputs.keysDown['H'] && !lastInputs.keysDown['H']) {
        showHandles = !showHandles
    }
    pos = v3Add(pos, moveVec)

    let ndc = v3AddScale([-1,-1,0], [inputs.mousePosX! / window.innerWidth, 1 - inputs.mousePosY! / window.innerHeight, 0], 2)
    mouseRayOrigin = m4MulVec4(ivp, [ndc[0], ndc[1], -1, 1])
    mouseRayDir = v3Normalize(v3Sub(m4MulVec4(ivp, [ndc[0], ndc[1], 1, 1]), mouseRayOrigin))

    lastInputs = inputs
}

let render = (): void => {
    let lookMat = m4Mul(m4RotX(pitch), m4RotY(-yaw))
    let viewMat = m4Mul(lookMat, m4Translate(v3Negate(pos)))
    let projectionMat = m4Perspective(
        CC.height / CC.width,
        0.1,
        1000
    )
    let vp = m4Mul(projectionMat, viewMat)
    ivp = m4IInvert(vp)

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

    pickedIndex = -1

    if (showHandles) {
        G.disable(gl_DEPTH_TEST)

        G.useProgram(debugGeoShader)
        for (let i = 0; i < sourceList.length; ++i) {
            let line = sourceList[i]
            if (line[1][0] !== 'box' && line[1][0] !== 'ball') {
                continue;
            }
            let pos = line[1].slice(2, 5).map((x: any) => parseInt(x)) as any as Vec3
            G.uniformMatrix4fv(G.getUniformLocation(debugGeoShader, 'u_mvp'), false, m4Mul(vp, m4Translate(pos)))

            if (pickedIndex === -1 && v3Length(v3Cross(mouseRayDir, v3Sub(pos, mouseRayOrigin))) < 10) {
                pickedIndex = i
                G.uniform3f(G.getUniformLocation(debugGeoShader, 'u_color'), 0,1,0)
            } else {
                G.uniform3f(G.getUniformLocation(debugGeoShader, 'u_color'), 0,1,1)
            }

            modelGeoDraw(handleGeo, debugGeoShader)
        }
        G.enable(gl_DEPTH_TEST)
    }

    if (showLines) {
        G.useProgram(debugLinesShader)
        G.uniformMatrix4fv(G.getUniformLocation(debugLinesShader, 'u_mvp'), false, vp)
        modelGeoDrawLines(worldGetGeo(), debugLinesShader)
    }

    G.disable(gl_DEPTH_TEST)
    G.useProgram(debugRayShader)
    drawRay(vp,[-1000,0,0],[1000,0,0],[1,0,0])
    drawRay(vp,[0,-1000,0],[0,1000,0],[0,1,0])
    drawRay(vp,[0,0,-1000],[0,0,1000],[0,.5,1])
    G.enable(gl_DEPTH_TEST)
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

let drawRayIndex: WebGLBuffer;
let drawRayVertex: WebGLBuffer;
let drawRayInit = (): void => {
    drawRayIndex = G.createBuffer()!
    G.bindBuffer(gl_ELEMENT_ARRAY_BUFFER, drawRayIndex)
    G.bufferData(gl_ELEMENT_ARRAY_BUFFER, new Uint16Array([0,1]), gl_STATIC_DRAW)
    drawRayVertex = G.createBuffer()!
    G.bindBuffer(gl_ARRAY_BUFFER, drawRayVertex)
    G.bufferData(gl_ARRAY_BUFFER, new Float32Array([0,1]), gl_STATIC_DRAW)
}
let drawRay = (vp: Mat4, a: Vec3, b: Vec3, color: Vec3): void => {
    G.uniform3fv(G.getUniformLocation(debugRayShader, 'u_color'), color)
    G.uniform3fv(G.getUniformLocation(debugRayShader, 'u_pos0'), a)
    G.uniform3fv(G.getUniformLocation(debugRayShader, 'u_pos1'), b)
    G.uniformMatrix4fv(G.getUniformLocation(debugRayShader, 'u_mvp'), false, vp)
    G.bindBuffer(gl_ARRAY_BUFFER, drawRayVertex)
    let posLoc = G.getAttribLocation(debugRayShader, 'a_index')
    G.enableVertexAttribArray(posLoc)
    G.vertexAttribPointer(posLoc, 1, gl_FLOAT, false, 0, 0)
    G.bindBuffer(gl_ELEMENT_ARRAY_BUFFER, drawRayIndex)
    G.drawElements(gl_LINES, 2, gl_UNSIGNED_SHORT, 0)
}

let m4MulVec4 = (m: Mat4, [x,y,z,w]: [number,number,number,number]): Vec3 => {
    let [ox, oy, oz, ow] = [
        (m[0] * x + m[4] * y + m[8] * z + m[12] * w),
        (m[1] * x + m[5] * y + m[9] * z + m[13] * w),
        (m[2] * x + m[6] * y + m[10] * z + m[14] * w),
        (m[3] * x + m[7] * y + m[11] * z + m[15] * w),
    ]
    return [ox/ow, oy/ow, oz/ow]
}

let m4IInvert = (a: Mat4): Mat4 => {
    let out = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
  let a00 = a[0],
    a01 = a[1],
    a02 = a[2],
    a03 = a[3];
  let a10 = a[4],
    a11 = a[5],
    a12 = a[6],
    a13 = a[7];
  let a20 = a[8],
    a21 = a[9],
    a22 = a[10],
    a23 = a[11];
  let a30 = a[12],
    a31 = a[13],
    a32 = a[14],
    a33 = a[15];
  let b00 = a00 * a11 - a01 * a10;
  let b01 = a00 * a12 - a02 * a10;
  let b02 = a00 * a13 - a03 * a10;
  let b03 = a01 * a12 - a02 * a11;
  let b04 = a01 * a13 - a03 * a11;
  let b05 = a02 * a13 - a03 * a12;
  let b06 = a20 * a31 - a21 * a30;
  let b07 = a20 * a32 - a22 * a30;
  let b08 = a20 * a33 - a23 * a30;
  let b09 = a21 * a32 - a22 * a31;
  let b10 = a21 * a33 - a23 * a31;
  let b11 = a22 * a33 - a23 * a32;
  let det =
    b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (!det) {
      throw new Error()
  }
  det = 1.0 / det;
  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
  out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
  out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
  out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
  out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
  out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
  out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
  out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
  out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
  out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
  out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
  out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
  out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
  return out as any as Mat4;
}
