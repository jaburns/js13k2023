export type Bool = 0 | 1 | undefined
export const False: Bool = 0
export const True: Bool = 1

export let lerp = (a: number, b: number, t: number): number => a + t*(b-a)

export type Vec2 = Readonly<[number, number]>
export type Vec3 = Readonly<[number, number, number]>
export type Mat4 = Readonly<[
    number, number, number, number,
    number, number, number, number,
    number, number, number, number,
    number, number, number, number,
]>

export let v3Negate = (a: Vec3): Vec3 => a.map(x=>-x) as any as Vec3
export let v3Add = (a: Vec3, b: Vec3): Vec3 => a.map((x,i)=>x+b[i]) as any as Vec3
export let v3Sub = (a: Vec3, b: Vec3): Vec3 => a.map((x,i)=>x-b[i]) as any as Vec3
export let v3Mul = (a: Vec3, b: Vec3): Vec3 => a.map((x,i)=>x*b[i]) as any as Vec3
export let v3AddScale = (a: Vec3, b: Vec3, s: number): Vec3 => a.map((x,i)=>x+s*b[i]) as any as Vec3

export let v3Abs = (a: Vec3): Vec3 => a.map(Math.abs) as any as Vec3
export let v3Max = (a: Vec3, b: Vec3): Vec3 => a.map((x,i)=>Math.max(x,b[i])) as any as Vec3
export let v3Min = (a: Vec3, b: Vec3): Vec3 => a.map((x,i)=>Math.min(x,b[i])) as any as Vec3

export let vecLerp = <T extends Vec2 | Vec3>(a: T, b: T, t: number): T => a.map((x,i)=>lerp(x,b[i],t)) as any as T

export let radLerp = (a: number, b: number, t: number): number => {
    let delta = b - a
    let lerp = delta > Math.PI
        ? delta - 2 * Math.PI
        : delta < -Math.PI
            ? delta + 2 * Math.PI
            : delta
    let ret = a + lerp * t
    if (ret < 0) ret += 2*Math.PI
    if (ret > 2*Math.PI) ret -= 2*Math.PI
    return ret
}

export let v3Dot = ([x,y,z]: Vec3, [a,b,c]: Vec3): number => x*a + y*b + z*c
export let v3Dot2 = (a: Vec3): number => v3Dot(a, a)
export let v3Cross = ([x,y,z]: Vec3, [a,b,c]: Vec3): Vec3 => [y*c - z*b, z*a - x*c, x*b - y*a]

export let v3Length = (x: Vec3): number => Math.sqrt(v3Dot2(x))
export let v3Normalize = (a: Vec3): Vec3 => v3AddScale([0,0,0], a, 1/(v3Length(a)||1))

export let v3Reflect = (v: Vec3, norm: Vec3, normScale: number, tanScale: number): Vec3 => {
    let sign = Math.sign(norm[2])||1
    let a = -1 / (sign + norm[2])
    let b = norm[0] * norm[1] * a
    let t0: Vec3 = [1 + sign * norm[0] * norm[0] * a, sign * b, -sign * norm[0]]
    let t1: Vec3 = [b, sign + norm[1] * norm[1] * a, -norm[1]]

    let vn = -normScale * v3Dot(v, norm)
    let vt0 = tanScale * v3Dot(v, t0)
    let vt1 = tanScale * v3Dot(v, t1)

    let ret: Vec3 = [0,0,0]
    ret = v3AddScale(ret, norm, vn)
    ret = v3AddScale(ret, t0, vt0)
    ret = v3AddScale(ret, t1, vt1)
    return ret
}

export let m4Perspective = (invAspect: number, near: number, far: number): Mat4 => [
    // FOV = PI / 2
    invAspect, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, (far + near) / (near - far), -1,
    0, 0, (2 * far * near) / (near - far), 0
]

let c, s;
export let m4RotX = (rads: number): Mat4 => (
    c = Math.cos(rads), s = Math.sin(rads),
    [
         1, 0, 0, 0,
         0, c, s, 0,
         0,-s, c, 0,
         0, 0, 0, 1
    ]
)
export let m4RotY = (rads: number): Mat4 => (
    c = Math.cos(rads), s = Math.sin(rads),
    [
         c, 0, s, 0,
         0, 1, 0, 0,
        -s, 0, c, 0,
         0, 0, 0, 1
    ]
)
export let m4RotZ = (rads: number): Mat4 => (
    c = Math.cos(rads), s = Math.sin(rads),
    [
         c, s, 0, 0,
        -s, c, 0, 0,
         0, 0, 1, 0,
         0, 0, 0, 1
    ]
)
export let m4Scale = (s: number): Mat4 => (
    [
         s, 0, 0, 0,
         0, s, 0, 0,
         0, 0, s, 0,
         0, 0, 0, 1
    ]
)
export let m4Translate = ([x,y,z]: Vec3): Mat4 => [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    x, y, z, 1
]
export let m4AxisAngle = ([x,y,z]: Vec3, angleRads: number): Mat4 => {
    let s = Math.sin(angleRads);
    let c = Math.cos(angleRads);
    let t = 1 - c;
    return [
        x * x * t + c,
        y * x * t + z * s,
        z * x * t - y * s,
        0,

        x * y * t - z * s,
        y * y * t + c,
        z * y * t + x * s,
        0,

        x * z * t + y * s,
        y * z * t - x * s,
        z * z * t + c,
        0,

        0, 0, 0, 1
    ]
}

export let m4Ident = m4Scale(1)

export let m4Mul = (a: Mat4, b: Mat4): Mat4 => {
    let result = []
    for (let x = 0; x < 16; ++x) {
        let i=4*(x/4|0), j=x%4;
        result.push(b[i]*a[j] + b[i+1]*a[j+4] + b[i+2]*a[j+8] + b[i+3]*a[j+12])
    }
    return result as any
}

export let m4MulPoint = (m: Mat4, [x,y,z]: Vec3): Vec3 => {
    let s = (m[3]*x + m[7]*y + m[11]*z + m[15]) || 1;
    return [
        (m[0] * x + m[4] * y + m[8] * z + m[12]) / s,
        (m[1] * x + m[5] * y + m[9] * z + m[13]) / s,
        (m[2] * x + m[6] * y + m[10] * z + m[14]) / s
    ]
}
