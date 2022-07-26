import { csgSolidBake, csgSolidCube, csgSolidOpSubtract, SdfFunction } from "./csg"
import { ModelGeo, modelGeoCreate } from "./geo"

let worldGeo: ModelGeo
let worldFn: SdfFunction
let skyboxGeo: ModelGeo

{
    let mesh0 = csgSolidCube([0,-1,0], [10,1,10], 0)
    let mesh1 = csgSolidCube([0.5,0,1], [1,1,1], 1)
    let [idx, vert, norm, uvTags, sdfFn] = csgSolidBake(csgSolidOpSubtract(mesh0, mesh1))
    worldGeo = modelGeoCreate(idx, vert, norm, uvTags)
    worldFn = sdfFn
}
{
    let skymesh = csgSolidCube([0,0,0], [1,1,1], 0)
    let [idx, vert, norm, uvTags] = csgSolidBake(skymesh)
    skyboxGeo = modelGeoCreate(idx, vert, norm, uvTags)
}

export let worldGetGeo = (): ModelGeo => worldGeo
export let worldGetSky = (): ModelGeo => skyboxGeo
export let worldGetFn = (): SdfFunction => worldFn
