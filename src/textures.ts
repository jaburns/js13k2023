declare const k_packedTexWidth: number
declare const DEBUG: boolean

let genGrass = (x: number, y: number, z: number, i: number, out: Uint8Array): void => {
    let brightness = Math.pow(Math.random(),4.0)
    let darkness = Math.pow(Math.random(),4.0)
    out[i+0] = 255 * 0.2
    out[i+1] = 255 * (0.6-0.1*brightness + 0.1*darkness)
    out[i+2] = 255 * 0.2
}

let tilingDistance3D = (x1:number, y1:number, z1:number, x2:number, y2:number, z2:number): number => (
    x1 = Math.abs(x1 - x2),
    x1 = Math.min(x1, 1 - x1),
    y1 = Math.abs(y1 - y2),
    y1 = Math.min(y1, 1 - y1),
    z1 = Math.abs(z1 - z2),
    z1 = Math.min(z1, 1 - z1),
    Math.hypot(x1, y1, z1)
)

let voronoiCenters = Array(40).fill(undefined).map(_=>[Math.random(), Math.random(), Math.random()])

let genRock = (x: number, y: number, z: number, i: number, out: Uint8Array): void => {

  let minDistance = Infinity;
  let secondMinDistance = Infinity;

  for (const [cx, cy, cz] of voronoiCenters) {
    const dist = tilingDistance3D(x, y, z, cx, cy, cz);

    if (dist < minDistance) {
      secondMinDistance = minDistance;
      minDistance = dist;
    } else if (dist < secondMinDistance) {
      secondMinDistance = dist;
    }
  }

  let edgeDistance = Math.abs(minDistance - secondMinDistance);
  let brightness = edgeDistance < 0.04 ? 0.3 + 3*edgeDistance : 0.4 + 0.6 * edgeDistance; // Adjust multiplier as needed

    brightness -= brightness * (0.1 * Math.pow(Math.random(), 8))
    brightness += brightness * (0.1 * Math.pow(Math.random(), 8))
    out[i+0] = 255 * brightness
    out[i+1] = 255 * brightness
    out[i+2] = 255 * brightness
}

let genRock2 = (x: number, y: number, z: number, i: number, out: Uint8Array): void => {
    let brightness = Math.pow(Math.random(),4.0)
    let darkness = Math.pow(Math.random(),4.0)
    out[i+0] = 128 * (0.6-0.1*brightness + 0.1*darkness)
    out[i+1] = 255 * (0.6-0.1*brightness + 0.1*darkness)
    out[i+2] = 255 * (0.6-0.1*brightness + 0.1*darkness)
}

let genBallTex = (x: number, y: number, z: number, i: number, out: Uint8Array): void => {
    let brightness = Math.pow(Math.random(),4.0)
    let darkness = Math.pow(Math.random(),4.0)

    if (x > 0.5) x = 1.0-x;
    if (y > 0.5) y = 1.0-y;
    if (z > 0.5) z = 1.0-z;
    let a =  Math.hypot(x,y) < 0.05
    let b =  Math.hypot(x,z) < 0.05
    let c =  Math.hypot(y,z) < 0.05
    let t = a || b || c ? 0.5 : 1
    out[i+0] = t * 100 * (0.6-0.1*brightness + 0.1*darkness)
    out[i+1] = t * 150 * (0.6-0.1*brightness + 0.1*darkness)
    out[i+2] = t * 180 * (0.6-0.1*brightness + 0.1*darkness)
}

let genTex3d = (getColor: (x: number, y: number, z: number, i: number, out: Uint8Array) => void): Uint8Array => {
    let ret = new Uint8Array(k_packedTexWidth * k_packedTexWidth * 4)

    for (let x = 0; x < 64; ++x) {
        for (let y = 0; y < 64; ++y) {
            for (let z = 0; z < 64; ++z) {
                let tx = z % 8;
                let ty = Math.floor(z / 8);
                let idx = 4 * (x + 64*tx + k_packedTexWidth*(y + 64*ty))
                getColor(x/64, y/64, z/64, idx, ret)
                if (DEBUG) ret[idx+3] = 255
            }
        }
    }

    if (DEBUG) {
        const canvas = document.createElement('canvas');
        canvas.width = k_packedTexWidth;
        canvas.height = k_packedTexWidth;
        const ctx = canvas.getContext('2d')!;
        const imageData = ctx.createImageData(k_packedTexWidth, k_packedTexWidth);
        for (let i = 0; i < ret.length; i++) {
            imageData.data[i] = ret[i];
        }
        ctx.putImageData(imageData, 0, 0);
        document.body.appendChild(canvas);
    }

    return ret
}

export let generatedTextures: Uint8Array[] = [
    genTex3d(genGrass),
    genTex3d(genRock),
    genTex3d(genRock2),
    genTex3d(genBallTex),
]
