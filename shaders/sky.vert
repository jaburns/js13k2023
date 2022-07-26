attribute vec3 a_position;
attribute vec3 a_normal;
attribute vec2 a_uv;
attribute float a_tag;

uniform mat4 u_mvp;

varying vec3 v_worldPos;

void main() {
    v_worldPos = a_position;
    gl_Position = (u_mvp * vec4(a_position, 1)).xyww;
}
