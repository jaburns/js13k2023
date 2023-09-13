import { editorInit, editorFrame } from './editor'
import { inputsAdd, inputsConsumeFrame, inputsNew } from './inputs'
import { renderGame, resize } from './render'
import { gameStateLerp, gameStateNew, gameStateTick } from './state'
import { False, True } from './types'
import { loadLevel, START_LEVEL } from './world'

declare const CC: HTMLCanvasElement
declare const EDITOR: boolean
declare const k_tickMillis: number

let prevState = gameStateNew()
let curState = gameStateNew()

;[document.body, CC].map((elem: HTMLElement): void => {
    let style = elem.style
    style.overflow = 'hidden'
    style.margin = 0 as any
    style.width = '100%'
    style.height = '100%'
    style.cursor = 'pointer'
})

let accTime = 0
let prevNow = 0
let accTickInputs = inputsNew()

let frame = (now: number) => {
    requestAnimationFrame(frame)
    prevNow = prevNow || now

    let dt = Math.min(now - prevNow, 1000)
    let frameInputs = inputsConsumeFrame()
    let didRunTick = False

    accTime += dt
    prevNow = now

    inputsAdd(accTickInputs, frameInputs)

    if (EDITOR) {
        editorFrame(dt, accTickInputs)
        accTickInputs = inputsNew()
        return
    }

    while (accTime > k_tickMillis) {
        didRunTick = True
        accTime -= k_tickMillis
        prevState = curState
        curState = gameStateTick(curState, accTickInputs)
        accTickInputs.mouseAccX = accTickInputs.mouseAccY = 0
    }
    if (didRunTick) {
        accTickInputs = inputsNew()
    }

    renderGame(accTickInputs, gameStateLerp(prevState, curState, accTime / k_tickMillis), dt)
}

if (EDITOR) {
    editorInit()
}


window.onresize = resize

resize()
loadLevel(START_LEVEL)
frame(0)
