attribute float a_index;

uniform mat4 u_mvp;
uniform vec3 u_pos0;
uniform vec3 u_pos1;

varying vec3 v_worldPos;

void main() {
    vec3 pos = mix(u_pos0, u_pos1, a_index);
    v_worldPos = pos;
    gl_Position = u_mvp * vec4(pos, 1);
}
