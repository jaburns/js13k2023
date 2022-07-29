import { CsgSolid, csgSolidBake, csgSolidCube, csgSolidOpSubtract, csgSolidOpUnion, csgSolidSphere, modelGeoDelete } from "./csg"
import { ModelGeo } from "./csg"
import { Null, v3Add, v3AddScale, v3Normalize, v3Sub, Vec3 } from "./types"

// ------------------------------------------------------------------------------------

let [worldGeo,worldFn]=csgSolidBake(csgSolidOpSubtract(csgSolidOpUnion(csgSolidOpSubtract(csgSolidCube(0,0,-10,0,100,10,100,45,20,0),csgSolidSphere(1,0,30,0,40)),csgSolidCube(0,0,-30,0,100,10,100,0,0,0)),csgSolidCube(2,50,15,0,10,2,100,45,20,0)))
export let worldSourceList:[number,string[]][]=[[0,["cube","0","0","-10","0","100","10","100","45","20","0"]],[0,["sphere","1","0","30","0","40"]],[0,["sub"]],[0,["cube","0","0","-30","0","100","10","100","0","0","0"]],[0,["add"]],[0,[""]],[0,["#","Stone","path"]],[0,["cube","2","50","15","0","10","2","100","45","20","0"]],[0,["sub"]]]

// ----------------------

let skyboxGeo = csgSolidBake(csgSolidCube(0, 0,0,0, 1,1,1, 0,0,0))[0]
let playerGeo = csgSolidBake(csgSolidSphere(2, 0,10,0, 10))[0]

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
        marchPoint = v3AddScale(marchPoint, normalizedDir, dist)
    }
    return Null
}

// ------------------------------------------------------------------------------------
// Everything below here gets optimized away in non-editor builds

export let evaluateNewWorld = (sourceList: [number,string[]][]): string => {
    let justCommands = sourceList
        .map(x => x[1])
        .filter(x => x.length > 0 && !x[0].startsWith('#') && x[0] !== '')
    console.log( `return fn(${JSON.stringify(justCommands)})`)
    let asJs = new Function('fn', `return fn(${JSON.stringify(justCommands)})`)(doEvalNewWorld)
    return asJs + '\nexport let worldSourceList:[number,string[]][]='+JSON.stringify(sourceList)+'\n'
}

type WorldDefSolid =
    ['cube',   number, number,number,number, number,number,number, number,number,number ]
  | ['sphere', number, number,number,number, number ]
type WorldDefOp = ['add'] | ['sub']
type WorldDefItem = WorldDefSolid | WorldDefOp
type WorldDef = WorldDefItem[]

let evaluateWorldDefSolid = (def: WorldDefSolid): [CsgSolid, string] => {
    let result = (name: string, fn: Function): [CsgSolid, string] => [
        fn(...def.slice(1).map((x: any) => parseInt(x))),
        `${name}(${def.slice(1).map((x: any) => parseInt(x))})`
    ]
    switch (def[0]) {
        case 'cube': return result('csgSolidCube', csgSolidCube)
        case 'sphere': return result('csgSolidSphere', csgSolidSphere)
        default: throw new Error()
    }
}

let worldDefItemIsSolid = (def: WorldDefItem): boolean =>
    def[0] === 'cube' || def[0] === 'sphere'

let evaluateWorldDefOp = (def: WorldDefOp, solidA: [CsgSolid, string], solidB: [CsgSolid, string]): [CsgSolid, string] => {
    let result = (name: string, fn: Function): [CsgSolid, string] => [
        fn(solidA[0], solidB[0]),
        `${name}(${solidA[1]},${solidB[1]})`
    ]
    switch (def[0]) {
        case 'add': return result('csgSolidOpUnion', csgSolidOpUnion)
        case 'sub': return result('csgSolidOpSubtract', csgSolidOpSubtract)
        default: throw new Error()
    }
}

let doEvalNewWorld = (worldDef: WorldDef): string => {
    worldDef = worldDef.slice()
    modelGeoDelete(worldGeo)
    worldGeo = null as any
    worldFn = null as any

    let stack = [evaluateWorldDefSolid(worldDef.shift() as WorldDefSolid)]

    while (worldDef.length > 0) {
        let item = worldDef.shift()!
        if (worldDefItemIsSolid(item)) {
            stack.push(evaluateWorldDefSolid(item as WorldDefSolid))
        } else {
            let b = stack.pop()!
            let a = stack.pop()!
            stack.push(evaluateWorldDefOp(item as WorldDefOp, a, b))
        }
    }

    let [solid, js] = stack.pop()!
    ;[worldGeo, worldFn] = csgSolidBake(solid)
    return `let [worldGeo,worldFn]=csgSolidBake(${js})`
}
