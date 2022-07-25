import { InputsFrame } from "./inputs"
import {lerp} from "./types"

export type GameState = {
    tick: number,
    yaw: number,
}

export let gameStateNew = (): GameState => ({
    tick: 0,
    yaw: 0,
})

export let gameStateLerp = (a: Readonly<GameState>, b: Readonly<GameState>, t: number): GameState => ({
    tick: lerp(a.tick, b.tick, t),
    yaw: b.yaw,
})

export let gameStateTick = (state: Readonly<GameState>, inputs: InputsFrame): GameState => ({
    tick: state.tick + 1,
    yaw: state.yaw + inputs.mouseAccX,
})
