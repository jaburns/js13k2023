import { InputsFrame } from "./inputs"
import { Bool, False, lerp, m4Mul, m4MulPoint, m4RotX, m4RotY, True, v3Add, v3AddScale, v3Cross, v3Dot, v3Length, v3Negate, v3Normalize, v3Reflect, Vec3, vecLerp } from "./types"
import { worldNearestSurfacePoint, worldRaycast } from "./world";

declare const k_mouseSensitivity: number;
declare const k_tickMillis: number;
declare const k_aimSteps: number;

export type GameState = {
    ballMode: Bool,
    holdingMouse: Bool,
    yaw: number,
    pitch: number,
    pos: Vec3,
    vel: Vec3,
    rotSpeed: number, // rads per ms
    rotAxis: Vec3,
    camBack: number,
}

export let gameStateNew = (): GameState => ({
    ballMode: False,
    holdingMouse: False,
    yaw: 0,
    pitch: 0,
    pos: [0,0,0],
    vel: [0,0,0],
    rotSpeed: 0,
    rotAxis: [0,0,0],
    camBack: 100,
})

export let gameStateLerp = (a: Readonly<GameState>, b: Readonly<GameState>, t: number): GameState => ({
    ballMode: b.ballMode,
    holdingMouse: b.holdingMouse,
    yaw: b.yaw,
    pitch: b.pitch,
    pos: vecLerp(a.pos, b.pos, t),
    vel: b.vel,
    rotSpeed: b.rotSpeed,
    rotAxis: b.rotAxis,
    camBack: lerp(a.camBack, b.camBack, t),
})

const BALL_RADIUS: number = 10

export let predictShot = (yaw: number, pitch: number, pos: Vec3): [Float32Array, Vec3] => {
    let lookVec = m4MulPoint(m4Mul(m4RotY(yaw), m4RotX(-pitch)), [0,0,-1])
    let ret = new Float32Array(6 * k_aimSteps)
    let loopout

    let vel = v3AddScale([0,0,0], lookVec, 30)
    for (let i = 0, j = 0; i < k_aimSteps; ++i) {
        ret[j++] = pos[0]
        ret[j++] = pos[1]
        ret[j++] = pos[2]
        if (!loopout) {
            vel = v3Add(vel, [0,-0.6,0])
            pos = v3Add(pos, vel)
            let [nearPos, nearNorm, nearDist] = worldNearestSurfacePoint(pos)!
            if (nearDist < BALL_RADIUS && v3Dot(nearNorm, vel) < 0) {
                pos = v3AddScale(nearPos, nearNorm, BALL_RADIUS)
                loopout = 1
            }
        }
        ret[j++] = pos[0]
        ret[j++] = pos[1]
        ret[j++] = pos[2]
    }
    return [ret, pos]
}

export let gameStateTick = (prevState: Readonly<GameState>, inputs: InputsFrame): GameState => {
    let state = gameStateLerp(prevState, prevState, 0)

    state.yaw += inputs.mouseAccX * k_mouseSensitivity
    state.pitch += inputs.mouseAccY * k_mouseSensitivity
    state.pitch = Math.max(-1.5, Math.min(1.5, state.pitch))
    if (state.yaw < 0) state.yaw += 2*Math.PI
    if (state.yaw > 2*Math.PI) state.yaw -= 2*Math.PI

    let lookVec = m4MulPoint(m4Mul(m4RotY(state.yaw), m4RotX(-state.pitch)), [0,0,-1])
    let click = !state.holdingMouse && inputs.keysDown[0]
    state.holdingMouse = inputs.keysDown[0]

    if (!state.ballMode) {
        if (click) {
            state.ballMode = True
            state.vel = v3AddScale([0,0,0], lookVec, 30)
            state.rotSpeed = 0
        }
        return state;
    }

    if (click) {
        state.ballMode = False
    }

    state.vel = v3Add(state.vel, [0,-0.6,0])
    state.pos = v3Add(state.pos, state.vel)

    let [nearPos, nearNorm, nearDist] = worldNearestSurfacePoint(state.pos)!
    if (nearDist < BALL_RADIUS && v3Dot(nearNorm, state.vel) < 0) {
        state.pos = v3AddScale(nearPos, nearNorm, BALL_RADIUS)
        state.vel = v3Reflect(state.vel, nearNorm, 0.3, 0.995)
        state.rotSpeed = v3Length(state.vel) / BALL_RADIUS / k_tickMillis
        state.rotAxis = v3Negate(v3Normalize(v3Cross(state.vel, nearNorm)))
    }

    state.camBack = lerp(state.camBack, worldRaycast(state.pos, v3Negate(lookVec), 100), 0.5)

    return state
}
