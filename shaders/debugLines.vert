attribute vec3 a_position;
attribute float a_tag;

uniform mat4 u_mvp;

varying float v_tag;

void main() {
    v_tag = a_tag;
    gl_Position = u_mvp * vec4(a_position, 1);
}
