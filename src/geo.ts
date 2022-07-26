import { gl_ARRAY_BUFFER, gl_ELEMENT_ARRAY_BUFFER, gl_FLOAT, gl_STATIC_DRAW, gl_TRIANGLES } from "./glConsts"

declare const G: WebGLRenderingContext

export type ModelGeo = {
    indexBuffer: WebGLBuffer,
    indexBufferLen: number,
    vertexBuffer: WebGLBuffer,
    normalBuffer: WebGLBuffer,
    uvTagBuffer: WebGLBuffer
}

export let modelGeoCreate = (indices: number[], verts: number[], norms: number[], uvTags: number[]): ModelGeo => {
    let index = G.createBuffer()!
    G.bindBuffer(gl_ELEMENT_ARRAY_BUFFER, index)
    G.bufferData(gl_ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl_STATIC_DRAW)

    let vertex = G.createBuffer()!
    G.bindBuffer(gl_ARRAY_BUFFER, vertex)
    G.bufferData(gl_ARRAY_BUFFER, new Float32Array(verts), gl_STATIC_DRAW)

    let normal = G.createBuffer()!
    G.bindBuffer(gl_ARRAY_BUFFER, normal)
    G.bufferData(gl_ARRAY_BUFFER, new Float32Array(norms), gl_STATIC_DRAW)

    let uv = G.createBuffer()!
    G.bindBuffer(gl_ARRAY_BUFFER, uv)
    G.bufferData(gl_ARRAY_BUFFER, new Float32Array(uvTags), gl_STATIC_DRAW)

    return {
        indexBuffer: index,
        indexBufferLen: indices.length,
        vertexBuffer: vertex,
        normalBuffer: normal,
        uvTagBuffer: uv,
    }
}

export let modelGeoDraw = (self: ModelGeo, shaderProg: WebGLProgram): void => {
    G.bindBuffer(gl_ARRAY_BUFFER, self.vertexBuffer)
    let posLoc = G.getAttribLocation(shaderProg, 'a_position')
    G.enableVertexAttribArray(posLoc)
    G.vertexAttribPointer(posLoc, 3, gl_FLOAT, false, 0, 0)

    G.bindBuffer(gl_ARRAY_BUFFER, self.normalBuffer)
    posLoc = G.getAttribLocation(shaderProg, 'a_normal')
    G.enableVertexAttribArray(posLoc)
    G.vertexAttribPointer(posLoc, 3, G.FLOAT, false, 0, 0)

    G.bindBuffer(gl_ARRAY_BUFFER, self.uvTagBuffer)
    posLoc = G.getAttribLocation(shaderProg, 'a_uvTag')
    G.enableVertexAttribArray(posLoc)
    G.vertexAttribPointer(posLoc, 3, G.FLOAT, false, 0, 0)

    G.bindBuffer(gl_ELEMENT_ARRAY_BUFFER, self.indexBuffer)
    G.drawElements(gl_TRIANGLES, self.indexBufferLen, G.UNSIGNED_SHORT, 0)
}
