import { InputsFrame } from "./inputs"
import { Bool, False, lerp, m4Mul, m4MulPoint, m4RotX, m4RotY, True, v3Add, v3AddScale, v3Cross, v3Length, v3Negate, v3Normalize, v3Reflect, Vec3, vecLerp } from "./types"
import { worldNearestSurfacePoint, worldRaycast } from "./world";

declare const k_mouseSensitivity: number;
declare const k_tickMillis: number;

export type GameState = {
    ballMode: Bool,
    holdingMouse: Bool,
    tick: number,
    yaw: number,
    pitch: number,
    pos: Vec3,
    vel: Vec3,
    rotSpeed: number, // rads per ms
    rotAxis: Vec3,
    camBack: number,
    grounded: number,
}

export let gameStateNew = (): GameState => ({
    ballMode: False,
    holdingMouse: False,
    tick: 0,
    yaw: 0,
    pitch: 0,
    pos: [0,0,0],
    vel: [0,0,0],
    rotSpeed: 0,
    rotAxis: [0,0,0],
    camBack: 100,
    grounded: 0,
})

export let gameStateLerp = (a: Readonly<GameState>, b: Readonly<GameState>, t: number): GameState => ({
    ballMode: b.ballMode,
    holdingMouse: b.holdingMouse,
    tick: lerp(a.tick, b.tick, t),
    yaw: b.yaw,
    pitch: b.pitch,
    pos: vecLerp(a.pos, b.pos, t),
    vel: b.vel,
    rotSpeed: b.rotSpeed,
    rotAxis: b.rotAxis,
    camBack: lerp(a.camBack, b.camBack, t),
    grounded: b.grounded,
})

const BALL_RADIUS: number = 10

export let gameStateTick = (prevState: Readonly<GameState>, inputs: InputsFrame): GameState => {
    let state = gameStateLerp(prevState, prevState, 0)

    state.tick += 1

    state.yaw += inputs.mouseAccX * k_mouseSensitivity
    state.pitch += inputs.mouseAccY * k_mouseSensitivity
    state.pitch = Math.max(-1.5, Math.min(1.5, state.pitch))
    state.yaw %= 2*Math.PI

    let lookVec = m4MulPoint(m4Mul(m4RotY(state.yaw), m4RotX(-state.pitch)), [0,0,-1])
    let click = !state.holdingMouse && inputs.keysDown[0]
    state.holdingMouse = inputs.keysDown[0]

    if (!state.ballMode) {
        if (click) {
            state.ballMode = True
            state.vel = v3AddScale([0,0,0], lookVec, 30)
        }
        return state;
    }

    if (click) {
        state.ballMode = False
    }

    state.vel = v3Add(state.vel, [0,-0.6,0])
    state.pos = v3Add(state.pos, state.vel)

    let [nearPos, nearNorm, nearDist] = worldNearestSurfacePoint(state.pos)!
    if (nearDist < BALL_RADIUS) {
        state.pos = v3AddScale(nearPos, nearNorm, BALL_RADIUS)
        state.vel = v3Reflect(state.vel, nearNorm, 0, 1)
        state.rotSpeed = v3Length(state.vel) / BALL_RADIUS / k_tickMillis
        state.rotAxis = v3Negate(v3Cross(v3Normalize(state.vel), nearNorm))
        state.grounded = 10
    } else if (state.grounded > 0) {
        state.grounded--
    }

    state.camBack = lerp(state.camBack, worldRaycast(state.pos, v3Negate(lookVec), 100), 0.5)

    return state
}
