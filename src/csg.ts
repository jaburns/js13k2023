// From https://github.com/evanw/csg.js
import { gl_ARRAY_BUFFER, gl_ELEMENT_ARRAY_BUFFER, gl_STATIC_DRAW } from "./glConsts"
import { v3Negate, Vec3, Null, v3Dot, v3Cross, v3Sub, v3Normalize, vecLerp, v3Max, v3Length, v3Abs, Vec2, v3AddScale } from "./types"

declare const G: WebGLRenderingContext;
declare const EDITOR: boolean;

const CSG_PLANE_EPSILON = 1e-5

let v3Scratch: Vec3
let v3Zero: Vec3 = [0,0,0]

type CsgVertex = Readonly<{
    pos: Vec3,
    normal: Vec3,
    uv: Vec2,
}>

type CsgPolygon = Readonly<{
    vertices: ReadonlyArray<CsgVertex>
    plane: CsgPlane,
    tag: number,
}>

type CsgPlane = Readonly<{
    normal: Vec3,
    w: number,
}>

const enum PolygonType {
    COPLANAR = 0,
    FRONT = 1,
    BACKK = 2,
    SPANNING = 3,
}

let csgPolygonNew = (verts: CsgVertex[], tag: number): CsgPolygon => (
    v3Scratch = v3Normalize(v3Cross(v3Sub(verts[1].pos, verts[0].pos), v3Sub(verts[2].pos, verts[0].pos))),
    {
        vertices: verts,
        plane: { normal: v3Scratch, w: v3Dot(v3Scratch, verts[0].pos) },
        tag
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
    coplanarBackk: CsgPolygon[],
    front: CsgPolygon[],
    backk: CsgPolygon[],
): void => {
    let polygonType = 0

    let types: PolygonType[] = polygon.vertices.map(vert => {
        let t = v3Dot(self.normal, vert.pos) - self.w
        let typ =
            t < -CSG_PLANE_EPSILON ? PolygonType.BACKK
            : t > CSG_PLANE_EPSILON ? PolygonType.FRONT
            : PolygonType.COPLANAR
        polygonType |= typ
        return typ
    })

    if (polygonType == PolygonType.COPLANAR) {
        (v3Dot(self.normal, polygon.plane.normal) > 0 ? coplanarFront : coplanarBackk).push(polygon)
    }
    if (polygonType == PolygonType.FRONT) {
        front.push(polygon)
    }
    if (polygonType == PolygonType.BACKK) {
        backk.push(polygon)
    }
    if (polygonType == PolygonType.SPANNING) {
        let f: CsgVertex[] = [], b: CsgVertex[] = []
        for (let i = 0; i < polygon.vertices.length; i++) {
            let j = (i + 1) % polygon.vertices.length
            let ti = types[i], tj = types[j]
            let vi = polygon.vertices[i], vj = polygon.vertices[j]
            if (ti != PolygonType.BACKK) f.push(vi)
            if (ti != PolygonType.FRONT) b.push(vi)
            if ((ti | tj) == PolygonType.SPANNING) {
                let t = (self.w - v3Dot(self.normal, vi.pos)) / v3Dot(self.normal, v3Sub(vj.pos, vi.pos))
                let v: CsgVertex = {
                    pos: vecLerp(vi.pos, vj.pos, t),
                    normal: v3Normalize(vecLerp(vi.normal, vj.normal, t)),
                    uv: vecLerp(vi.uv, vj.uv, t),
                }
                f.push(v)
                b.push(v)
            }
        }
        if (f.length >= 3) front.push(csgPolygonNew(f, polygon.tag))
        if (b.length >= 3) backk.push(csgPolygonNew(b, polygon.tag))
    }
}

// ----------------------------------------------------------------------------

type CsgNode = {
    plane: CsgPlane | Null,
    front: CsgNode | Null,
    backk: CsgNode | Null,
    polygons: CsgPolygon[],
}

let csgNodeNew = (): CsgNode => ({
    plane: Null,
    front: Null,
    backk: Null,
    polygons: [],
})

let csgNodeInvert = (self: CsgNode): void => {
    self.polygons = self.polygons.map(poly => ({
        vertices: poly.vertices.map(v => ({ pos: v.pos, normal: v3Negate(v.normal), uv: v.uv })).reverse(),
        plane: csgPlaneFlip(poly.plane),
        tag: poly.tag,
    }))
    self.plane = csgPlaneFlip(self.plane as CsgPlane) // assume not null
    if (self.front) csgNodeInvert(self.front)
    if (self.backk) csgNodeInvert(self.backk)
    let swap = self.front
    self.front = self.backk
    self.backk = swap
}

let csgNodeClipPolygons = (self: CsgNode, polygons: CsgPolygon[]): CsgPolygon[] => {
    if (!self.plane) {
        return [...self.polygons]
    }

    let front: CsgPolygon[] = []
    let backk: CsgPolygon[] = []

    polygons.map(poly =>
        csgPlaneSplitPolygon(self.plane as CsgPlane, poly, front, backk, front, backk)
    )

    if (self.front) {
        front = csgNodeClipPolygons(self.front, front)
    }
    backk = self.backk
        ? csgNodeClipPolygons(self.backk, backk)
        : []

    return [...front, ...backk]
}

let csgNodeClipTo = (self: CsgNode, bsp: CsgNode): void => {
    self.polygons = csgNodeClipPolygons(bsp, self.polygons)
    if (self.front) csgNodeClipTo(self.front, bsp)
    if (self.backk) csgNodeClipTo(self.backk, bsp)
}

let csgNodeAllPolygons = (self: CsgNode): CsgPolygon[] => [
    ...self.polygons,
    ...(self.front ? csgNodeAllPolygons(self.front) : []),
    ...(self.backk ? csgNodeAllPolygons(self.backk) : []),
]

let csgNodeBuild = (self: CsgNode, polygons: CsgPolygon[]): void => {
    if (polygons.length) {
        if (!self.plane) {
            self.plane = polygons[0].plane
        }

        let front: CsgPolygon[] = []
        let backk: CsgPolygon[] = []

        polygons.map(poly =>
            csgPlaneSplitPolygon(self.plane as CsgPlane, poly, self.polygons, self.polygons, front, backk)
        )
        if (front.length) {
            if (!self.front) {
                self.front = csgNodeNew()
            }
            csgNodeBuild(self.front, front)
        }
        if (backk.length) {
            if (!self.backk) {
                self.backk = csgNodeNew()
            }
            csgNodeBuild(self.backk, backk)
        }
    }
}

// ----------------------------------------------------------------------------

const V_POSITION  = 'a'
const F_UNION     = 'b'
const F_SUBTRACT  = 'c'
const F_CUBE      = 'd'
const F_SPHERE    = 'e'

export type CsgSolid = {
    polys: CsgPolygon[],
    lineViewPolys?: CsgPolygon[],
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
    return EDITOR ? {
        polys: csgNodeAllPolygons(a),
        lineViewPolys: (solidA.lineViewPolys || solidA.polys.map(x => ((x as any).tag = 0,x)))
                .concat(solidB.lineViewPolys || solidB.polys.map(x => ((x as any).tag = 0,x))),
        sdf: `${F_UNION}(${solidA.sdf},${solidB.sdf})`,
    } : {
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
    return EDITOR ? {
        polys: csgNodeAllPolygons(a),
        lineViewPolys: (solidA.lineViewPolys || solidA.polys.map(x => ((x as any).tag = 0,x)))
                .concat((solidB.lineViewPolys || solidB.polys).map(x => ((x as any).tag = 1,x))),
        sdf: `${F_SUBTRACT}(${solidA.sdf},${solidB.sdf})`,
    } : {
        polys: csgNodeAllPolygons(a),
        sdf: `${F_SUBTRACT}(${solidA.sdf},${solidB.sdf})`,
    }
}

export let csgSolidCube = (center: Vec3, radius: Vec3, tag: number): CsgSolid => ({
    polys: [
        [[0, 4, 6, 2], [-1, 0, 0]],
        [[1, 3, 7, 5], [ 1, 0, 0]],
        [[0, 1, 5, 4], [ 0,-1, 0]],
        [[2, 6, 7, 3], [ 0, 1, 0]],
        [[0, 2, 3, 1], [ 0, 0,-1]],
        [[4, 5, 7, 6], [ 0, 0, 1]]
    ].map(info => csgPolygonNew(
        info[0].map(i => (
            v3Scratch = [
                center[0] + radius[0] * (2 * (!!(i & 1) as any) - 1),
                center[1] + radius[1] * (2 * (!!(i & 2) as any) - 1),
                center[2] + radius[2] * (2 * (!!(i & 4) as any) - 1)
            ], {
                pos: v3Scratch,
                normal: info[1] as any as Vec3,
                uv: info[1][0] ? [v3Scratch[2],v3Scratch[1]]
                    : info[1][1] ? [v3Scratch[0],v3Scratch[2]]
                    : [v3Scratch[0],v3Scratch[1]]
            }
        )),
        tag
    )),
    sdf: `${F_CUBE}(${V_POSITION},[${center.join(',')}],[${radius.join(',')}])`
})

export let csgSolidSphere = (center: Vec3, radius: number, tag: number): CsgSolid => {
    const stacks = 16, slices = 2 * stacks
    let vertices: CsgVertex[] = []
    let polys: CsgPolygon[] = []
    let normal: Vec3
    let uv: Vec2
    let vertex = (theta: number, phi: number) => (
        uv = [4*theta * (radius|0), 4*phi*(radius|0)],
        theta *= 2*Math.PI,
        phi *= Math.PI,
        normal = [
            Math.cos(theta) * Math.sin(phi),
            Math.cos(phi),
            Math.sin(theta) * Math.sin(phi),
        ],
        vertices.push({
            pos: v3AddScale(center, normal, radius),
            normal,
            uv,
        })
    )
    for (let i = 0; i < slices; i++) {
        for (var j = 0; j < stacks; j++) {
            vertices = []
            vertex(i/slices, j/stacks)
            if (j > 0) vertex((i + 1) / slices, j / stacks)
            if (j < stacks - 1) vertex((i + 1) / slices, (j + 1) / stacks)
            vertex(i / slices, (j + 1) / stacks)
            polys.push(csgPolygonNew(vertices, tag))
        }
    }
    return {
        polys,
        sdf: `${F_SPHERE}(${V_POSITION},[${center.join(',')}],${radius})`
    }
}

let sdfUnion = (a: number, b: number): number =>
    Math.max(Math.min(a,b),0)-Math.hypot(Math.min(a,0),Math.min(b,0))

let sdfSubtract = (a: number, b: number): number =>
    Math.min(Math.max(a,-b),0)+Math.hypot(Math.max(a,0),Math.max(-b,0))

let sdfCube = (p: Vec3, center: Vec3, radius: Vec3): number => (
    v3Scratch = v3Sub(v3Abs(v3Sub(p, center)), radius),
    v3Length(v3Max(v3Scratch, v3Zero)) + Math.min(Math.max(...v3Scratch), 0)
)

let sdfSphere = (p: Vec3, center: Vec3, radius: number): number =>
    v3Length(v3Sub(p, center)) - radius

export type SdfFunction = (pos: Vec3) => number

export type ModelLines = {
    indexBuffer: WebGLBuffer,
    indexBufferLen: number,
    vertexBuffer: WebGLBuffer,
    tagBuffer: WebGLBuffer,
}

export type ModelGeo = {
    indexBuffer: WebGLBuffer,
    indexBufferLen: number,
    vertexBuffer: WebGLBuffer,
    normalBuffer: WebGLBuffer,
    uvTagBuffer: WebGLBuffer

    lines?: ModelLines,
}

export let csgSolidBake = (self: CsgSolid): [ModelGeo, SdfFunction] => {
    let vertexBuf: number[] = []
    let normalBuf: number[] = []
    let uvTagBuf: number[] = []
    let indexBuf: number[] = []

    let linesIndexBuf: number[] = []
    let linesVertexBuf: number[] = []
    let linesTagBuf: number[] = []

    let innerSdfFunc = new Function(
        `${V_POSITION},${F_UNION},${F_SUBTRACT},${F_CUBE},${F_SPHERE}`,
        'return ' + self.sdf
    )
    let sdfFunc = (x: Vec3): number => innerSdfFunc(x, sdfUnion, sdfSubtract, sdfCube, sdfSphere)

    self.polys.map(poly => {
        let startIdx = vertexBuf.length / 3
        poly.vertices.map(x => (
            vertexBuf.push(...x.pos),
            normalBuf.push(...x.normal),
            uvTagBuf.push(...x.uv, poly.tag)
        ))
        for (let i = 2; i < poly.vertices.length; i++) {
            indexBuf.push(startIdx, startIdx+i-1, startIdx+i)
        }
    })

    if (EDITOR) {
        (self.lineViewPolys || self.polys).map(poly => {
            let startIdx = linesVertexBuf.length / 3
            poly.vertices.map(x => (
                linesVertexBuf.push(...x.pos),
                linesTagBuf.push(poly.tag)
            ))
            for (let i = 2; i < poly.vertices.length; i++) {
                linesIndexBuf.push(startIdx,     startIdx+i-1)
                linesIndexBuf.push(startIdx+i-1, startIdx+i)
                linesIndexBuf.push(startIdx+i,   startIdx)
            }
        })
    }

    let index = G.createBuffer()!
    G.bindBuffer(gl_ELEMENT_ARRAY_BUFFER, index)
    G.bufferData(gl_ELEMENT_ARRAY_BUFFER, new Uint16Array(indexBuf), gl_STATIC_DRAW)

    let vertex = G.createBuffer()!
    G.bindBuffer(gl_ARRAY_BUFFER, vertex)
    G.bufferData(gl_ARRAY_BUFFER, new Float32Array(vertexBuf), gl_STATIC_DRAW)

    let normal = G.createBuffer()!
    G.bindBuffer(gl_ARRAY_BUFFER, normal)
    G.bufferData(gl_ARRAY_BUFFER, new Float32Array(normalBuf), gl_STATIC_DRAW)

    let uv = G.createBuffer()!
    G.bindBuffer(gl_ARRAY_BUFFER, uv)
    G.bufferData(gl_ARRAY_BUFFER, new Float32Array(uvTagBuf), gl_STATIC_DRAW)

    let linesIndex: WebGLBuffer
    let linesVertex: WebGLBuffer
    let linesTag: WebGLBuffer
    if (EDITOR) {
        linesIndex = G.createBuffer()!
        G.bindBuffer(gl_ELEMENT_ARRAY_BUFFER, linesIndex)
        G.bufferData(gl_ELEMENT_ARRAY_BUFFER, new Uint16Array(linesIndexBuf), gl_STATIC_DRAW)

        linesVertex = G.createBuffer()!
        G.bindBuffer(gl_ARRAY_BUFFER, linesVertex)
        G.bufferData(gl_ARRAY_BUFFER, new Float32Array(linesVertexBuf), gl_STATIC_DRAW)

        linesTag = G.createBuffer()!
        G.bindBuffer(gl_ARRAY_BUFFER, linesTag)
        G.bufferData(gl_ARRAY_BUFFER, new Float32Array(linesTagBuf), gl_STATIC_DRAW)
    }

    return [
        EDITOR ? {
            indexBuffer: index,
            indexBufferLen: indexBuf.length,
            vertexBuffer: vertex,
            normalBuffer: normal,
            uvTagBuffer: uv,
            lines: {
                indexBuffer: linesIndex!,
                indexBufferLen: linesIndexBuf.length,
                vertexBuffer: linesVertex!,
                tagBuffer: linesTag!,
            }
        } : {
            indexBuffer: index,
            indexBufferLen: indexBuf.length,
            vertexBuffer: vertex,
            normalBuffer: normal,
            uvTagBuffer: uv,
        },
        sdfFunc
    ]
}

export let modelGeoDelete = (geo: ModelGeo): void => {
    if (!EDITOR) return;

    G.deleteBuffer(geo.indexBuffer)
    G.deleteBuffer(geo.vertexBuffer)
    G.deleteBuffer(geo.normalBuffer)
    G.deleteBuffer(geo.uvTagBuffer)
    if (geo.lines) {
        G.deleteBuffer(geo.lines.indexBuffer)
        G.deleteBuffer(geo.lines.vertexBuffer)
        G.deleteBuffer(geo.lines.tagBuffer)
    }
}
