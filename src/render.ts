import { gl_ARRAY_BUFFER, gl_ELEMENT_ARRAY_BUFFER, gl_FLOAT, gl_FRAGMENT_SHADER, gl_STATIC_DRAW, gl_TRIANGLES, gl_VERTEX_SHADER } from "./glConsts";
import { Null } from "./global";

declare const DEBUG: boolean;
declare const G: WebGLRenderingContext

type ModelGeo = {
    indexBuffer: WebGLBuffer,
    indexBufferLen: number,
    vertexBuffer: WebGLBuffer,
    normalBuffer: WebGLBuffer | Null,
}

export let shaderCompile = (vert: string, frag: string): WebGLProgram => {
    let vs = G.createShader(gl_VERTEX_SHADER)!
    let fs = G.createShader(gl_FRAGMENT_SHADER)!
    let shader = G.createProgram()!

    G.shaderSource(vs, vert)
    G.compileShader(vs)
    G.shaderSource(fs, frag)
    G.compileShader(fs)

    if (DEBUG) {
        let log = G.getShaderInfoLog(fs)
        if (log === null || log.length > 0) {
            console.log('Shader info log:\n' + log)
            if (log !== null && log.indexOf('ERROR') >= 0) {
                console.error(frag.split('\n').map((x,i) => `${i+1}: ${x}`).join('\n'));
            }
        }
    }

    G.attachShader(shader, vs)
    G.attachShader(shader, fs)
    G.linkProgram(shader)
    G.deleteShader(fs)
    G.deleteShader(vs)
    return shader;
};

let modelGeoCreate = (indices: number[], verts: number[]): ModelGeo => {
    let index = G.createBuffer()!
    G.bindBuffer(gl_ELEMENT_ARRAY_BUFFER, index)
    G.bufferData(gl_ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl_STATIC_DRAW)

    let vertex = G.createBuffer()!
    G.bindBuffer(gl_ARRAY_BUFFER, vertex)
    G.bufferData(gl_ARRAY_BUFFER, new Float32Array(verts), gl_STATIC_DRAW)

    return {
        indexBuffer: index,
        indexBufferLen: indices.length,
        vertexBuffer: vertex,
        normalBuffer: Null,
    }
}

let modelGeoDraw = (self: ModelGeo, shaderProg: WebGLProgram): void => {
    G.bindBuffer(gl_ARRAY_BUFFER, self.vertexBuffer)
    let posLoc = G.getAttribLocation(shaderProg, 'a_position')
    G.enableVertexAttribArray(posLoc)
    G.vertexAttribPointer(posLoc, 3, gl_FLOAT, false, 0, 0)

    if (self.normalBuffer) {
        G.bindBuffer(gl_ARRAY_BUFFER, self.normalBuffer)
        posLoc = G.getAttribLocation(shaderProg, 'a_normal')
        G.enableVertexAttribArray(posLoc)
        G.vertexAttribPointer(posLoc, 3, G.FLOAT, false, 0, 0)
    }

    G.bindBuffer(gl_ELEMENT_ARRAY_BUFFER, self.indexBuffer)
    G.drawElements(gl_TRIANGLES, self.indexBufferLen, G.UNSIGNED_SHORT, 0)
}
