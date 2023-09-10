// Ported from https://github.com/evanw/csg.js
import * as gl from './glConsts'
import { v3Negate, Vec3, v3Dot, v3Cross, v3Sub, v3Normalize, vecLerp, v3Max, v3Length, v3Abs, v3AddScale, m4RotX, m4RotY, m4RotZ, m4Mul, m4MulPoint, v3Add, v3Mul, Mat4 } from "./types"

declare const G: WebGLRenderingContext;
declare const EDITOR: boolean;

const CSG_PLANE_EPSILON = 1e-5

let v3Scratch: Vec3

type CsgVertex = Readonly<{
    pos: Vec3,
    normal: Vec3,
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
    plane: CsgPlane | 0,
    front: CsgNode | 0,
    backk: CsgNode | 0,
    polygons: CsgPolygon[],
}

let csgNodeNew = (): CsgNode => ({
    plane: 0,
    front: 0,
    backk: 0,
    polygons: [],
})

let csgNodeInvert = (self: CsgNode): void => {
    self.polygons = self.polygons.map(poly => ({
        vertices: poly.vertices.map(v => ({ pos: v.pos, normal: v3Negate(v.normal) })).reverse(),
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
const F_BOX       = 'b'
const F_LINE      = 'c'

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
        sdf: `Math.min(${solidA.sdf},${solidB.sdf})`,
    } : {
        polys: csgNodeAllPolygons(a),
        sdf: `Math.min(${solidA.sdf},${solidB.sdf})`,
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
        sdf: `Math.max(${solidA.sdf},-${solidB.sdf})`,
    } : {
        polys: csgNodeAllPolygons(a),
        sdf: `Math.max(${solidA.sdf},-${solidB.sdf})`,
    }
}

let rot: Mat4
let accVertices: CsgVertex[]
let sphereVertexCenter: Vec3
let sphereVertexOffsetScale: Vec3

// theta: 0-4 longitude, phi: 0-2 latitude pole to pole
let sphereVertex = (radius: number, offset: Vec3, theta: number, phi: number) => {
    theta *= Math.PI/2
    phi *= Math.PI/2
    let normal: Vec3 = [
        Math.cos(theta) * Math.sin(phi),
        Math.cos(phi),
        Math.sin(theta) * Math.sin(phi),
    ]
    accVertices.push({
        pos: v3Add(sphereVertexCenter, m4MulPoint(rot, v3AddScale(v3Mul(offset, sphereVertexOffsetScale), normal, radius))),
        normal: m4MulPoint(rot, normal),
    })
}

export let csgSolidLine = (
    tag: number,
    cx: number, cy: number, cz: number,
    h: number, r0: number, r1: number,
    yaw: number, pitch: number, roll: number,
): CsgSolid => {
    const resolution = 4 // TODO resolution should be function of max(r0,r1)

    let polys: CsgPolygon[] = []
    sphereVertexCenter = [cx,cy,cz]
    sphereVertexOffsetScale = [1,1,1]
    rot = m4Mul(m4Mul(m4RotY(yaw/180*Math.PI), m4RotX(pitch/180*Math.PI)), m4RotZ(roll/180*Math.PI))

    let d = r0 - r1
    let phi = Math.atan(d / h)
    let phiLat = 2*phi / Math.PI

    let offsetY0 = r0 * Math.sin(phi)
    let walkR0 = r0 * Math.cos(phi)

    let offsetY1 = h + r1 * Math.sin(phi)
    let walkR1 = r1 * Math.cos(phi)

    for (let i = 0; i < 4*resolution; ++i) { // longitudes
        let i0 = i/resolution, i1 = (i+1)/resolution

        accVertices = []
        sphereVertex(walkR0, [0,offsetY0, 0], i0, 1)
        sphereVertex(walkR1, [0,offsetY1, 0], i0, 1)
        sphereVertex(walkR1, [0,offsetY1, 0], i1, 1)
        sphereVertex(walkR0, [0,offsetY0, 0], i1, 1)
        polys.push(csgPolygonNew(accVertices, tag))

        // top latitudes
        for (let j = 0; j < 2*resolution; ++j) {
            let j0 = j/resolution, j1 = (j+1)/resolution
            let brk = j1 > 1 - phiLat
            if (brk) j1 = 1 - phiLat

            accVertices = []
            sphereVertex(r1, [0,h,0], i0, j0)
            j0 > 0.01 && sphereVertex(r1, [0,h,0], i1, j0)
            sphereVertex(r1, [0,h,0], i1, j1)
            sphereVertex(r1, [0,h,0], i0, j1)
            polys.push(csgPolygonNew(accVertices, tag))

            if (brk) break;
        }

        // bottom latitudes
        for (let j = 2*resolution; j > 0; --j) {
            let j0 = (j-1)/resolution, j1 = j/resolution
            let brk = j0 < 1 - phiLat
            if (brk) j0 = 1 - phiLat

            accVertices = []
            sphereVertex(r0, [0,0,0], i0, j0)
            sphereVertex(r0, [0,0,0], i1, j0)
            j1<1.99 && sphereVertex(r0, [0,0,0], i1, j1)
            sphereVertex(r0, [0,0,0], i0, j1)
            polys.push(csgPolygonNew(accVertices, tag))

            if (brk) break;
        }
    }

    return {
        polys,
        sdf: `${F_LINE}(${V_POSITION},[${cx},${cy},${cz}],${h},${r0},${r1},${yaw},${pitch},${roll})`,
    }
}

export let csgSolidBox = (
    tag: number,
    cx: number, cy: number, cz: number,
    rx: number, ry: number, rz: number,
    yaw: number, pitch: number, roll: number,
    radius: number
): CsgSolid => {
    const resolution = 4 // TODO resolution should be function of radius

    let polys: CsgPolygon[] = []
    rot = m4Mul(m4Mul(m4RotY(yaw/180*Math.PI), m4RotX(pitch/180*Math.PI)), m4RotZ(roll/180*Math.PI))
    sphereVertexCenter = [cx,cy,cz]
    sphereVertexOffsetScale = [-rx,-ry,-rz]

    let defEdge = (i0: number, i1: number, offsets0: string, offsets1: string, mulA: number, addA: number, mulB: number, addB: number): void => {
        let offset0: Vec3 = [...offsets0].map(x=>2*(x as any)-1) as any
        let offset1: Vec3 = [...offsets1].map(x=>2*(x as any)-1) as any
        accVertices = []
        sphereVertex(radius, offset0, i0*mulA+addA, i0*mulB+addB)
        sphereVertex(radius, offset1, i0*mulA+addA, i0*mulB+addB)
        sphereVertex(radius, offset1, i1*mulA+addA, i1*mulB+addB)
        sphereVertex(radius, offset0, i1*mulA+addA, i1*mulB+addB)
        polys.push(csgPolygonNew(accVertices, tag))
    }

    if (radius > 0) {
        // corners
        for (let i = 0; i < resolution; ++i) { // longitudes
            for (let j = 0; j < resolution; ++j) { // latitudes
                for (let k = 0; k < 8; ++k) { // corner
                    let i0 = i/resolution +  k%4,    i1 = (i+1)/resolution +  k%4
                    let j0 = j/resolution + (k/4|0), j1 = (j+1)/resolution + (k/4|0)

                    let offset: Vec3 = [
                        (2 * (!!(k & 1) as any ^ !!(k & 2) as any) - 1),
                        (2 * (!!(k & 4) as any) - 1),
                        (2 * (!!(k & 2) as any) - 1),
                    ]

                    accVertices = []
                    sphereVertex(radius, offset, i0, j0)
                    j0 > 0.01 && sphereVertex(radius, offset, i1, j0)
                    j1 < 1.99 && sphereVertex(radius, offset, i1, j1)
                    sphereVertex(radius, offset, i0, j1)
                    polys.push(csgPolygonNew(accVertices, tag))

                    // edges
                    if (!k && !j) {
                        defEdge(i0,i1,'011','010',0,0,1,1)
                        defEdge(i0,i1,'110','111',0,2,1,1)
                        defEdge(i0,i1,'001','000',0,0,1,0)
                        defEdge(i0,i1,'100','101',0,2,1,0)

                        defEdge(i0,i1,'010','110',0,1,1,1)
                        defEdge(i0,i1,'111','011',0,3,1,1)
                        defEdge(i0,i1,'000','100',0,1,1,0)
                        defEdge(i0,i1,'101','001',0,3,1,0)

                        defEdge(i0,i1,'010','000',1,0,0,1)
                        defEdge(i0,i1,'110','100',1,1,0,1)
                        defEdge(i0,i1,'111','101',1,2,0,1)
                        defEdge(i0,i1,'011','001',1,3,0,1)
                    }
                }
            }
        }
    }

    if (rx && ry && rz) {
        // faces
        [
            [[0, 4, 6, 2], [-1, 0, 0]],
            [[1, 3, 7, 5], [ 1, 0, 0]],
            [[0, 1, 5, 4], [ 0,-1, 0]],
            [[2, 6, 7, 3], [ 0, 1, 0]],
            [[0, 2, 3, 1], [ 0, 0,-1]],
            [[4, 5, 7, 6], [ 0, 0, 1]]
        ].map(info => polys.push(csgPolygonNew(
            info[0].map(i => (
                v3Scratch = v3AddScale([
                    rx * (2 * (!!(i & 1) as any) - 1),
                    ry * (2 * (!!(i & 2) as any) - 1),
                    rz * (2 * (!!(i & 4) as any) - 1)
                ], info[1] as any as Vec3, radius),
                {
                    pos: v3Add([cx,cy,cz], m4MulPoint(rot, v3Scratch)),
                    normal: m4MulPoint(rot, info[1] as any as Vec3),
                }
            )),
            tag
        )))
    }

    return {
        polys,
        sdf: `${F_BOX}(${V_POSITION},[${cx},${cy},${cz}],[${rx},${ry},${rz}],${yaw},${pitch},${roll},${radius})`
    }
}

let sdfBox = (
    p: Vec3, center: Vec3,
    extents: Vec3,
    yaw: number, pitch: number, roll: number,
    radius: number
): number => (
    v3Scratch = v3Sub(v3Abs(m4MulPoint(m4Mul(m4Mul(m4RotZ(-roll/180*Math.PI), m4RotX(-pitch/180*Math.PI)), m4RotY(-yaw/180*Math.PI)), v3Sub(p, center))), extents),
    v3Length(v3Max(v3Scratch, [0,0,0])) + Math.min(Math.max(...v3Scratch), 0) - radius
)

let sdfLine = (
    p: Vec3, center: Vec3,
    h: number, r0: number, r1: number,
    yaw: number, pitch: number, roll: number
): number => {
    v3Scratch = m4MulPoint(m4Mul(m4Mul(m4RotZ(-roll/180*Math.PI), m4RotX(-pitch/180*Math.PI)), m4RotY(-yaw/180*Math.PI)), v3Sub(p, center))

    let b = (r0-r1)/h
    let a = Math.sqrt(1.0-b*b)
    let q: Vec3 = [v3Length([v3Scratch[0],v3Scratch[2],0]),v3Scratch[1],0]
    let k = v3Dot(q,[-b,a,0])

    return k<0.0 ? v3Length(q) - r0 :
        k>a*h ? v3Length(v3Sub(q,[0,h,0])) - r1 :
        v3Dot(q, [a,b,0]) - r0
}

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
    tagBuffer: WebGLBuffer

    lines?: ModelLines,
}

export let csgSolidBake = (self: CsgSolid): [ModelGeo, SdfFunction] => {
    let vertexBuf: number[] = []
    let normalBuf: number[] = []
    let tagBuf: number[] = []
    let indexBuf: number[] = []

    let linesIndexBuf: number[] = []
    let linesVertexBuf: number[] = []
    let linesTagBuf: number[] = []

    let innerSdfFunc = new Function(
        `${V_POSITION},${F_BOX},${F_LINE}`,
        'return ' + self.sdf
    )
    let sdfFunc = (x: Vec3): number => innerSdfFunc(
        x, sdfBox, sdfLine
    )

    self.polys.map(poly => {
        let startIdx = vertexBuf.length / 3
        poly.vertices.map(x => (
            vertexBuf.push(...x.pos),
            normalBuf.push(...x.normal),
            tagBuf.push(poly.tag)
        ))
        for (let i = 2; i < poly.vertices.length; i++) {
            indexBuf.push(startIdx, startIdx+i-1, startIdx+i)
        }
    })

    if (EDITOR) {
        let showPolys = (window as any).editorShowLinesKind ? self.polys : (self.lineViewPolys || self.polys)
        showPolys.map(poly => {
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
    G.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index)
    G.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexBuf), gl.STATIC_DRAW)

    let vertex = G.createBuffer()!
    G.bindBuffer(gl.ARRAY_BUFFER, vertex)
    G.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexBuf), gl.STATIC_DRAW)

    let normal = G.createBuffer()!
    G.bindBuffer(gl.ARRAY_BUFFER, normal)
    G.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalBuf), gl.STATIC_DRAW)

    let tag = G.createBuffer()!
    G.bindBuffer(gl.ARRAY_BUFFER, tag)
    G.bufferData(gl.ARRAY_BUFFER, new Float32Array(tagBuf), gl.STATIC_DRAW)

    let linesIndex: WebGLBuffer
    let linesVertex: WebGLBuffer
    let linesTag: WebGLBuffer
    if (EDITOR) {
        linesIndex = G.createBuffer()!
        G.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, linesIndex)
        G.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(linesIndexBuf), gl.STATIC_DRAW)

        linesVertex = G.createBuffer()!
        G.bindBuffer(gl.ARRAY_BUFFER, linesVertex)
        G.bufferData(gl.ARRAY_BUFFER, new Float32Array(linesVertexBuf), gl.STATIC_DRAW)

        linesTag = G.createBuffer()!
        G.bindBuffer(gl.ARRAY_BUFFER, linesTag)
        G.bufferData(gl.ARRAY_BUFFER, new Float32Array(linesTagBuf), gl.STATIC_DRAW)
    }

    return [
        EDITOR ? {
            indexBuffer: index,
            indexBufferLen: indexBuf.length,
            vertexBuffer: vertex,
            normalBuffer: normal,
            tagBuffer: tag,
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
            tagBuffer: tag,
        },
        sdfFunc
    ]
}

export let modelGeoDelete = (geo: ModelGeo): void => {
    if (!EDITOR) return;

    G.deleteBuffer(geo.indexBuffer)
    G.deleteBuffer(geo.vertexBuffer)
    G.deleteBuffer(geo.normalBuffer)
    G.deleteBuffer(geo.tagBuffer)
    if (geo.lines) {
        G.deleteBuffer(geo.lines.indexBuffer)
        G.deleteBuffer(geo.lines.vertexBuffer)
        G.deleteBuffer(geo.lines.tagBuffer)
    }
}
