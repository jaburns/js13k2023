import { InputsFrame } from "./inputs"
import { lerp, m4Mul, m4MulPoint, m4RotX, m4RotY, Null, v3Add, v3AddScale, v3Length, v3Mul, v3Normalize, v3Reflect, v3Sub, Vec3, vecLerp } from "./types"
import { worldNearestSurfacePoint } from "./world";

declare const k_mouseSensitivity: number;

export type GameState = {
    tick: number,
    yaw: number,
    pitch_: number,
    pos: Vec3,
    vel: Vec3,
    camBack: number,
}

export let gameStateNew = (): GameState => ({
    tick: 0,
    yaw: 0,
    pitch_: 0,
    pos: [0,0,0],
    vel: [0,0,0],
    camBack: 100,
})

export let gameStateLerp = (a: Readonly<GameState>, b: Readonly<GameState>, t: number): GameState => ({
    tick: lerp(a.tick, b.tick, t),
    yaw: b.yaw,
    pitch_: b.pitch_,
    pos: vecLerp(a.pos, b.pos, t),
    vel: b.vel,
    camBack: lerp(a.camBack, b.camBack, t),
})

export let gameStateTick = (prevState: Readonly<GameState>, inputs: InputsFrame): GameState => {
    let state = gameStateLerp(prevState, prevState, 0)

    state.tick += 1

    state.yaw += inputs.mouseAccX * k_mouseSensitivity
    state.pitch_ += inputs.mouseAccY * k_mouseSensitivity
    state.pitch_ = Math.max(-1.5, Math.min(1.5, state.pitch_))
    state.yaw %= 2*Math.PI

    let lookVec = m4MulPoint(m4Mul(m4RotY(state.yaw), m4RotX(-state.pitch_)), [0,0,-1])
    let strafeVec = m4MulPoint(m4RotY(state.yaw+Math.PI/2), [0,0,-1])
    let moveVec: Vec3 = [0,0,0]

    if (inputs.keysDown['W']) {
        moveVec = v3AddScale(moveVec, lookVec, 0.1)
    }
    if (inputs.keysDown['S']) {
        moveVec = v3AddScale(moveVec, lookVec, -0.1)
    }
    if (inputs.keysDown['D']) {
        moveVec = v3AddScale(moveVec, strafeVec, 0.1)
    }
    if (inputs.keysDown['A']) {
        moveVec = v3AddScale(moveVec, strafeVec, -0.1)
    }
    state.vel = v3Add(state.vel, moveVec)
    state.vel = v3Add(state.vel, [0,-0.3,0])
    state.pos = v3Add(state.pos, state.vel)

    let [nearPos, nearNorm, nearDist] = worldNearestSurfacePoint(state.pos)!
    if (nearDist < 10) {
        state.pos = v3AddScale(nearPos, nearNorm, 10)
        state.vel = v3Reflect(state.vel, nearNorm, 0, 1)
    }

    return state
}
