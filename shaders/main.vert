attribute vec3 a_position;
attribute vec3 a_normal;

uniform mat4 u_mvp;

varying vec3 v_normal;

void main() {
    v_normal = a_normal;
    gl_Position = u_mvp * vec4(a_position, 1);
}
