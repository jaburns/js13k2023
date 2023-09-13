import { clickedIn, InputsFrame } from "./inputs"
import { Bool, False, lerp, m4Mul, m4MulPoint, m4RotX, m4RotY, v3Add, v3AddScale, v3Cross, v3Dot, v3Dot2, v3Length, v3Negate, v3Normalize, v3Reflect, v3Sub, Vec3, vecLerp } from "./types"
import { lastLevel, worldGetCastles, worldNearestSurfacePoint, worldRaycast } from "./world";
import { sndCastle, sndGround, sndLose, sndShoot, sndWin, zzfxP } from "./zzfx";

declare const k_mouseSensitivity: number;
declare const k_tickMillis: number;
declare const k_ballRadius: number;
declare const k_aimSteps: number;
declare const k_gravity: number;
declare const k_power: number;
declare const k_slowDown: number;
declare const k_castleHitRadSqr: number;

export const enum GameMode {
    Menu,
    FirstAim,
    LaterAim,
    Ball,
    Dead,
    Win,
}

export type GameState = {
    mode: GameMode,
    holdingMouse: Bool,
    lockView: Bool,
    yaw: number,
    pitch: number,
    pos: Vec3,
    vel: Vec3,
    rotSpeed: number, // rads per ms
    rotAxis: Vec3,
    camBack: number,
    ammo: number,
    castlesHit: number[],
    modeTick: number,
    level: number,
    ungrounded: number,
}

export let gameStateNew = (): GameState => ({
    mode: GameMode.Menu,
    holdingMouse: False,
    lockView: False,
    yaw: Math.PI,
    pitch: 0,
    pos: [0,0,0],
    vel: [0,0,0],
    rotSpeed: 0,
    rotAxis: [0,0,0],
    camBack: 100,
    ammo: 3,
    castlesHit: [],
    modeTick: 0,
    level: 0,
    ungrounded: 0,
})

export let gameStateLerp = (a: Readonly<GameState>, b: Readonly<GameState>, t: number): GameState => ({
    mode: b.mode,
    holdingMouse: b.holdingMouse,
    lockView: b.lockView,
    yaw: b.yaw,
    pitch: b.pitch,
    pos: vecLerp(a.pos, b.pos, t),
    vel: b.vel,
    rotSpeed: b.rotSpeed,
    rotAxis: b.rotAxis,
    camBack: lerp(a.camBack, b.camBack, t),
    ammo: b.ammo,
    castlesHit: b.castlesHit,
    modeTick: b.modeTick,
    level: b.level,
    ungrounded: b.ungrounded,
})

export let predictShot = (yaw: number, pitch: number, pos: Vec3, castlesHit: number[]): [Float32Array, Vec3] => {
    let lookVec = m4MulPoint(m4Mul(m4RotY(yaw), m4RotX(-pitch)), [0,0,-1])
    let ret = new Float32Array(6 * k_aimSteps)
    let loopout
    let castles = worldGetCastles()

    let vel = v3AddScale([0,0,0], lookVec, k_power)
    for (let i = 0, j = 0; i < k_aimSteps; ++i) {
        ret[j++] = pos[0]
        ret[j++] = pos[1]
        ret[j++] = pos[2]
        if (!loopout) {
            vel = v3Add(vel, [0,k_gravity,0])
            pos = v3Add(pos, vel)

            let testpos = pos
            for (let i = 0; i < 2; ++i) {
                testpos = v3AddScale(testpos, vel, 0.5)
                for (let i = 0; i < castles.length; ++i) {
                    if (castlesHit.indexOf(i) >= 0) continue
                    if (v3Dot2(v3Sub(castles[i] as any, testpos)) < k_castleHitRadSqr) {
                        loopout = 1
                    }
                }
            }

            let [nearPos, nearNorm, nearDist] = worldNearestSurfacePoint(pos)!
            if (nearDist < k_ballRadius && v3Dot(nearNorm, vel) < 0) {
                pos = v3AddScale(nearPos, nearNorm, k_ballRadius)
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
    state.modeTick++
    state.ungrounded++

    if (state.mode != GameMode.Menu && state.mode != GameMode.Dead && state.mode != GameMode.Win) {
        state.lockView = (inputs.keysDown[2] && (state.mode == GameMode.FirstAim || state.mode == GameMode.LaterAim)) as any
        state.yaw += inputs.mouseAccX * k_mouseSensitivity
        state.pitch += inputs.mouseAccY * k_mouseSensitivity
        state.pitch = Math.max(-1.5, Math.min(1.5, state.pitch))
        if (state.yaw < 0) state.yaw += 2*Math.PI
        if (state.yaw > 2*Math.PI) state.yaw -= 2*Math.PI
    }

    let lookVec = m4MulPoint(m4Mul(m4RotY(state.yaw), m4RotX(-state.pitch)), [0,0,-1])
    let click = !state.holdingMouse && inputs.keysDown[0]
    state.holdingMouse = inputs.keysDown[0]

    let castles = worldGetCastles()

    if (state.mode == GameMode.Menu) {
        if (clickedIn.a) {
            zzfxP(sndWin)
            state.mode = GameMode.LaterAim
        }
    } else if (state.mode == GameMode.FirstAim || state.mode == GameMode.LaterAim) {
        state.vel = v3AddScale(state.vel, [0,k_gravity,0], k_slowDown)

        let testpos = state.pos
        for (let i = 0; i < 10; ++i) {
            testpos = v3AddScale(testpos, state.vel, 0.1)
            for (let i = 0; i < castles.length; ++i) {
                if (state.castlesHit.indexOf(i) >= 0) continue
                if (v3Dot2(v3Sub(castles[i] as any, testpos)) < k_castleHitRadSqr) {
                    zzfxP(sndCastle)
                    state.castlesHit.push(i)
                }
            }
        }
        if (state.castlesHit.length == castles.length) {
            state.modeTick = 0
            state.mode = GameMode.Win
        }

        if (click && state.ammo > 0) {
            zzfxP(sndShoot)
            state.ammo -= 1
            state.mode = GameMode.Ball
            state.vel = v3AddScale([0,0,0], lookVec, k_power)
            state.rotSpeed = 0
        }

        state.pos = v3AddScale(state.pos, state.vel, k_slowDown)

        let [nearPos, nearNorm, nearDist] = worldNearestSurfacePoint(state.pos)!
        if (nearDist < k_ballRadius && v3Dot(nearNorm, state.vel) < 0) {
            state.pos = v3AddScale(nearPos, nearNorm, k_ballRadius)
            state.vel = v3Reflect(state.vel, nearNorm, 0.8, 0.8)
        }

    } else if (state.mode == GameMode.Ball || state.mode == GameMode.Dead || state.mode == GameMode.Win) {
        state.vel = v3Add(state.vel, [0,k_gravity,0])

        if (state.mode == GameMode.Ball) {
            let testpos = state.pos
            for (let i = 0; i < 10; ++i) {
                testpos = v3AddScale(testpos, state.vel, 0.1)
                for (let i = 0; i < castles.length; ++i) {
                    if (state.castlesHit.indexOf(i) >= 0) continue
                    if (v3Dot2(v3Sub(castles[i] as any, testpos)) < k_castleHitRadSqr) {
                        zzfxP(sndCastle)
                        state.castlesHit.push(i)
                    }
                }
            }
            if (state.castlesHit.length == castles.length) {
                state.modeTick = 0
                state.mode = GameMode.Win
            }
            if (click) {
                state.modeTick = 0
                state.mode = state.ammo > 0
                    ? GameMode.LaterAim
                    : GameMode.Dead
            }
        } else {
            if (state.modeTick > 30) {
                if (state.mode == GameMode.Win) {
                    if (state.level < lastLevel) {
                        zzfxP(sndWin)
                        let level = state.level + 1
                        state = gameStateNew()
                        state.mode = GameMode.FirstAim
                        state.level = level
                    }
                } else {
                    zzfxP(sndLose)
                    let level = state.level
                    state = gameStateNew()
                    state.mode = GameMode.FirstAim
                    state.level = level
                }
            }
        }
        state.pos = v3Add(state.pos, state.vel)

        let [nearPos, nearNorm, nearDist] = worldNearestSurfacePoint(state.pos)!
        if (nearDist < k_ballRadius && v3Dot(nearNorm, state.vel) < 0) {
            if (state.ungrounded > 10) {
                zzfxP(sndGround)
            }
            state.ungrounded = 0
            state.pos = v3AddScale(nearPos, nearNorm, k_ballRadius)
            state.vel = v3Reflect(state.vel, nearNorm, 0.2, 0.998)
            state.rotSpeed = v3Length(state.vel) / k_ballRadius / k_tickMillis
            state.rotAxis = v3Negate(v3Normalize(v3Cross(state.vel, nearNorm)))
        }
    }

    state.camBack = lerp(state.camBack, worldRaycast(state.pos, v3Negate(lookVec), 100), 0.5)

    return state
}
