import { csgSolidBake, csgSolidCube, csgSolidOpSubtract, SdfFunction } from "./csg"
import { ModelGeo, modelGeoCreate } from "./geo"

let worldGeo: ModelGeo
let worldFn: SdfFunction

let mesh0 = csgSolidCube([0,-1,0], [10,1,10])
let mesh1 = csgSolidCube([0.5,0,1], [1,1,1])
let [idx, vert, norm, sdfFn] = csgSolidBake(csgSolidOpSubtract(mesh0, mesh1))
worldGeo = modelGeoCreate(idx, vert, norm)
worldFn = sdfFn

export let worldGetGeo = (): ModelGeo => worldGeo
export let worldGetFn = (): SdfFunction => worldFn
