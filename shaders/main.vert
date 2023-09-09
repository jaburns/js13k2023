attribute vec3 a_position;
attribute vec3 a_normal;
attribute float a_tag;

uniform mat4 u_mvp;

varying vec3 v_position;
varying vec3 v_normal;
varying float v_tag;

void main() {
    v_position = a_position;
    v_normal = a_normal;
    v_tag = a_tag;
    gl_Position = u_mvp * vec4(a_position, 1);
}
