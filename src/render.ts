import * as gl from './glConsts'
import { main_frag, main_vert, sky_frag, sky_vert, aimRay_frag, aimRay_vert, blit_frag, blit_vert } from "./shaders.gen"
import { GameMode, GameState, predictShot } from "./state"
import { lerp, m4AxisAngle, m4Ident, m4Mul, m4MulPoint, m4Perspective, m4RotX, m4RotY, m4Scale, m4Translate, Mat4, radLerp, v3Add, v3AddScale, v3Sub, Vec3, vecLerp } from "./types"
import { cannonGeo, castleGeo, CastleGib, castleGibs, gibCastle, hints, lastLevel, loadLevel, playerGeo, skyboxGeo, worldGetCastles, worldGetGeo } from "./world"
import { bindTextureUniforms } from "./textures"
import { ModelGeo } from "./csg"

declare const DEBUG: boolean
declare const G: WebGLRenderingContext
declare const CC: HTMLCanvasElement
declare const C2: HTMLCanvasElement
declare const k_mouseSensitivity: number
declare const k_aimSteps: number
declare const k_pixelSize: number
declare const k_gravity: number
declare const k_tickMillis: number

let ctx = C2.getContext('2d')!
let ctxtx = G.createTexture()!
let fade = 0


G.bindTexture(gl.TEXTURE_2D, ctxtx)
G.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
G.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
G.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
G.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

let blitTriBuffer = G.createBuffer()!
G.bindBuffer(gl.ARRAY_BUFFER, blitTriBuffer)
G.bufferData(gl.ARRAY_BUFFER, Float32Array.of(-1,-1,1,-1,-1,1, 1,1,-1,1,1,-1), gl.STATIC_DRAW)

G.enable(gl.DEPTH_TEST)
G.enable(gl.BLEND)
G.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
G.depthFunc(gl.LEQUAL)

let drawRayIndex = G.createBuffer()!
G.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, drawRayIndex)
G.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(Array(2 * k_aimSteps).fill(0).map((_,i) => i)), gl.STATIC_DRAW)
let drawRayVertex = G.createBuffer()!
G.bindBuffer(gl.ARRAY_BUFFER, drawRayVertex)
G.bufferData(gl.ARRAY_BUFFER, new Float32Array(6 * k_aimSteps), gl.DYNAMIC_DRAW)

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
        if (log == null || log.length > 0) {
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
let blitShader = shaderCompile(blit_vert, blit_frag)

export let modelGeoDraw = (me: ModelGeo, shaderProg: WebGLProgram): void => {
    G.bindBuffer(gl.ARRAY_BUFFER, me.vertexBuffer)
    let posLoc = G.getAttribLocation(shaderProg, 'a_position')
    G.enableVertexAttribArray(posLoc)
    G.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0)

    G.bindBuffer(gl.ARRAY_BUFFER, me.normalBuffer)
    posLoc = G.getAttribLocation(shaderProg, 'a_normal')
    if (posLoc >= 0) {
        G.enableVertexAttribArray(posLoc)
        G.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0)

        G.bindBuffer(gl.ARRAY_BUFFER, me.tagBuffer)
        posLoc = G.getAttribLocation(shaderProg, 'a_tag')
        G.enableVertexAttribArray(posLoc)
        G.vertexAttribPointer(posLoc, 1, gl.FLOAT, false, 0, 0)
    }

    G.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, me.indexBuffer)
    G.drawElements(gl.TRIANGLES, me.indexBufferLen, gl.UNSIGNED_SHORT, 0)
}

let ballRot: Mat4 = m4Ident

let mainPitch = 0
let mainYaw = 0
let unlockT = 0

let lazyPitch = 0
let lazyYaw = 0

let camOff: Vec3 = [0,0,0]
let cannonPos: Vec3 = [0,0,0]
let ballPos: Vec3 = [0,0,0]

let oldMode: GameMode
let modeT = 0
let uihash: any

let gibbedCastles: number[] = []
let castleGibStates: CastleGib[] = []

export let resize = () => {
    G.viewport(0, 0, C2.width=CC.width=window.innerWidth/k_pixelSize, C2.height=CC.height=window.innerHeight/k_pixelSize)
    uihash = 9
}

export let renderGame = (earlyInputs: {mouseAccX: number, mouseAccY: number}, state: GameState, dt: number): void => {
    if (state.mode == GameMode.Dead || state.mode == GameMode.Win) {
        earlyInputs.mouseAccX = earlyInputs.mouseAccY = 0
    }

    let predictedYaw = earlyInputs.mouseAccX * k_mouseSensitivity + state.yaw
    let predictedPitch = earlyInputs.mouseAccY * k_mouseSensitivity + state.pitch
    predictedPitch = Math.max(-1.5, Math.min(1.5, predictedPitch))
    modeT += dt

    if (state.lockView) {
        unlockT = 500
    } else if (unlockT > 0) {
        mainPitch = lerp(mainPitch, predictedPitch, 0.02 * dt)
        mainYaw = radLerp(mainYaw, predictedYaw, 0.02 * dt)
        unlockT -= dt
    } else {
        mainPitch = predictedPitch
        mainYaw = predictedYaw
    }

    let lookVec = m4MulPoint(m4Mul(m4RotY(mainYaw), m4RotX(-mainPitch)), [0,0,-state.camBack])
    camOff = vecLerp(camOff, state.mode == GameMode.Ball || state.mode == GameMode.Dead || state.mode == GameMode.Win ? [0,20,0] : [-20,30,0], 0.01 * dt)
    ballRot = m4Mul(m4AxisAngle(state.rotAxis, state.rotSpeed * dt), ballRot)
    let lookMat = m4Mul(m4RotX(mainPitch), m4RotY(-mainYaw))
    let fwdLookMat = m4Mul(m4RotY(mainYaw), m4RotX(-mainPitch))
    let camOffset: Vec3 = m4MulPoint(fwdLookMat, camOff)
    let viewMat = m4Mul(lookMat, m4Translate(v3Sub(lookVec, v3Add(state.pos, camOffset))))
    let projectionMat = m4Perspective(
        CC.height / CC.width,
        0.1,
        10000
    )
    let vp = m4Mul(projectionMat, viewMat)
    let drawCannon = 0, modelMat

    if (state.mode == GameMode.Ball || state.mode == GameMode.Dead || state.mode == GameMode.Win) {
        ballPos = state.pos
        drawCannon = (state.mode == GameMode.Ball && modeT < 100) as any
        drawBall(vp, mainShader, 0)
    }
    if (state.mode == GameMode.FirstAim || state.mode == GameMode.LaterAim) {
        lazyPitch = lerp(lazyPitch, predictedPitch, 0.01 * dt)
        lazyYaw = radLerp(lazyYaw, predictedYaw, 0.01 * dt)
        cannonPos = state.pos
        drawCannon = 1
    }

    if (drawCannon || state.mode == GameMode.Menu) {
        if (state.mode == GameMode.Menu) {
            lazyYaw = 1
            lazyPitch = -.5
            cannonPos = state.pos
        }

        modelMat = m4Mul(m4Mul(m4Translate(cannonPos), m4Mul(m4RotY(lazyYaw), m4RotX(-lazyPitch))), m4Scale(0.12))
        G.useProgram(mainShader)
        G.uniformMatrix4fv(G.getUniformLocation(mainShader, 'u_model'), false, modelMat)
        G.uniformMatrix4fv(G.getUniformLocation(mainShader, 'u_vp'), false, vp)
        bindTextureUniforms(mainShader)
        modelGeoDraw(cannonGeo, mainShader)
    }

    let castles = worldGetCastles()
    for (let i = 0; i < castles.length; ++i) {
        if (state.castlesHit.indexOf(i) >= 0) {
            if (gibbedCastles.indexOf(i) < 0) {
                gibbedCastles.push(i)
                castleGibStates.push(...gibCastle(castles[i] as any, state.vel))
            }
            continue
        }
        modelMat = m4Mul(
            m4Mul(m4Translate(v3Add(castles[i] as any, [0,10*Math.sin(modeT/800),0])), m4Scale(0.25)),
            m4Mul(m4RotY(modeT / 1000 + i), m4RotX(0.15))
        )
        G.useProgram(mainShader)
        G.uniformMatrix4fv(G.getUniformLocation(mainShader, 'u_model'), false, modelMat)
        G.uniformMatrix4fv(G.getUniformLocation(mainShader, 'u_vp'), false, vp)
        bindTextureUniforms(mainShader)
        modelGeoDraw(castleGeo, mainShader)
    }

    for (let gib of castleGibStates) {
        let grav = k_gravity / k_tickMillis / k_tickMillis;
        gib.rotation = m4Mul(m4AxisAngle(gib.axis, gib.omega * dt), gib.rotation)
        gib.vel = v3AddScale(gib.vel, [0,grav,0], dt)
        gib.pos = v3AddScale(gib.pos, gib.vel, dt)
        modelMat = m4Mul(
            m4Mul(m4Translate(gib.pos), m4Scale(0.25)),
            m4Mul(gib.rotation, m4Translate(gib.offset)),
        )
        G.useProgram(mainShader)
        G.uniformMatrix4fv(G.getUniformLocation(mainShader, 'u_model'), false, modelMat)
        G.uniformMatrix4fv(G.getUniformLocation(mainShader, 'u_vp'), false, vp)
        bindTextureUniforms(mainShader)
        modelGeoDraw(castleGibs[gib.kind], mainShader)
    }

    if (oldMode != state.mode) {
        oldMode = state.mode
        if (oldMode == GameMode.FirstAim) {
            gibbedCastles = []
            castleGibStates = []
            loadLevel(state.level)
        }
        modeT = 0
    }

    // World
    G.useProgram(mainShader)
    G.uniformMatrix4fv(G.getUniformLocation(mainShader, 'u_model'), false, m4Ident)
    G.uniformMatrix4fv(G.getUniformLocation(mainShader, 'u_vp'), false, vp)
    G.uniform3fv(G.getUniformLocation(mainShader, 'u_ballPos'), state.pos)
    bindTextureUniforms(mainShader)
    modelGeoDraw(worldGetGeo(), mainShader)

    // Skybox
    G.disable(gl.CULL_FACE)
    G.useProgram(skyShader)
    G.uniformMatrix4fv(G.getUniformLocation(skyShader, 'u_mvp'), false, m4Mul(projectionMat, lookMat))
    modelGeoDraw(skyboxGeo, skyShader)
    G.enable(gl.CULL_FACE)

    // Aim line
    if ((state.mode == GameMode.FirstAim || state.mode == GameMode.LaterAim) && drawCannon) {
        let [predicted, pos] = predictShot(lazyYaw, lazyPitch, state.pos, state.castlesHit)
        ballPos = pos
        G.bindBuffer(gl.ARRAY_BUFFER, drawRayVertex)
        G.bufferSubData(gl.ARRAY_BUFFER, 0, predicted)

        G.useProgram(aimRayShader)
        G.uniformMatrix4fv(G.getUniformLocation(aimRayShader, 'u_model'), false, m4Ident)
        G.uniformMatrix4fv(G.getUniformLocation(aimRayShader, 'u_vp'), false, vp)
        G.bindBuffer(gl.ARRAY_BUFFER, drawRayVertex)
        let pposLoc = G.getAttribLocation(aimRayShader, 'a_position')
        G.enableVertexAttribArray(pposLoc)
        G.vertexAttribPointer(pposLoc, 3, gl.FLOAT, false, 0, 0)
        G.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, drawRayIndex)
        G.drawElements(gl.LINES, 2 * k_aimSteps, gl.UNSIGNED_SHORT, 0)

        drawBall(vp, aimRayShader, [0,1,.1])
    }

    // UI draw
    if (state.mode == GameMode.Menu || state.mode == GameMode.FirstAim) {
        fade = Math.min((modeT/1000)**2,1)
    } else if (state.mode == GameMode.Dead || state.mode == GameMode.Win) {
        fade = 1-Math.min((modeT/1000)**2,1)
    } else {
        fade = 1
    }
    let newhash = `${state.castlesHit.length}.${state.ammo}.${state.mode}`

    if (newhash != uihash) {
        ctx.clearRect(0, 0, C2.width, C2.height)
        ctx.strokeStyle='#e56b70'
        ctx.fillStyle='#ffdb63'
        ctx.textAlign = 'center'
        if (state.mode == GameMode.Menu) {
            ctx.font='bold 64px sans-serif'
            ctx.lineWidth=3
            drawText("CANNONBOLF", C2.width/2, 200)
            ctx.font='bold 16px sans-serif'
            ctx.lineWidth=.5
            drawText("CLICK TO START", C2.width/2, C2.height - 100)
        } else if (state.mode == GameMode.Dead || state.mode == GameMode.Win) {
            ctx.font='bold 32px sans-serif'
            ctx.lineWidth=2
            drawText(state.mode == GameMode.Dead ? "SORRY, TRY AGAIN!" : state.level < lastLevel ? ( state.ammo > 0 ? "BIRDIE!" : "PAR!" ) : "THANKS FOR PLAYING!", C2.width/2, C2.height/2)
        } else {
            ctx.font='bold 32px sans-serif'
            ctx.lineWidth=2
            ctx.textAlign='right'
            drawText(state.ammo+" ⚫", C2.width -20, C2.height -25-2*40)
            drawText(`${state.castlesHit.length}/${worldGetCastles().length} 🏰`, C2.width -20, C2.height -25-40)
            drawText(`${state.level+1}/${lastLevel+1} ⛳`, C2.width -20, C2.height -25)
            ctx.textAlign='center'
            ctx.font='bold 16px sans-serif'
            ctx.lineWidth=.5
            drawText(hints[state.level], C2.width/2, C2.height - 20)
        }
    }

    // UI blit
    G.disable(gl.DEPTH_TEST)
    G.useProgram(blitShader)
    G.activeTexture(gl.TEXTURE0)
    G.bindTexture(gl.TEXTURE_2D, ctxtx)
    if (newhash != uihash) {
        G.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, C2)
    }
    G.uniform1i(G.getUniformLocation(blitShader, 'u_tex'), 0)
    G.uniform4f(G.getUniformLocation(blitShader, 'u_info'), C2.width, C2.height, fade, ~~(state.mode == GameMode.Win && state.level == lastLevel))
    let posLoc = G.getAttribLocation(blitShader, 'a_position')
    G.bindBuffer(gl.ARRAY_BUFFER, blitTriBuffer)
    G.enableVertexAttribArray(posLoc)
    G.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)
    G.drawArrays(gl.TRIANGLES, 0, 6)
    G.enable(gl.DEPTH_TEST)

    uihash = newhash
}

let drawText = (txt: string, x: number, y: number): void => {
    ctx.fillText(txt, x, y)
    ctx.strokeText(txt, x, y)
}

let drawBall = (vp: Mat4, shader: WebGLProgram, color: Vec3|0): void => {
    let modelMat = m4Mul(m4Mul(m4Translate(ballPos), m4Scale(0.2)), ballRot)
    G.useProgram(shader)
    G.uniformMatrix4fv(G.getUniformLocation(shader, 'u_model'), false, modelMat)
    G.uniformMatrix4fv(G.getUniformLocation(shader, 'u_vp'), false, vp)
    if (shader == aimRayShader) {
        G.uniform3fv(G.getUniformLocation(shader, 'u_color'), color as any)
    } else {
        bindTextureUniforms(shader)
    }
    modelGeoDraw(playerGeo, shader)
}
