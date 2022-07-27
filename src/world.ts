import { csgSolidBake, csgSolidCube, csgSolidOpSubtract, csgSolidSphere, SdfFunction } from "./csg"
import { ModelGeo } from "./csg"

let mesh0 = csgSolidCube([0,-10,0], [100,10,100], 0)
let mesh1 = csgSolidSphere([0,0,0], 5, 1)
let [worldGeo, worldFn] = csgSolidBake(csgSolidOpSubtract(mesh0, mesh1))

let skyboxGeo = csgSolidBake(csgSolidCube([0,0,0], [1,1,1], 0))[0]
let playerGeo = csgSolidBake(csgSolidSphere([0,1,0], 1, 2))[0]

export let worldGetGeo = (): ModelGeo => worldGeo
export let worldGetSky = (): ModelGeo => skyboxGeo
export let worldGetPlayer = (): ModelGeo => playerGeo
export let worldGetFn = (): SdfFunction => worldFn
