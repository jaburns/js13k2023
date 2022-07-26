attribute vec3 a_position;
attribute vec3 a_normal;
attribute vec3 a_uvTag;

uniform mat4 u_mvp;

varying vec3 v_normal;
varying vec3 v_uvTag;

void main() {
    v_normal = a_normal;
    v_uvTag = a_uvTag;
    gl_Position = u_mvp * vec4(a_position, 1);
}
