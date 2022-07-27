import { csgSolidBake, csgSolidCube, csgSolidOpSubtract, SdfFunction } from "./csg"
import { ModelGeo } from "./csg"

let mesh0 = csgSolidCube([0,-2,0], [10,1,10], 0)
let mesh1 = csgSolidCube([0.5,-1,1], [1,1,1], 1)
let [worldGeo, worldFn] = csgSolidBake(csgSolidOpSubtract(mesh0, mesh1))

let skyboxGeo = csgSolidBake(csgSolidCube([0,0,0], [1,1,1], 0))[0]
let playerGeo = csgSolidBake(csgSolidCube([0,1,0], [1,1,1], 0))[0]

export let worldGetGeo = (): ModelGeo => worldGeo
export let worldGetSky = (): ModelGeo => skyboxGeo
export let worldGetPlayer = (): ModelGeo => playerGeo
export let worldGetFn = (): SdfFunction => worldFn
