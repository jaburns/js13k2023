import { CsgSolid, csgSolidBake, csgSolidBox, csgSolidLine, csgSolidOpIntersect, csgSolidOpSubtract, csgSolidOpUnion, modelGeoDelete, SdfFunction } from "./csg"
import { ModelGeo } from "./csg"
import { m4Ident, Mat4, v3Add, v3AddScale, v3Dot2, v3Length, v3Negate, v3Normalize, v3Sub, Vec3 } from "./types"

declare const k_tickMillis: number

// ------------------------------------------------------------------------------------
// Object models

export let skyboxGeo = csgSolidBake(csgSolidBox(0, 0,0,0, 1,1,1, 0,0,0,  0))[0]
export let playerGeo = csgSolidBake(csgSolidBox(3, 0,0,0, 0,0,0, 0,0,0, 50))[0]

//export let worldSourceList:[number,string[]][]=[[0,["line","1","100","0","0","200","20","20","90","90","0"]],[0,["box","1","0","0","0","15","50","50","0","0","0","0"]],[0,["sub"]],[0,["box","1","71","0","0","52","50","50","0","0","0","0"]],[0,["sub"]],[0,["box","1","-71","0","0","52","50","50","0","0","0","0"]],[0,["sub"]],[0,["line","1","0","0","0","40","19","12","0","-90","0"]],[0,["add"]],[0,["box","1","0","0","-90","50","50","50","0","0","0","0"]],[0,["sub"]],[0,["line","3","0","0","0","40","10","10","0","-90","0"]],[0,["sub"]],[0,[""]]]
export let [cannonGeo, _unused0]=csgSolidBake(csgSolidOpSubtract(csgSolidOpSubtract(csgSolidOpUnion(csgSolidOpSubtract(csgSolidOpSubtract(csgSolidOpSubtract(csgSolidLine(1,100,0,0,200,20,20,90,90,0),csgSolidBox(1,0,0,0,15,50,50,0,0,0,0)),csgSolidBox(1,71,0,0,52,50,50,0,0,0,0)),csgSolidBox(1,-71,0,0,52,50,50,0,0,0,0)),csgSolidLine(1,0,0,0,40,19,12,0,-90,0)),csgSolidBox(1,0,0,-90,50,50,50,0,0,0,0)),csgSolidLine(3,0,0,0,40,10,10,0,-90,0)))

//export let worldSourceList:[number,string[]][]=[[0,[""]],[0,["#","Main","body","and","roof"]],[0,["box","2","0","0","0","130","100","130","0","0","0","0"]],[0,["box","2","0","100","0","100","25","100","0","0","0","0"]],[0,["sub"]],[0,[""]],[0,["#","Turrets"]],[0,["line","2","100","-119","100","400","50","50","0","0","0"]],[0,["add"]],[0,["line","2","100","-120","-100","400","50","50","0","0","0"]],[0,["add"]],[0,["line","2","-100","-120","-100","400","50","50","0","0","0"]],[0,["add"]],[0,["line","2","-100","-120","100","400","50","50","0","0","0"]],[0,["add"]],[0,[""]],[0,["#","Chop","the","bottom","off"]],[0,["box","2","0","-150","0","200","100","200","0","0","0","0"]],[0,["sub"]],[0,[""]],[0,["#","Turret","interior"]],[0,["line","2","100","-120","100","340","40","40","0","0","0"]],[0,["box","2","100","-50","100","50","170","50","0","0","0","0"]],[0,["sub"]],[0,["sub"]],[0,["line","2","100","0","-100","340","40","40","0","0","0"]],[0,["box","2","100","-50","-100","50","170","50","0","0","0","0"]],[0,["sub"]],[0,["sub"]],[0,["line","2","-100","-120","-100","340","40","40","0","0","0"]],[0,["box","2","-100","-50","-100","50","170","50","0","0","0","0"]],[0,["sub"]],[0,["sub"]],[0,["line","2","-100","-120","100","340","40","40","0","0","0"]],[0,["box","2","-100","-50","100","50","170","50","0","0","0","0"]],[0,["sub"]],[0,["sub"]],[0,[""]],[0,["#","Chop","the","top","off"]],[0,["box","2","0","250","0","200","100","200","0","0","0","0"]],[0,["sub"]],[0,[""]],[0,["#","Cut","doors","and","interior"]],[0,["box","2","0","-75","0","1","50","200","0","0","0","30"]],[0,["sub"]],[0,["box","2","0","-75","0","1","50","200","90","0","0","30"]],[0,["sub"]],[0,["box","2","0","-30","0","100","100","100","0","0","0","0"]],[0,["sub"]],[0,[""]],[0,["#","Turret","notches"]],[0,["box","2","0","150","100","200","20","10","0","0","0","0"]],[0,["sub"]],[0,["box","2","0","150","-100","200","20","10","0","0","0","0"]],[0,["sub"]],[0,["box","2","100","150","0","10","20","200","0","0","0","0"]],[0,["sub"]],[0,["box","2","-100","150","0","10","20","200","0","0","0","0"]],[0,["sub"]],[0,[""]],[0,[""]]]
let castleBase = csgSolidOpSubtract(csgSolidOpSubtract(csgSolidOpSubtract(csgSolidOpSubtract(csgSolidOpSubtract(csgSolidOpSubtract(csgSolidOpSubtract(csgSolidOpSubtract(csgSolidOpSubtract(csgSolidOpSubtract(csgSolidOpSubtract(csgSolidOpSubtract(csgSolidOpSubtract(csgSolidOpUnion(csgSolidOpUnion(csgSolidOpUnion(csgSolidOpUnion(csgSolidOpSubtract(csgSolidBox(2,0,0,0,130,100,130,0,0,0,0),csgSolidBox(2,0,100,0,100,25,100,0,0,0,0)),csgSolidLine(2,100,-119,100,400,50,50,0,0,0)),csgSolidLine(2,100,-120,-100,400,50,50,0,0,0)),csgSolidLine(2,-100,-120,-100,400,50,50,0,0,0)),csgSolidLine(2,-100,-120,100,400,50,50,0,0,0)),csgSolidBox(2,0,-150,0,200,100,200,0,0,0,0)),csgSolidOpSubtract(csgSolidLine(2,100,-120,100,340,40,40,0,0,0),csgSolidBox(2,100,-50,100,50,170,50,0,0,0,0))),csgSolidOpSubtract(csgSolidLine(2,100,0,-100,340,40,40,0,0,0),csgSolidBox(2,100,-50,-100,50,170,50,0,0,0,0))),csgSolidOpSubtract(csgSolidLine(2,-100,-120,-100,340,40,40,0,0,0),csgSolidBox(2,-100,-50,-100,50,170,50,0,0,0,0))),csgSolidOpSubtract(csgSolidLine(2,-100,-120,100,340,40,40,0,0,0),csgSolidBox(2,-100,-50,100,50,170,50,0,0,0,0))),csgSolidBox(2,0,250,0,200,100,200,0,0,0,0)),csgSolidBox(2,0,-75,0,1,50,200,0,0,0,30)),csgSolidBox(2,0,-75,0,1,50,200,90,0,0,30)),csgSolidBox(2,0,-30,0,100,100,100,0,0,0,0)),csgSolidBox(2,0,150,100,200,20,10,0,0,0,0)),csgSolidBox(2,0,150,-100,200,20,10,0,0,0,0)),csgSolidBox(2,100,150,0,10,20,200,0,0,0,0)),csgSolidBox(2,-100,150,0,10,20,200,0,0,0,0))
export let [castleGeo, _unused1] = csgSolidBake(castleBase)
export let castleGibs: ModelGeo[] = Array(8)
{
    const EXPLODE_CASTLE_TEXTURE = 2
    let i = 0
    for (let x = -100; x < 150; x+=200) {
        for (let y = -50; y < 200; y+=200) {
            for (let z = -100; z < 150; z+=200) {
                let build = csgSolidBake(csgSolidOpIntersect(castleBase, csgSolidBox(
                    EXPLODE_CASTLE_TEXTURE, x, y, z, 80, 80, 80,
                    Math.random()*360,
                    Math.random()*360,
                    Math.random()*360,
                    20,
                )))
                castleGibs[i++] = build[0]
            }
        }
    }
}
export type CastleGib = {
    kind: number,
    offset: Vec3,
    pos: Vec3,
    vel: Vec3,
    axis: Vec3,
    omega: number,
    rotation: Mat4,
}
export let gibCastle = (pos: Vec3, vel: Vec3): CastleGib[] => {
    let ret: CastleGib[] = []
    let i = 0
    for (let x = -100; x < 150; x+=200) {
        for (let y = -50; y < 200; y+=200) {
            for (let z = -100; z < 150; z+=200) {
                ret.push({
                    kind: i++,
                    pos: v3AddScale(pos,[x,y,z],0.25),
                    vel: v3AddScale(v3AddScale([0,0,0],vel,0.8/k_tickMillis),[x,(y+100)/2,z],1e-3),
                    offset: v3Negate([x,y,z]),
                    axis: v3Normalize([
                        2*Math.random()-1,
                        2*Math.random()-1,
                        2*Math.random()-1,
                    ]),
                    omega: 0.01 * Math.random(),
                    rotation: m4Ident,
                })
            }
        }
    }
    return ret
}

// ------------------------------------------------------------------------------------
// World models

export let worldSourceList:[number,string[]][]=[[0,["box","0","0","-1000","0","10000","1000","10000","0","0","0","0"]],[0,["box","1","0","200","0","1830","220","1120","0","0","0","200"]],[0,["sub"]],[0,["box","2","-1930","200","00","700","300","240","0","0","0","200"]],[0,["sub"]],[0,["box","1","-2690","-140","0","860","190","130","0","0","-10","0"]],[0,["add"]],[0,["line","2","2110","0","-1800","2000","800","400","45","90","0"]],[0,["sub"]],[0,[""]],[0,["castle","-2000","300","500"]],[0,["castle","-2000","300","-500"]]]
let loadLevel0=()=>[csgSolidBake(csgSolidOpSubtract(csgSolidOpUnion(csgSolidOpSubtract(csgSolidOpSubtract(csgSolidBox(0,0,-1000,0,10000,1000,10000,0,0,0,0),csgSolidBox(1,0,200,0,1830,220,1120,0,0,0,200)),csgSolidBox(2,-1930,200,0,700,300,240,0,0,0,200)),csgSolidBox(1,-2690,-140,0,860,190,130,0,0,-10,0)),csgSolidLine(2,2110,0,-1800,2000,800,400,45,90,0))),[[-2000,300,500],[-2000,300,-500]]]

let levelLoaders = [
    loadLevel0,
]

export let lastLevel = levelLoaders.length - 1

let worldCastles: number[][]
let worldGeo: ModelGeo
let worldFn: SdfFunction

export let worldGetGeo = (): ModelGeo => worldGeo
export let worldGetCastles = (): number[][] => worldCastles

export let loadLevel = (i:number): void => {
    [[worldGeo, worldFn], worldCastles] = levelLoaders[i]() as any
}

// ------------------------------------------------------------------------------------

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

export let evaluateNewWorld = (sourceList: [number,string[]][]): [string, number[][]] => {
    let justCommands = sourceList
        .map(x => x[1])
        .filter(x => x.length > 0 && !x[0].startsWith('#') && x[0] !== '')
    let [asJs, castles] = new Function('fn', `return fn(${JSON.stringify(justCommands)})`)(doEvalNewWorld)
    return ['export let worldSourceList:[number,string[]][]='+JSON.stringify(sourceList)+'\n'+asJs+'\n', castles]
}

type WorldDefSolid =
    ['box',   number, number,number,number, number,number,number, number,number,number, number ] |
    ['line',  number, number,number,number, number,number,number, number,number,number ]
type WorldDefOp = ['add'] | ['sub'] | ['int']
type WorldDefCastle = ['castle', number, number, number]
type WorldDefItem = WorldDefSolid | WorldDefOp | WorldDefCastle
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
        case 'int': return result('csgSolidOpIntersect', csgSolidOpIntersect)
        default: throw new Error()
    }
}

let doEvalNewWorld = (worldDef: WorldDef): [string, number[][]] => {
    worldDef = worldDef.slice()
    modelGeoDelete(worldGeo)
    worldGeo = null as any
    worldFn = null as any

    let stack = [evaluateWorldDefSolid(worldDef.shift() as WorldDefSolid)]
    let castles = []

    while (worldDef.length > 0) {
        let item = worldDef.shift()!
        if (worldDefItemIsSolid(item)) {
            stack.push(evaluateWorldDefSolid(item as WorldDefSolid))
        } else if (item[0] === 'castle') {
            castles.push(item.slice(1) as number[])
        } else {
            let b = stack.pop()!
            let a = stack.pop()!
            stack.push(evaluateWorldDefOp(item as WorldDefOp, a, b))
        }
    }

    let [solid, js] = stack.pop()!
    ;[worldGeo, worldFn] = csgSolidBake(solid)

    return [`let loadLevelXXX=()=>[csgSolidBake(${js}),[${castles.map(x=>'['+x+']')}]]`, castles]
}
