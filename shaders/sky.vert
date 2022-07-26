attribute vec3 a_position;
attribute vec3 a_normal;
attribute vec3 a_uvTag;

uniform mat4 u_mvp;

varying vec3 v_normal;

void main() {
    v_normal = a_position;
    gl_Position = (u_mvp * vec4(a_position, 1)).xyww;
}
