import { csgSolidBake, csgSolidCube, csgSolidOpSubtract, csgSolidSphere, SdfFunction } from "./csg"
import { ModelGeo } from "./csg"
import { Null, v3Add, v3Normalize, v3Scale, v3Sub, Vec3 } from "./types"

let mesh0 = csgSolidCube([0,-10,0], [100,10,100], 0)
let mesh1 = csgSolidSphere([0,0,0], 5, 1)
let [worldGeo, worldFn] = csgSolidBake(csgSolidOpSubtract(mesh0, mesh1))

let skyboxGeo = csgSolidBake(csgSolidCube([0,0,0], [1,1,1], 0))[0]
let playerGeo = csgSolidBake(csgSolidSphere([0,1,0], 1, 2))[0]

export let worldGetGeo = (): ModelGeo => worldGeo
export let worldGetSky = (): ModelGeo => skyboxGeo
export let worldGetPlayer = (): ModelGeo => playerGeo

const eps = 0.001

let worldSampleNormal = (pos: Vec3): Vec3 =>
    v3Normalize([
        worldFn(v3Add(pos,[eps,0,0])) - worldFn(v3Sub(pos,[eps,0,0])),
        worldFn(v3Add(pos,[0,eps,0])) - worldFn(v3Sub(pos,[0,eps,0])),
        worldFn(v3Add(pos,[0,0,eps])) - worldFn(v3Sub(pos,[0,0,eps]))
    ])

export let worldRaycast = (pos: Vec3, normalizedDir: Vec3, len: number): [Vec3, Vec3] | Null => {
    for (let i = 0, traveled = 0, marchPoint = pos, dist; i < 50 && traveled < len; ++i) {
        traveled += (dist = worldFn(marchPoint))
        if (dist < eps) {
            return [marchPoint, worldSampleNormal(marchPoint)]
        }
        marchPoint = v3Add(marchPoint, v3Scale(normalizedDir, dist))
    }
    return Null
}
