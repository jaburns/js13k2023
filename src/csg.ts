import { v3Negate, Vec3, Null, v3Dot, v3MulAdd, v3Cross, v3Sub, v3Normalize, v3Lerp } from "./global"

const CSG_PLANE_EPSILON = 1e-5

// ----------------------------------------------------------------------------

type CsgVertex = Readonly<{
    pos: Vec3,
    normal: Vec3,
}>

let csgVertexFlip = (self: CsgVertex): CsgVertex => ({
    pos: self.pos,
    normal: v3Negate(self.normal)
})

// ----------------------------------------------------------------------------

type CsgPolygon = Readonly<{
    vertices: ReadonlyArray<CsgVertex>
    plane: CsgPlane,
}>

let csgPolygonNew = (verts: CsgVertex[]): CsgPolygon => ({
    vertices: verts,
    plane: csgPlaneFromPoints(verts[0].pos, verts[1].pos, verts[2].pos),
})

let csgPolygonFlip = (self: CsgPolygon): CsgPolygon => ({
    vertices: self.vertices.map(csgVertexFlip).reverse(),
    plane: csgPlaneFlip(self.plane),
})

// ----------------------------------------------------------------------------

type CsgPlane = Readonly<{
    normal: Vec3,
    w: number,
}>

let csgPlaneFromPoints = (a: Vec3, b: Vec3, c: Vec3): CsgPlane => {
    let n = v3Normalize(v3Cross(v3Sub(b, a), v3Sub(c, a)))
    return {
        normal: n,
        w: v3Dot(n, a)
    }
}

let csgPlaneFlip = (self: CsgPlane): CsgPlane => ({
    normal: v3Negate(self.normal),
    w: -self.w,
})

const enum PolygonType {
    COPLANAR = 0,
    FRONT = 1,
    BACK = 2,
    SPANNING = 3,
}

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
    self.polygons = self.polygons.map(csgPolygonFlip)
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

    for (var i = 0; i < polygons.length; i++) {
        csgPlaneSplitPolygon(self.plane, polygons[i], front, back, front, back)
    }

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

        for (let i = 0; i < polygons.length; i++) {
            csgPlaneSplitPolygon(self.plane, polygons[i], self.polygons, self.polygons, front, back)
        }
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

export type CsgSolid = CsgPolygon[]

export let csgSolidOpUnion = (solidA: CsgSolid, solidB: CsgSolid): CsgSolid => {
    let a = csgNodeNew(), b = csgNodeNew()
    csgNodeBuild(a, solidA)
    csgNodeBuild(b, solidB)
    csgNodeClipTo(a, b)
    csgNodeClipTo(b, a)
    csgNodeInvert(b)
    csgNodeClipTo(b, a)
    csgNodeInvert(b)
    csgNodeBuild(a, csgNodeAllPolygons(b))
    return csgNodeAllPolygons(a)
}

export let csgSolidOpSubtract = (solidA: CsgSolid, solidB: CsgSolid): CsgSolid => {
    let a = csgNodeNew(), b = csgNodeNew()
    csgNodeBuild(a, solidA)
    csgNodeBuild(b, solidB)
    csgNodeInvert(a)
    csgNodeClipTo(a, b)
    csgNodeClipTo(b, a)
    csgNodeInvert(b)
    csgNodeClipTo(b, a)
    csgNodeInvert(b)
    csgNodeBuild(a, csgNodeAllPolygons(b))
    csgNodeInvert(a)
    return csgNodeAllPolygons(a)
}

export let csgSolidCube = (center: Vec3, radius: Vec3): CsgSolid =>
    [
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
            ];
            let ret: CsgVertex = {
                pos: p,
                normal: info[1] as any as Vec3,
            }
            return ret
        })
    ))

/*

SDF

float union_(float a, float b) {
    return max(min(a, b), 0.) - length(min(vec2(a, b), vec2(0,0)));
}
float subtract(float a, float b) {
    return min(max(a, -b), 0.) + length(max(vec2(a, -b), vec2(0)));
}


mapDef


    (def intersect)
    (def union)
    (def subtract)

    (def cube     radius x y z scalex scaley scalez rotx roty rotz)
    (def sphere   radius x y z)
    (def spheroid scalex scaley scalez rotx roty rotz)
    (def capsule  radius0 radius1 x0 y0 z0 x1 y1 z1




    (cube 0 23 25 93 0 0 0 1 1 1)
    (intersect)
    (cube 0 23 25 93 0 0 0 1 1 1)
    (intersect)
    (cube 0 23 25 93 0 0 0 1 1 1)
    (subtract)
    (cube 0 23 25 93 0 0 0 1 1 1)



    (intersection
        (cube 23 25 93 0 0 0 1 1 1)
        (cube 23 25 93 0 0 0 1 1 1)


    (intersection
        (cube 23 25 93 0 0 0 1 1 1)
        (cube 23 25 93 0 0 0 1 1 1)









#define EPSILON 0.01

float union_(float a, float b) {
    return max(min(a, b), 0.) - length(min(vec2(a, b), vec2(0,0)));
}
float subtract(float a, float b) {
    return min(max(a, -b), 0.) + length(max(vec2(a, -b), vec2(0)));
}

float sdf0(vec3 pointInSpace)
{
    return length(pointInSpace) - 2.;
}
float sdf1(vec3 pointInSpace)
{
    return length(pointInSpace-vec3(1.0+sin(4661.69),0.0,-0.5)) - 2.;
}
float sdf2(vec3 pointInSpace)
{
    return length(pointInSpace+vec3(1.0+cos(4661.69),0.0,1.0)) - 1.;
}

// This is the signed distance representation of a sphere of radius 2.
float signedDistanceFunction(vec3 p)
{
    return union_(subtract(sdf0(p), sdf1(p)), sdf2(p)) - 0.0;
}


void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // Get a screen position with (0,0) in the middle and aspect-ratio accounted for.
    vec2 screenPos = fragCoord/iResolution.yy - vec2(.5*iResolution.x/iResolution.y,.5);

    // Uncomment to see what the magnitude of screenPos is at each pixel.
    //fragColor = vec4(length(screenPos));return;

    // Initialize the camera position at z=-10 and y=sin(time) creating the bobbing effect.
    vec3 rayOrigin = vec3(0,sin(iTime),-10);

    // Point the ray along the positive z axis offset by the screen position of the current pixel.
    vec3 rayDirection = normalize(vec3(screenPos, 1));

	// This is the ray marching loop.
    vec3 marchingPoint = rayOrigin;
    float curDist = 0.;
    float totalDistMarched = 0.;
    for (int iterations = 0; iterations < 50; ++iterations)
    {
        // Evaluate the SDF at the current marching point, giving the distance to the closest surface.
        curDist = signedDistanceFunction(marchingPoint);

        // If we're withing EPSILON distance of a surface, break the marching loop.
        if (curDist < EPSILON) {
            totalDistMarched = length(marchingPoint - rayOrigin);
            break;
        }

        // Move the walking point the furthest safe distance along the ray, which we know is the distance to the closest surface.
        marchingPoint += rayDirection * curDist;
        totalDistMarched += curDist;

        // If we've gone very far without hitting anything, just quit the loop.
        if (totalDistMarched > 30.) break;
    }

    // After the loop, if we reached a surface, draw red faded out exponentially by how far the ray travelled.
    if (curDist < EPSILON) {
        float fog = exp(-.5*(totalDistMarched-8.));
        fragColor = fog * vec4(1,0,0,0);
        return;
    }

    // Otherwise, we hit nothing, draw black.
    fragColor = vec4(0);
}



*/

