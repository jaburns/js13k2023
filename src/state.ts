import { InputsFrame } from "./inputs"

export type GameState = { }

export let gameStateNew = (): GameState => ({})

export let gameStateLerp = (_a: GameState, _b: GameState, _t: number): GameState => ({})

export let gameStateTick = (_state: GameState, _inputs: InputsFrame): GameState => ({})
