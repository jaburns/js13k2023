import { inputsAdd, inputsConsumeFrame, inputsNew } from './inputs'
import { renderGame } from './render'
import { gameStateLerp, gameStateNew, gameStateTick } from './state'
import { False, True } from './types'
import { sndOllie, zzfxP } from './zzfx'

declare const CC: HTMLCanvasElement
declare const G: WebGLRenderingContext
declare const k_tickMillis: number
declare const k_pixelSize: number

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

let resize = () =>
    G.viewport(0, 0, CC.width=window.innerWidth/k_pixelSize, CC.height=window.innerHeight/k_pixelSize)

let accTime = 0
let prevNow = 0
let accTickInputs = inputsNew()

let frame = () => {
    requestAnimationFrame(frame)

    let newNow = performance.now()
    if (!prevNow) prevNow = newNow
    let dt = Math.min (newNow - prevNow, 1000)
    let frameInputs = inputsConsumeFrame()
    let didRunTick = False

    accTime += dt
    prevNow = newNow

    inputsAdd(accTickInputs, frameInputs)

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

    renderGame(accTickInputs, gameStateLerp(prevState, curState, accTime / k_tickMillis))

    if (Math.random() < 0.01) {
        zzfxP(sndOllie)
    }
}

window.onresize = resize

resize()
frame()
