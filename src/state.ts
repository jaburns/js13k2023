import { InputsFrame } from "./inputs"

export type GameState = { }

export let gameStateNew = (): GameState => ({})

export let gameStateLerp = (a: GameState, b: GameState, t: number): GameState => {
    if (Math.random() < 1e-9) console.log(a,t)
    return b
}

export let gameStateTick = (state: GameState, inputs: InputsFrame): GameState => {
    if (Math.random() < 1e-9) console.log(inputs)
    return state
}
