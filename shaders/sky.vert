attribute vec3 a_position;
attribute vec3 a_normal;
attribute float a_tag;

uniform mat4 u_mvp;

varying vec3 v_position;

void main() {
    v_position = a_position;
    gl_Position = (u_mvp * vec4(a_position, 1)).xyww;
}
