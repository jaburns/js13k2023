import { csgSolidBake, csgSolidCube, csgSolidOpSubtract, SdfFunction } from "./csg"
import { ModelGeo, modelGeoCreate } from "./geo"

let worldGeo: ModelGeo
let worldFn: SdfFunction

let mesh0 = csgSolidCube([0,0,0], [1,1,1])
let mesh1 = csgSolidCube([0.5,1,1], [1,1,1])
let [idx, vert, sdfFn] = csgSolidBake(csgSolidOpSubtract(mesh0, mesh1))
worldGeo = modelGeoCreate(idx, vert)
worldFn = sdfFn

export let worldGetGeo = (): ModelGeo => worldGeo
export let worldGetFn = (): SdfFunction => worldFn
