attribute vec3 a_position;
attribute vec3 a_normal;
attribute vec2 a_uv;
attribute float a_tag;

uniform mat4 u_mvp;

varying vec3 v_normal;
varying vec2 v_uv;
varying float v_tag;

void main() {
    v_normal = a_normal;
    v_uv = a_uv;
    v_tag = a_tag;
    gl_Position = u_mvp * vec4(a_position, 1);
}
