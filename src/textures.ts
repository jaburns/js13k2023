declare const k_packedTexWidth: number
declare const k_texCubeWidth: number
declare const DEBUG: boolean

let genGrass = (): Uint8Array => {
    let ret = new Uint8Array(k_packedTexWidth * k_packedTexWidth * 4)

    for (let x = 0; x < k_texCubeWidth; ++x) {
        for (let y = 0; y < k_texCubeWidth; ++y) {
            for (let z = 0; z < k_texCubeWidth; ++z) {
                let tx = z % 8;
                let ty = Math.floor(z / 8);
                let idx = x + k_texCubeWidth * tx + k_packedTexWidth * (y + k_texCubeWidth * ty)
                idx *= 4
                ret[idx] = Math.floor((x / 64) * 256)
                ret[idx+1] = Math.floor((y / 64) * 256)
                ret[idx+2] = Math.floor((z / 64) * 256)
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
    genGrass(),
    genGrass(),
    genGrass(),
]


/**
 * Create and append a canvas with pixel data from a Uint8Array.
 * @param {Uint8Array} data - The pixel data in RGBA format.
 * @param {number} width - The width of the image in pixels.
 * @param {number} height - The height of the image in pixels.
 */
