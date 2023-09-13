import { CsgSolid, csgSolidBake, csgSolidBox, csgSolidLine, csgSolidOpIntersect, csgSolidOpSubtract, csgSolidOpUnion, modelGeoDelete, SdfFunction } from "./csg"
import { ModelGeo } from "./csg"
import { m4Ident, Mat4, v3Add, v3AddScale, v3Dot2, v3Length, v3Negate, v3Normalize, v3Sub, Vec3 } from "./types"

declare const k_tickMillis: number

// ------------------------------------------------------------------------------------
// Object models

export let skyboxGeo = csgSolidBake(csgSolidBox(0, 0,0,0, 1,1,1, 0,0,0,  0))[0]
export let playerGeo = csgSolidBake(csgSolidBox(3, 0,0,0, 0,0,0, 0,0,0, 50))[0]

//export let worldSourceList:[number,string[]][]=[[0,["line","2","400","0","0","800","80","80","90","90","0"]],[0,["box","2","0","0","0","60","200","200","0","0","0","0"]],[0,["sub"]],[0,["box","2","284","0","0","208","200","200","0","0","0","0"]],[0,["sub"]],[0,["box","2","-284","0","0","208","200","200","0","0","0","0"]],[0,["sub"]],[0,["line","4","0","0","0","160","76","48","0","-90","0"]],[0,["add"]],[0,["box","4","0","0","-360","200","200","200","0","0","0","0"]],[0,["sub"]],[0,["line","5","0","0","0","160","40","40","0","-90","0"]],[0,["sub"]],[0,[""]]]
export let [cannonGeo, _unused0]=csgSolidBake(csgSolidOpSubtract(csgSolidOpSubtract(csgSolidOpUnion(csgSolidOpSubtract(csgSolidOpSubtract(csgSolidOpSubtract(csgSolidLine(2,400,0,0,800,80,80,90,90,0),csgSolidBox(2,0,0,0,60,200,200,0,0,0,0)),csgSolidBox(2,284,0,0,208,200,200,0,0,0,0)),csgSolidBox(2,-284,0,0,208,200,200,0,0,0,0)),csgSolidLine(4,0,0,0,160,76,48,0,-90,0)),csgSolidBox(4,0,0,-360,200,200,200,0,0,0,0)),csgSolidLine(5,0,0,0,160,40,40,0,-90,0)))

//export let worldSourceList:[number,string[]][]=[[0,[""]],[0,["#","Main","body","and","roof"]],[0,["box","6","0","0","0","130","100","130","0","0","0","0"]],[0,["box","6","0","110","0","100","25","100","0","0","0","0"]],[0,["sub"]],[0,[""]],[0,["#","Turrets"]],[0,["line","6","100","-119","100","400","50","50","0","0","0"]],[0,["add"]],[0,["line","6","100","-120","-100","400","50","50","0","0","0"]],[0,["add"]],[0,["line","6","-100","-120","-100","400","50","50","0","0","0"]],[0,["add"]],[0,["line","6","-100","-120","100","400","50","50","0","0","0"]],[0,["add"]],[0,[""]],[0,["#","Chop","the","bottom","off"]],[0,["box","6","0","-150","0","200","100","200","0","0","0","0"]],[0,["sub"]],[0,[""]],[0,["#","Turret","interior"]],[0,["line","4","100","-120","100","340","40","40","0","0","0"]],[0,["box","4","100","-50","100","50","170","50","0","0","0","0"]],[0,["sub"]],[0,["sub"]],[0,["line","4","100","0","-100","340","40","40","0","0","0"]],[0,["box","4","100","-50","-100","50","170","50","0","0","0","0"]],[0,["sub"]],[0,["sub"]],[0,["line","4","-100","-120","-100","340","40","40","0","0","0"]],[0,["box","4","-100","-50","-100","50","170","50","0","0","0","0"]],[0,["sub"]],[0,["sub"]],[0,["line","4","-100","-120","100","340","40","40","0","0","0"]],[0,["box","4","-100","-50","100","50","170","50","0","0","0","0"]],[0,["sub"]],[0,["sub"]],[0,[""]],[0,["#","Chop","the","top","off"]],[0,["box","6","0","250","0","200","100","200","0","0","0","0"]],[0,["sub"]],[0,[""]],[0,["#","Cut","doors","and","interior"]],[0,["box","5","0","-75","0","1","50","200","0","0","0","30"]],[0,["sub"]],[0,["box","5","0","-75","0","1","50","200","90","0","0","30"]],[0,["sub"]],[0,["box","5","0","-30","0","100","100","100","0","0","0","0"]],[0,["sub"]],[0,[""]],[0,["#","Turret","notches"]],[0,["box","4","0","150","100","200","20","10","0","0","0","0"]],[0,["sub"]],[0,["box","4","0","150","-100","200","20","10","0","0","0","0"]],[0,["sub"]],[0,["box","4","100","150","0","10","20","200","0","0","0","0"]],[0,["sub"]],[0,["box","4","-100","150","0","10","20","200","0","0","0","0"]],[0,["sub"]],[0,[""]],[0,[""]]]
let castleBase=csgSolidOpSubtract(csgSolidOpSubtract(csgSolidOpSubtract(csgSolidOpSubtract(csgSolidOpSubtract(csgSolidOpSubtract(csgSolidOpSubtract(csgSolidOpSubtract(csgSolidOpSubtract(csgSolidOpSubtract(csgSolidOpSubtract(csgSolidOpSubtract(csgSolidOpSubtract(csgSolidOpUnion(csgSolidOpUnion(csgSolidOpUnion(csgSolidOpUnion(csgSolidOpSubtract(csgSolidBox(6,0,0,0,130,100,130,0,0,0,0),csgSolidBox(6,0,110,0,100,25,100,0,0,0,0)),csgSolidLine(6,100,-119,100,400,50,50,0,0,0)),csgSolidLine(6,100,-120,-100,400,50,50,0,0,0)),csgSolidLine(6,-100,-120,-100,400,50,50,0,0,0)),csgSolidLine(6,-100,-120,100,400,50,50,0,0,0)),csgSolidBox(6,0,-150,0,200,100,200,0,0,0,0)),csgSolidOpSubtract(csgSolidLine(4,100,-120,100,340,40,40,0,0,0),csgSolidBox(4,100,-50,100,50,170,50,0,0,0,0))),csgSolidOpSubtract(csgSolidLine(4,100,0,-100,340,40,40,0,0,0),csgSolidBox(4,100,-50,-100,50,170,50,0,0,0,0))),csgSolidOpSubtract(csgSolidLine(4,-100,-120,-100,340,40,40,0,0,0),csgSolidBox(4,-100,-50,-100,50,170,50,0,0,0,0))),csgSolidOpSubtract(csgSolidLine(4,-100,-120,100,340,40,40,0,0,0),csgSolidBox(4,-100,-50,100,50,170,50,0,0,0,0))),csgSolidBox(6,0,250,0,200,100,200,0,0,0,0)),csgSolidBox(5,0,-75,0,1,50,200,0,0,0,30)),csgSolidBox(5,0,-75,0,1,50,200,90,0,0,30)),csgSolidBox(5,0,-30,0,100,100,100,0,0,0,0)),csgSolidBox(4,0,150,100,200,20,10,0,0,0,0)),csgSolidBox(4,0,150,-100,200,20,10,0,0,0,0)),csgSolidBox(4,100,150,0,10,20,200,0,0,0,0)),csgSolidBox(4,-100,150,0,10,20,200,0,0,0,0))

export let [castleGeo, _unused1] = csgSolidBake(castleBase)
export let castleGibs: ModelGeo[] = Array(8)
{
    const EXPLODE_CASTLE_TEXTURE = 1
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


// Hard qp level
// export let worldSourceList:[number,string[]][]=[[0,["box","0","0","-1000","1500","1026","1000","2000","0","0","0","0"]],[0,[""]],[0,["box","1","0","321","1211","1326","360","835","0","0","0","200"]],[0,["sub"]],[0,[""]],[0,[""]],[0,[""]],[0,["castle","-200","300","2200"]],[0,["castle","200","300","2200"]],[0,["castle","0","40","3000"]],[0,[""]]]
// let loadLevel4=()=>[csgSolidBake(csgSolidOpSubtract(csgSolidBox(0,0,-1000,1500,1026,1000,2000,0,0,0,0),csgSolidBox(1,0,321,1211,1326,360,835,0,0,0,200))),[[-200,300,2200],[200,300,2200],[0,40,3000]]]

// ------------------------------------------------------------------------------------
// World models

//export let worldSourceList:[number,string[]][]=[[0,["box","0","0","-1283","0","20000","1500","20000","0","0","0","0"]],[0,["box","0","0","1200","0","200","1000","1000","0","0","0","200"]],[0,["sub"]],[0,[""]],[0,[""]],[0,["castle","0","30","1000"]],[0,[""]],[0,[""]]]
let loadLevelBegin1=()=>[csgSolidBake(csgSolidOpSubtract(csgSolidBox(0,0,-1283,0,20000,1500,20000,0,0,0,0),csgSolidBox(0,0,1200,0,200,1000,1000,0,0,0,200))),[[0,30,1000]]]

//export let worldSourceList:[number,string[]][]=[[0,["box","0","0","-891","1498","500","1000","2000","0","0","0","0"]],[0,["box","1","0","500","317","150","300","900","0","0","0","200"]],[0,["sub"]],[0,["box","2","0","-461","3875","450","1000","500","0","0","0","0"]],[0,["add"]],[0,[""]],[0,["castle","0","30","1000"]],[0,["#castle","0","120","2000"]],[0,["castle","0","140","3000"]],[0,[""]]]
let loadLevelBegin2=()=>[csgSolidBake(csgSolidOpUnion(csgSolidOpSubtract(csgSolidBox(0,0,-891,1498,500,1000,2000,0,0,0,0),csgSolidBox(1,0,500,317,150,300,900,0,0,0,200)),csgSolidBox(2,0,-461,3875,450,1000,500,0,0,0,0))),[[0,30,1000],[0,140,3000]]]

//export let worldSourceList:[number,string[]][]=[[0,["box","0","0","-903","1498","1026","1000","2000","0","0","0","0"]],[0,["box","1","0","500","317","150","300","900","0","0","0","200"]],[0,["sub"]],[0,["#box","2","0","-461","2375","1000","1000","1000","0","0","0","0"]],[0,["#box","2","0","-461","2175","900","1100","1100","0","0","0","0"]],[0,["#sub"]],[0,["#add"]],[0,["box","2","950","-461","2375","50","1000","1000","0","0","0","0"]],[0,["add"]],[0,["box","2","-950","-461","2375","50","1000","1000","0","0","0","0"]],[0,["add"]],[0,["box","2","0","-461","3342","50","1000","1000","90","0","0","0"]],[0,["add"]],[0,[""]],[0,["castle","500","140","3000"]],[0,["castle","-500","140","3000"]],[0,["castle","0","140","3000"]],[0,[""]]]
let loadLevelEasy3=()=>[csgSolidBake(csgSolidOpUnion(csgSolidOpUnion(csgSolidOpUnion(csgSolidOpSubtract(csgSolidBox(0,0,-903,1498,1026,1000,2000,0,0,0,0),csgSolidBox(1,0,500,317,150,300,900,0,0,0,200)),csgSolidBox(2,950,-461,2375,50,1000,1000,0,0,0,0)),csgSolidBox(2,-950,-461,2375,50,1000,1000,0,0,0,0)),csgSolidBox(2,0,-461,3342,50,1000,1000,90,0,0,0))),[[500,140,3000],[-500,140,3000],[0,140,3000]]]

//export let worldSourceList:[number,string[]][]=[[0,["box","0","0","-1000","598","300","1000","915","0","0","0","0"]],[0,["box","0","-715","-1000","1213","300","1000","584","90","0","0","0"]],[0,["add"]],[0,["box","0","-1413","-1000","598","300","1000","915","0","0","0","0"]],[0,["add"]],[0,[""]],[0,["box","2","-1684","-238","1406","382","360","271","48","0","0","0"]],[0,["add"]],[0,[""]],[0,[""]],[0,["castle","0","38","1213"]],[0,["castle","-1415","38","1213"]],[0,["castle","-1415","38","0"]],[0,[""]]]
let loadLevelBraking=()=>[csgSolidBake(csgSolidOpUnion(csgSolidOpUnion(csgSolidOpUnion(csgSolidBox(0,0,-1000,598,300,1000,915,0,0,0,0),csgSolidBox(0,-715,-1000,1213,300,1000,584,90,0,0,0)),csgSolidBox(0,-1413,-1000,598,300,1000,915,0,0,0,0)),csgSolidBox(2,-1684,-238,1406,382,360,271,48,0,0,0))),[[0,38,1213],[-1415,38,1213],[-1415,38,0]]]

//export let worldSourceList:[number,string[]][]=[[0,["box","0","0","-1000","1500","1026","1000","2000","0","0","0","0"]],[0,[""]],[0,["box","1","0","85","978","328","360","494","0","0","0","0"]],[0,["add"]],[0,["box","1","0","85","1787","328","1154","494","0","0","0","0"]],[0,["add"]],[0,["box","1","0","799","-66","328","20","494","0","0","0","0"]],[0,["add"]],[0,["box","1","0","1185","-348","328","385","212","0","0","0","0"]],[0,["add"]],[0,[""]],[0,["castle","0","950","500"]],[0,["castle","0","600","500"]],[0,["castle","0","1250","500"]]]
let loadLevelStair=()=>[csgSolidBake(csgSolidOpUnion(csgSolidOpUnion(csgSolidOpUnion(csgSolidOpUnion(csgSolidBox(0,0,-1000,1500,1026,1000,2000,0,0,0,0),csgSolidBox(1,0,85,978,328,360,494,0,0,0,0)),csgSolidBox(1,0,85,1787,328,1154,494,0,0,0,0)),csgSolidBox(1,0,799,-66,328,20,494,0,0,0,0)),csgSolidBox(1,0,1185,-348,328,385,212,0,0,0,0))),[[0,950,500],[0,600,500],[0,1250,500]]]

//export let worldSourceList:[number,string[]][]=[[0,["box","0","0","-800","1100","1026","1000","1451","0","0","0","0"]],[0,[""]],[0,["box","1","0","521","-230","1326","360","1540","0","0","0","200"]],[0,["sub"]],[0,[""]],[0,[""]],[0,[""]],[0,[""]],[0,["castle","-400","450","1500"]],[0,["castle","0","500","1500"]],[0,["castle","400","450","1500"]],[0,[""]],[0,[""]]]
let loadLevelQuarter=()=>[csgSolidBake(csgSolidOpSubtract(csgSolidBox(0,0,-800,1100,1026,1000,1451,0,0,0,0),csgSolidBox(1,0,521,-230,1326,360,1540,0,0,0,200))),[[-400,450,1500],[0,500,1500],[400,450,1500]]]

//export let worldSourceList:[number,string[]][]=[[0,["box","0","0","-903","336","507","1000","497","0","0","0","0"]],[0,["box","1","0","500","-295","150","300","900","0","0","0","200"]],[0,["sub"]],[0,[""]],[0,["box","2","0","-550","1266","330","100","652","0","0","0","0"]],[0,["add"]],[0,[""]],[0,["box","0","0","-903","2147","507","1000","497","0","0","0","0"]],[0,["add"]],[0,["box","1","0","500","2762","150","300","900","0","0","0","200"]],[0,["sub"]],[0,["box","5","0","-200","3504","1","1","900","0","0","0","130"]],[0,["sub"]],[0,[""]],[0,[""]],[0,[""]],[0,["castle","0","-309","1248"]],[0,["castle","0","-275","2584"]],[0,[""]]]
let loadLevelBounce=()=>[csgSolidBake(csgSolidOpSubtract(csgSolidOpSubtract(csgSolidOpUnion(csgSolidOpUnion(csgSolidOpSubtract(csgSolidBox(0,0,-903,336,507,1000,497,0,0,0,0),csgSolidBox(1,0,500,-295,150,300,900,0,0,0,200)),csgSolidBox(2,0,-550,1266,330,100,652,0,0,0,0)),csgSolidBox(0,0,-903,2147,507,1000,497,0,0,0,0)),csgSolidBox(1,0,500,2762,150,300,900,0,0,0,200)),csgSolidBox(5,0,-200,3504,1,1,900,0,0,0,130))),[[0,-309,1248],[0,-275,2584]]]

//export let worldSourceList:[number,string[]][]=[[0,["box","0","37","-903","576","535","1000","906","0","0","0","0"]],[0,["box","1","0","463","-411","150","300","900","0","0","0","200"]],[0,["sub"]],[0,[""]],[0,["box","2","-488","92","576","39","1130","1081","0","0","0","0"]],[0,["add"]],[0,[""]],[0,["line","2","-264","476","1036","500","200","200","90","90","0"]],[0,["sub"]],[0,[""]],[0,["castle","0","320","830"]],[0,["castle","0","462","1030"]],[0,["castle","-1000","462","1030"]],[0,[""]]]
let loadLevelRing=()=>[csgSolidBake(csgSolidOpSubtract(csgSolidOpUnion(csgSolidOpSubtract(csgSolidBox(0,37,-903,576,535,1000,906,0,0,0,0),csgSolidBox(1,0,463,-411,150,300,900,0,0,0,200)),csgSolidBox(2,-488,92,576,39,1130,1081,0,0,0,0)),csgSolidLine(2,-264,476,1036,500,200,200,90,90,0))),[[0,320,830],[0,462,1030],[-1000,462,1030]]]

export let worldSourceList:[number,string[]][]=[[0,[""]],[0,["box","1","0","201","1371","1376","2029","1008","0","0","0","0"]],[0,["box","1","0","0","579","1","1","1","0","0","0","400"]],[0,["sub"]],[0,[""]],[0,["box","2","0","-50","0","50","50","50","0","0","0","0"]],[0,["add"]],[0,[""]],[0,["castle","230","201","446"]],[0,["castle","-230","201","446"]],[0,["castle","210","-253","446"]],[0,["castle","-210","-253","446"]],[0,[""]],[0,[""]]]
let loadLevelX=()=>[csgSolidBake(csgSolidOpUnion(csgSolidOpSubtract(csgSolidBox(1,0,201,1371,1376,2029,1008,0,0,0,0),csgSolidBox(1,0,0,579,1,1,1,0,0,0,400)),csgSolidBox(2,0,-50,0,50,50,50,0,0,0,0))),[[230,201,446],[-230,201,446],[210,-253,446],[-210,-253,446]]]

export const START_LEVEL = 0

let levelLoaders = [
    loadLevelBegin1,
    loadLevelBegin2,
    loadLevelEasy3,
    loadLevelBraking,
    loadLevelStair,
    loadLevelBounce,
    loadLevelRing,
    loadLevelQuarter,
    loadLevelX,
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

export let startingAmmos = [
    2,
    2,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
]

export let hints = [
    'SMASH THE CASTLE',
    'SMASH ALL THE CASTLES',
    'RE-USE THE CANNON',
    'USE THE CANNON TO SLOW DOWN',
    'SHOOT INTO THE AIR',
    'MIND THE GAP',
    'BLAST THROUGH THE WALL',
    'USE THE RAMP',
    'RIDE THE CURVE',
]

const eps = 0.001

let worldSampleNormal = (pos: Vec3): Vec3 =>
    v3Normalize([
        worldFn(v3Add(pos,[eps,0,0]))[1] - worldFn(v3Sub(pos,[eps,0,0]))[1],
        worldFn(v3Add(pos,[0,eps,0]))[1] - worldFn(v3Sub(pos,[0,eps,0]))[1],
        worldFn(v3Add(pos,[0,0,eps]))[1] - worldFn(v3Sub(pos,[0,0,eps]))[1]
    ])

export let worldNearestSurfacePoint = (pos: Vec3): [Vec3, Vec3, number, number] | undefined => {
    for (let i = 0, marchPoint = pos, dist, tag, norm; i < 50; ++i) {
        [tag, dist] = worldFn(marchPoint)
        norm = worldSampleNormal(marchPoint)
        if (dist < eps) {
            dist = v3Sub(pos, marchPoint)
            return [marchPoint, v3Dot2(dist) < eps ? norm : v3Normalize(dist), v3Length(dist), tag]
        }
        marchPoint = v3AddScale(marchPoint, norm, -dist)
    }
    return undefined
}

export let worldRaycast = (pos: Vec3, normalizedDir: Vec3, len: number): number  => {
    let i = 0, traveled = 0, marchPoint = pos, dist
    for (; i < 50 && traveled < len; ++i) {
        dist = worldFn(marchPoint)[1]
        traveled += dist
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

    return [`let loadLevelX=()=>[csgSolidBake(${js}),[${castles.map(x=>'['+x+']')}]]`, castles]
}
