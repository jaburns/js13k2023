import * as gl from './glConsts'

declare const k_packedTexWidth: number
declare const k_numTextures: number
declare const DEBUG: boolean
declare const G: WebGLRenderingContext

type ColorFnBuilder = () => (x: number, y: number, z: number, i: number, out: Uint8Array) => void

let textures: (0 | WebGLTexture)[] = Array(k_numTextures).fill(0)

let genGrass: ColorFnBuilder = () => (_x, _y, _z, i, out) => {
    let brightness = Math.pow(Math.random(),4.0)
    let darkness = Math.pow(Math.random(),4.0)
    let adjust = 0.6-0.1*brightness + 0.1*darkness
    out[i+0] = 255 * 0.3
    out[i+1] = 255 * adjust
    out[i+2] = 255 * 0.25 * adjust
}


let genBricks: ColorFnBuilder = () => (x, y, z, i, out) => {
    x += (2*Math.random()-1) / 64
    y += (2*Math.random()-1) / 64
    z += (2*Math.random()-1) / 64

    let mortar = 0.05
    x += 0.03
    z += 0.03
    x *= 4
    z *= 4
    y *= 8
    x %= 1
    z %= 1
    y %= 1
    let inner =
        x > mortar && x < (1-mortar) &&
        z > mortar && z < (1-mortar) &&
        y > (2*mortar) && y < (1-2*mortar)

    let brightness = 0.9
    brightness -= brightness * (0.1 * Math.pow(Math.random(), 8))
    brightness += brightness * (0.1 * Math.pow(Math.random(), 8))

    if (inner) {
        out[i+0] = 80 * brightness
        out[i+1] = 90 * brightness
        out[i+2] = 100 * brightness
    } else {
        out[i+0] = 80 * brightness
        out[i+1] = 70 * brightness
        out[i+2] = 60 * brightness
    }
}

let genWood: ColorFnBuilder = () => {
	let noise = (v: number): number => 0.25*(
        Math.sin(10.*v)
        +.5*Math.sin(17.*v)
        +.25*Math.sin(21.*v)
        +.25*Math.sin(23.*v)
        +Math.sin(29.*v)
        +.5*Math.sin(31.*v)
        +.25*Math.sin(37.*v)
        +.25*Math.sin(51.*v)
    )

    return (x, y, z, i, out) => {
        let darkness = Math.pow(Math.random(),8.0)
        let b = 0.3 * (noise(5*x) + noise(5 * z) + noise(0.2 * y)) * 0.25 + 0.75
        b -= 0.05*darkness
        out[i+0] = 255 * b
        out[i+1] = 220 * b
        out[i+2] = 200 * b
    }
}


let genCobble: ColorFnBuilder = () => {
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

    return (x, y, z, i, out) => {
        let minDistance = Infinity;
        let secondMinDistance = Infinity;

        for (let [cx, cy, cz] of voronoiCenters) {
            let dist = tilingDistance3D(x, y, z, cx, cy, cz);

            if (dist < minDistance) {
                secondMinDistance = minDistance;
                minDistance = dist;
            } else if (dist < secondMinDistance) {
                secondMinDistance = dist;
            }
        }

        let edgeDistance = Math.abs(minDistance - secondMinDistance);
        let brightness = edgeDistance < 0.04 ? 0.3 + 3*edgeDistance : 0.4 + 0.6 * edgeDistance;

        brightness -= brightness * (0.1 * Math.pow(Math.random(), 8))
        brightness += brightness * (0.1 * Math.pow(Math.random(), 8))
        out[i+0] = 230 * brightness
        out[i+1] = 200 * brightness
        out[i+2] = 255 * brightness
    }
}

let genBallTex: ColorFnBuilder = () => (x, y, z, i, out) => {
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

let genCannonTex: ColorFnBuilder = () => (_x, _y, _z, i, out) => {
    let brightness = Math.pow(Math.random(),4.0)
    let darkness = Math.pow(Math.random(),4.0)
    let t = 1
    out[i+0] = t * 100 * (0.6-0.1*brightness + 0.1*darkness)
    out[i+1] = t * 150 * (0.6-0.1*brightness + 0.1*darkness)
    out[i+2] = t * 180 * (0.6-0.1*brightness + 0.1*darkness)
}

let genCannonTexDark: ColorFnBuilder = () => (_x, _y, _z, i, out) => {
    let brightness = Math.pow(Math.random(),4.0)
    let darkness = Math.pow(Math.random(),4.0)
    let t = 1
    out[i+0] = 0.5 * t * 100 * (0.6-0.1*brightness + 0.1*darkness)
    out[i+1] = 0.5 * t * 150 * (0.6-0.1*brightness + 0.1*darkness)
    out[i+2] = 0.5 * t * 180 * (0.6-0.1*brightness + 0.1*darkness)
}

let doGen = (fnBuilder: ColorFnBuilder): Uint8Array => {
    let fn = fnBuilder()
    let ret = new Uint8Array(k_packedTexWidth * k_packedTexWidth * 4)
    for (let x = 0; x < 64; ++x) {
        for (let y = 0; y < 64; ++y) {
            for (let z = 0; z < 64; ++z) {
                let tx = z % 8;
                let ty = Math.floor(z / 8);
                let idx = 4 * (x + 64*tx + k_packedTexWidth*(y + 64*ty))
                fn(x/64, y/64, z/64, idx, ret)
                if (DEBUG) ret[idx+3] = 255
            }
        }
    }
    return ret
}

let genTex3d = (texIdx: number, getColor: ColorFnBuilder): void => {
    let code = `let a=(${doGen.toString()})(${getColor.toString()});self.postMessage(a,[a.buffer])`
    let worker = new Worker(URL.createObjectURL(new Blob([code])))
    new Promise(resolve => {
        worker.onmessage = e => resolve(e.data)
    }).then((ret: Uint8Array) => {
        let tex = G.createTexture()!
        G.bindTexture(gl.TEXTURE_2D, tex)
        G.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, k_packedTexWidth, k_packedTexWidth, 0, gl.RGBA, gl.UNSIGNED_BYTE, ret)
        G.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
        G.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
        G.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
        G.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
        textures[texIdx] = tex

        if (DEBUG) {
            let canvas = document.createElement('canvas');
            canvas.width = k_packedTexWidth;
            canvas.height = k_packedTexWidth;
            let ctx = canvas.getContext('2d')!;
            let imageData = ctx.createImageData(k_packedTexWidth, k_packedTexWidth);
            for (let i = 0; i < ret.length; i++) {
                imageData.data[i] = ret[i];
            }
            ctx.putImageData(imageData, 0, 0);
            document.body.appendChild(canvas);
        }
    })
}

let ret = new Uint8Array(k_packedTexWidth * k_packedTexWidth * 4)
for (let i = 0; i < ret.length; ++i) {
    ret[i] = 255
}
let fallback = G.createTexture()!
G.bindTexture(gl.TEXTURE_2D, fallback)
G.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, k_packedTexWidth, k_packedTexWidth, 0, gl.RGBA, gl.UNSIGNED_BYTE, ret)
G.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
G.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
G.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
G.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)

genTex3d(0, genGrass)
genTex3d(1, genCobble)
genTex3d(2, genWood)
genTex3d(3, genBallTex)
genTex3d(4, genCannonTex)
genTex3d(5, genCannonTexDark)
genTex3d(6, genBricks)

export let bindTextureUniforms = (shader: WebGLProgram): void => {
    G.uniform1iv(G.getUniformLocation(shader, 'u_tex'), textures.map((tex, i) => (
        G.activeTexture(gl.TEXTURE0 + i),
        G.bindTexture(gl.TEXTURE_2D, tex || fallback),
        i
    )))
}
