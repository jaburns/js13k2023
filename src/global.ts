export const enum Bool { False, True }

export type Vec3 = [number, number, number]

export let lerp = (a: number, b: number, t: number): number =>
    a + t*(b-a)

export let v3Lerp = (a: Vec3, b: Vec3, t: number): Vec3 =>
    a.map((x,i)=>lerp(x,b[i],t)) as Vec3;

export let v3MulAdd = (a: Vec3, b: Vec3, s: number): Vec3 =>
    a.map((x,i)=>x+s*b[i]) as Vec3;

export let v3Dot = (a: Vec3, b: Vec3): number =>
    a[0]*b[0] + a[1]*b[1] + a[2]*b[2]

export let v3Cross = (a: Vec3, b: Vec3): Vec3 => [
    a[1]*b[2] - a[2]*b[1],
    a[2]*b[0] - a[0]*b[2],
    a[0]*b[1] - a[1]*b[0],
]

