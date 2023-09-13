import { Bool, False, True } from "./types"
import { playMusic } from './soundbox-player.js'

declare const CC: HTMLCanvasElement
declare const DEBUG: boolean
declare const EDITOR: boolean

export interface InputsFrame {
    mouseAccX: number
    mouseAccY: number
    mousePosX?: number,
    mousePosY?: number,
    keysDown: Record<string, Bool>,
}

export let inputsNew = (): InputsFrame => (EDITOR ? {
    mouseAccX: 0,
    mouseAccY: 0,
    mousePosX: 0,
    mousePosY: 0,
    keysDown: {},
} : {
    mouseAccX: 0,
    mouseAccY: 0,
    keysDown: {},
})

let frame: InputsFrame = inputsNew()

export let clickedIn: {a?:number} = {};
let lastMouseDx = 0
let lastMouseDy = 0

document.onmousemove = (e: MouseEvent): void => {
    let dx = e.movementX, dy = e.movementY
    if ((dx*dx < 10000 || dx * lastMouseDx < 0) && (dy*dy < 10000 || dy * lastMouseDy < 0)) {
        frame.mouseAccX += lastMouseDx = dx
        frame.mouseAccY += lastMouseDy = dy
    }
    if (EDITOR) {
        frame.mousePosX = e.pageX
        frame.mousePosY = e.pageY
    }
}

document.onmousedown = (e: MouseEvent) => {
    if (!EDITOR && document.pointerLockElement !== CC) {
        clickedIn.a=1
        playMusic()
        CC.requestPointerLock()
    } else {
        frame.keysDown[e.button] = True
    }
}

document.onmouseup = (e: MouseEvent) => {
    frame.keysDown[e.button] = False
}

document.onkeydown = (e: KeyboardEvent) => {
    frame.keysDown[e.code[3]] = True
    return DEBUG
}

document.onkeyup = (e: KeyboardEvent) => {
    frame.keysDown[e.code[3]] = False
}

export let inputsConsumeFrame = (): InputsFrame => {
    let outFrame = frame
    frame = inputsNew()
    inputsAdd(frame, outFrame)
    frame.mouseAccX = frame.mouseAccY = 0
    return EDITOR || document.pointerLockElement == CC ? outFrame : inputsNew()
}

export let inputsAdd = (me: InputsFrame, other: InputsFrame): void => {
    for (let k in other.keysDown) {
        (me.keysDown as any)[k] |= (other.keysDown as any)[k]
    }
    me.mouseAccX += other.mouseAccX
    me.mouseAccY += other.mouseAccY
    if (EDITOR) {
        me.mousePosX = other.mousePosX
        me.mousePosY = other.mousePosY
    }
}

