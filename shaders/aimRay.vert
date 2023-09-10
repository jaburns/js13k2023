attribute vec3 a_position;

uniform mat4 u_vp;
uniform mat4 u_model;

void main() {
    gl_Position = u_vp * u_model * vec4(a_position, 1);
}
