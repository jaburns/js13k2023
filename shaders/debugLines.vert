attribute vec3 a_position;
attribute float a_tag;

uniform mat4 u_mvp;

varying float v_tag;

void main() {
    v_tag = a_tag;
    vec4 pos = u_mvp * vec4(a_position, 1);
    pos.z -= 0.001;
    gl_Position = pos;
}
