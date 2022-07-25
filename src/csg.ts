import { v3Negate, Vec3, Null, v3Dot, v3Cross, v3Sub, v3Normalize, v3Lerp, v3Max, v3Length, v3Abs } from "./types"

const CSG_PLANE_EPSILON = 1e-5

let v3Scratch: Vec3
let v3Zero: Vec3 = [0,0,0]

type CsgVertex = Readonly<{
    pos: Vec3,
    normal: Vec3,
}>

type CsgPolygon = Readonly<{
    vertices: ReadonlyArray<CsgVertex>
    plane: CsgPlane,
}>

type CsgPlane = Readonly<{
    normal: Vec3,
    w: number,
}>

const enum PolygonType {
    COPLANAR = 0,
    FRONT = 1,
    BACK = 2,
    SPANNING = 3,
}

let csgPolygonNew = (verts: CsgVertex[]): CsgPolygon => (
    v3Scratch = v3Normalize(v3Cross(v3Sub(verts[1].pos, verts[0].pos), v3Sub(verts[2].pos, verts[0].pos))),
    {
        vertices: verts,
        plane: { normal: v3Scratch, w: v3Dot(v3Scratch, verts[0].pos) }
    }
)

let csgPlaneFlip = (self: CsgPlane): CsgPlane => ({
    normal: v3Negate(self.normal),
    w: -self.w,
})

let csgPlaneSplitPolygon = (
    self: CsgPlane,
    polygon: CsgPolygon,
    coplanarFront: CsgPolygon[],
    coplanarBack: CsgPolygon[],
    front: CsgPolygon[],
    back: CsgPolygon[],
): void => {
    let polygonType = 0

    let types: PolygonType[] = polygon.vertices.map(vert => {
        let t = v3Dot(self.normal, vert.pos) - self.w
        let typ =
            t < -CSG_PLANE_EPSILON ? PolygonType.BACK
            : t > CSG_PLANE_EPSILON ? PolygonType.FRONT
            : PolygonType.COPLANAR
        polygonType |= typ
        return typ
    })

    if (polygonType == PolygonType.COPLANAR) {
        (v3Dot(self.normal, polygon.plane.normal) > 0 ? coplanarFront : coplanarBack).push(polygon)
    }
    if (polygonType == PolygonType.FRONT) {
        front.push(polygon)
    }
    if (polygonType == PolygonType.BACK) {
        back.push(polygon)
    }
    if (polygonType == PolygonType.SPANNING) {
        let f: CsgVertex[] = [], b: CsgVertex[] = []
        for (let i = 0; i < polygon.vertices.length; i++) {
            let j = (i + 1) % polygon.vertices.length
            let ti = types[i], tj = types[j]
            let vi = polygon.vertices[i], vj = polygon.vertices[j]
            if (ti != PolygonType.BACK) f.push(vi)
            if (ti != PolygonType.FRONT) b.push(vi)
            if ((ti | tj) == PolygonType.SPANNING) {
                let t = (self.w - v3Dot(self.normal, vi.pos)) / v3Dot(self.normal, v3Sub(vj.pos, vi.pos))
                let v: CsgVertex = {
                    pos: v3Lerp(vi.pos, vj.pos, t),
                    normal: v3Normalize(v3Lerp(vi.normal, vj.normal, t)),
                }
                f.push(v)
                b.push(v)
            }
        }
        if (f.length >= 3) front.push(csgPolygonNew(f))
        if (b.length >= 3) back.push(csgPolygonNew(b))
    }
}

// ----------------------------------------------------------------------------

type CsgNode = {
    plane: CsgPlane | Null,
    front: CsgNode | Null,
    back: CsgNode | Null,
    polygons: CsgPolygon[],
}

let csgNodeNew = (): CsgNode => ({
    plane: Null,
    front: Null,
    back: Null,
    polygons: [],
})

let csgNodeInvert = (self: CsgNode): void => {
    self.polygons = self.polygons.map(poly => ({
        vertices: poly.vertices.map(v => ({ pos: v.pos, normal: v3Negate(v.normal) })).reverse(),
        plane: csgPlaneFlip(poly.plane),
    }))
    self.plane = csgPlaneFlip(self.plane as CsgPlane) // assume not null
    if (self.front) csgNodeInvert(self.front)
    if (self.back) csgNodeInvert(self.back)
    let swap = self.front
    self.front = self.back
    self.back = swap
}

let csgNodeClipPolygons = (self: CsgNode, polygons: CsgPolygon[]): CsgPolygon[] => {
    if (!self.plane) {
        return [...self.polygons]
    }

    let front: CsgPolygon[] = []
    let back: CsgPolygon[] = []

    polygons.map(poly =>
        csgPlaneSplitPolygon(self.plane as CsgPlane, poly, front, back, front, back)
    )

    if (self.front) {
        front = csgNodeClipPolygons(self.front, front)
    }
    back = self.back
        ? csgNodeClipPolygons(self.back, back)
        : []

    return [...front, ...back]
}

let csgNodeClipTo = (self: CsgNode, bsp: CsgNode): void => {
    self.polygons = csgNodeClipPolygons(bsp, self.polygons)
    if (self.front) csgNodeClipTo(self.front, bsp)
    if (self.back) csgNodeClipTo(self.back, bsp)
}

let csgNodeAllPolygons = (self: CsgNode): CsgPolygon[] => [
    ...self.polygons,
    ...(self.front ? csgNodeAllPolygons(self.front) : []),
    ...(self.back ? csgNodeAllPolygons(self.back) : []),
]

let csgNodeBuild = (self: CsgNode, polygons: CsgPolygon[]): void => {
    if (polygons.length) {
        if (!self.plane) {
            self.plane = polygons[0].plane
        }

        let front: CsgPolygon[] = []
        let back: CsgPolygon[] = []

        polygons.map(poly =>
            csgPlaneSplitPolygon(self.plane as CsgPlane, poly, self.polygons, self.polygons, front, back)
        )
        if (front.length) {
            if (!self.front) {
                self.front = csgNodeNew()
            }
            csgNodeBuild(self.front, front)
        }
        if (back.length) {
            if (!self.back) {
                self.back = csgNodeNew()
            }
            csgNodeBuild(self.back, back)
        }
    }
}

// ----------------------------------------------------------------------------

const F_UNION     = 'a'
const F_SUBTRACT  = 'b'
const F_CUBE      = 'c'
const V_POSITION  = 'd'

export type CsgSolid = {
    polys: CsgPolygon[],
    sdf: string
}

export let csgSolidOpUnion = (solidA: CsgSolid, solidB: CsgSolid): CsgSolid => {
    let a = csgNodeNew(), b = csgNodeNew()
    csgNodeBuild(a, solidA.polys)
    csgNodeBuild(b, solidB.polys)
    csgNodeClipTo(a, b)
    csgNodeClipTo(b, a)
    csgNodeInvert(b)
    csgNodeClipTo(b, a)
    csgNodeInvert(b)
    csgNodeBuild(a, csgNodeAllPolygons(b))
    return {
        polys: csgNodeAllPolygons(a),
        sdf: `${F_UNION}(${solidA.sdf},${solidB.sdf})`,
    }
}

export let csgSolidOpSubtract = (solidA: CsgSolid, solidB: CsgSolid): CsgSolid => {
    let a = csgNodeNew(), b = csgNodeNew()
    csgNodeBuild(a, solidA.polys)
    csgNodeBuild(b, solidB.polys)
    csgNodeInvert(a)
    csgNodeClipTo(a, b)
    csgNodeClipTo(b, a)
    csgNodeInvert(b)
    csgNodeClipTo(b, a)
    csgNodeInvert(b)
    csgNodeBuild(a, csgNodeAllPolygons(b))
    csgNodeInvert(a)
    return {
        polys: csgNodeAllPolygons(a),
        sdf: `${F_SUBTRACT}(${solidA.sdf},${solidB.sdf})`,
    }
}

export let csgSolidCube = (center: Vec3, radius: Vec3): CsgSolid => ({
    polys: [
        [[0, 4, 6, 2], [-1, 0, 0]],
        [[1, 3, 7, 5], [+1, 0, 0]],
        [[0, 1, 5, 4], [0, -1, 0]],
        [[2, 6, 7, 3], [0, +1, 0]],
        [[0, 2, 3, 1], [0, 0, -1]],
        [[4, 5, 7, 6], [0, 0, +1]]
    ].map(info => csgPolygonNew(
        info[0].map(i => {
            let p: Vec3 = [
                center[0] + radius[0] * (2 * ~~!!(i & 1) - 1),
                center[1] + radius[1] * (2 * ~~!!(i & 2) - 1),
                center[2] + radius[2] * (2 * ~~!!(i & 4) - 1)
            ]
            let ret: CsgVertex = {
                pos: p,
                normal: info[1] as any as Vec3,
            }
            return ret
        })
    )),
    sdf: `${F_CUBE}(${V_POSITION},[${center.join(',')}],[${radius.join(',')}])`
})

let sdfUnion = (a: number, b: number): number =>
    Math.max(Math.min(a,b),0)-Math.hypot(Math.min(a,0),Math.min(b,0))

let sdfSubtract = (a: number, b: number): number =>
    Math.min(Math.max(a,-b),0)+Math.hypot(Math.max(a,0),Math.max(-b,0))

let sdfCube = (p: Vec3, center: Vec3, radius: Vec3): number => (
    v3Scratch = v3Sub(v3Abs(v3Sub(p, center)), radius),
    v3Length(v3Max(v3Scratch, v3Zero)) + Math.min(Math.max(...v3Scratch), 0)
)

export type SdfFunction = (pos: Vec3) => number

export let csgSolidBake = (self: CsgSolid): [number[], number[], SdfFunction] => {
    let vertexBuf: number[] = []
    let indexBuf: number[] = []
    let innerSdfFunc = new Function(
        `${V_POSITION},${F_UNION},${F_SUBTRACT},${F_CUBE}`,
        'return ' + self.sdf
    )
    let sdfFunc = (x: Vec3): number => innerSdfFunc(x, sdfUnion, sdfSubtract, sdfCube)

    self.polys.map(poly => {
        let startIdx = vertexBuf.length / 3
        poly.vertices.map(x => vertexBuf.push(...x.pos))
        for (let i = 2; i < poly.vertices.length; i++) {
            indexBuf.push(startIdx, startIdx+i-1, startIdx+i)
        }
    })

    return [indexBuf, vertexBuf, sdfFunc]
}

/*
SDF

// a, b positive in air signed distances
float union_(float a, float b) {
    return max(min(a, b), 0.) - length(min(vec2(a, b), vec2(0,0)));
}
float subtract(float a, float b) {
    return min(max(a, -b), 0.) + length(max(vec2(a, -b), vec2(0)));
}
*/

