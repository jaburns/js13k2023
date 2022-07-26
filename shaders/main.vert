attribute vec3 a_position;
attribute vec3 a_normal;

uniform mat4 u_mvp;

varying vec3 v_normal;
varying vec2 v_uv;

void main() {
    v_normal = a_normal;
    v_uv = a_position.xz;
    gl_Position = u_mvp * vec4(a_position, 1);
}
