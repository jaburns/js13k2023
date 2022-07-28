import { InputsFrame } from "./inputs"
import { lerp, m4Mul, m4MulPoint, m4RotX, m4RotY, v3Add, v3Scale, Vec3, vecLerp } from "./types"
import { worldGetFn } from "./world";

declare const k_mouseSensitivity: number;

export type GameState = {
    tick: number,
    yaw: number,
    pitch_: number,
    pos: Vec3,
    camBack: number,
}

export let gameStateNew = (): GameState => ({
    tick: 0,
    yaw: 0,
    pitch_: 0,
    pos: [0,0,0],
    camBack: 10,
})

export let gameStateLerp = (a: Readonly<GameState>, b: Readonly<GameState>, t: number): GameState => ({
    tick: lerp(a.tick, b.tick, t),
    yaw: b.yaw,
    pitch_: b.pitch_,
    pos: vecLerp(a.pos, b.pos, t),
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
    state.pos = v3Add(state.pos, v3Scale(lookVec, 0.03))

    console.log(worldGetFn()(state.pos))

    return state
}
