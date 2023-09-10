import { CsgSolid, csgSolidBake, csgSolidBox, csgSolidLine, csgSolidOpSubtract, csgSolidOpUnion, modelGeoDelete } from "./csg"
import { ModelGeo } from "./csg"
import { v3Add, v3AddScale, v3Dot2, v3Length, v3Normalize, v3Sub, Vec3 } from "./types"

// ------------------------------------------------------------------------------------

let [worldGeo,worldFn]=csgSolidBake(csgSolidOpSubtract(csgSolidOpUnion(csgSolidOpSubtract(csgSolidOpSubtract(csgSolidBox(0,0,-1000,0,10000,1000,10000,0,0,0,0),csgSolidBox(1,0,200,0,1830,220,1120,0,0,0,200)),csgSolidBox(2,-1930,200,0,700,300,240,0,0,0,200)),csgSolidBox(1,-2690,-140,0,860,190,130,0,0,-10,0)),csgSolidLine(2,2110,0,-1800,2000,800,400,45,90,0)))
export let worldSourceList:[number,string[]][]=[[0,["box","0","0","-1000","0","10000","1000","10000","0","0","0","0"]],[0,["box","1","0","200","0","1830","220","1120","0","0","0","200"]],[0,["sub"]],[0,["box","2","-1930","200","00","700","300","240","0","0","0","200"]],[0,["sub"]],[0,["box","1","-2690","-140","0","860","190","130","0","0","-10","0"]],[0,["add"]],[0,["line","2","2110","0","-1800","2000","800","400","45","90","0"]],[0,["sub"]]]

let [cannonGeo,_]=csgSolidBake(csgSolidOpSubtract(csgSolidOpSubtract(csgSolidOpUnion(csgSolidOpSubtract(csgSolidOpSubtract(csgSolidOpSubtract(csgSolidLine(1,100,0,0,200,20,20,90,90,0),csgSolidBox(1,0,0,0,15,50,50,0,0,0,0)),csgSolidBox(1,71,0,0,52,50,50,0,0,0,0)),csgSolidBox(1,-71,0,0,52,50,50,0,0,0,0)),csgSolidLine(1,0,0,0,40,19,12,0,-90,0)),csgSolidBox(1,0,0,-90,50,50,50,0,0,0,0)),csgSolidLine(3,0,0,0,40,10,10,0,-90,0)))
//export let worldSourceList:[number,string[]][]=[[0,["line","1","100","0","0","200","20","20","90","90","0"]],[0,["box","1","0","0","0","15","50","50","0","0","0","0"]],[0,["sub"]],[0,["box","1","71","0","0","52","50","50","0","0","0","0"]],[0,["sub"]],[0,["box","1","-71","0","0","52","50","50","0","0","0","0"]],[0,["sub"]],[0,["line","1","0","0","0","40","19","12","0","-90","0"]],[0,["add"]],[0,["box","1","0","0","-90","50","50","50","0","0","0","0"]],[0,["sub"]],[0,["line","3","0","0","0","40","10","10","0","-90","0"]],[0,["sub"]],[0,[""]]]

// ----------------------

let skyboxGeo = csgSolidBake(csgSolidBox(0, 0,0,0, 1,1,1, 0,0,0,  0))[0]
let playerGeo = csgSolidBake(csgSolidBox(3, 0,0,0, 0,0,0, 0,0,0, 50))[0]

export let worldGetGeo = (): ModelGeo => worldGeo
export let worldGetSky = (): ModelGeo => skyboxGeo
export let worldGetPlayer = (): ModelGeo => playerGeo
export let worldGetCannon = (): ModelGeo => cannonGeo

const eps = 0.001

let worldSampleNormal = (pos: Vec3): Vec3 =>
    v3Normalize([
        worldFn(v3Add(pos,[eps,0,0])) - worldFn(v3Sub(pos,[eps,0,0])),
        worldFn(v3Add(pos,[0,eps,0])) - worldFn(v3Sub(pos,[0,eps,0])),
        worldFn(v3Add(pos,[0,0,eps])) - worldFn(v3Sub(pos,[0,0,eps]))
    ])

export let worldNearestSurfacePoint = (pos: Vec3): [Vec3, Vec3, number] | undefined => {
    for (let i = 0, marchPoint = pos, dist, norm; i < 50; ++i) {
        dist = worldFn(marchPoint)
        norm = worldSampleNormal(marchPoint)
        if (dist < eps) {
            dist = v3Sub(pos, marchPoint)
            return [marchPoint, v3Dot2(dist) < eps ? norm : v3Normalize(dist), v3Length(dist)]
        }
        marchPoint = v3AddScale(marchPoint, norm, -dist)
    }
    return undefined
}

export let worldRaycast = (pos: Vec3, normalizedDir: Vec3, len: number): number  => {
    let i = 0, traveled = 0, marchPoint = pos, dist
    for (; i < 50 && traveled < len; ++i) {
        traveled += (dist = worldFn(marchPoint))
        if (dist < eps) {
            return traveled
        }
        marchPoint = v3AddScale(marchPoint, normalizedDir, dist)
    }
    return len
}

// ------------------------------------------------------------------------------------
// Everything below here gets optimized away in non-editor builds

export let evaluateNewWorld = (sourceList: [number,string[]][]): string => {
    let justCommands = sourceList
        .map(x => x[1])
        .filter(x => x.length > 0 && !x[0].startsWith('#') && x[0] !== '')
    let asJs = new Function('fn', `return fn(${JSON.stringify(justCommands)})`)(doEvalNewWorld)
    return asJs + '\nexport let worldSourceList:[number,string[]][]='+JSON.stringify(sourceList)+'\n'
}

type WorldDefSolid =
    ['box',   number, number,number,number, number,number,number, number,number,number, number ] |
    ['line',  number, number,number,number, number,number,number, number,number,number ]
type WorldDefOp = ['add'] | ['sub']
type WorldDefItem = WorldDefSolid | WorldDefOp
type WorldDef = WorldDefItem[]

let evaluateWorldDefSolid = (def: WorldDefSolid): [CsgSolid, string] => {
    let result = (name: string, fn: Function): [CsgSolid, string] => [
        fn(...def.slice(1).map((x: any) => parseInt(x))),
        `${name}(${def.slice(1).map((x: any) => parseInt(x))})`
    ]
    switch (def[0]) {
        case 'box': return result('csgSolidBox', csgSolidBox)
        case 'line': return result('csgSolidLine', csgSolidLine)
        default: throw new Error()
    }
}

let worldDefItemIsSolid = (def: WorldDefItem): boolean =>
    def[0] === 'box' || def[0] === 'line'

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
