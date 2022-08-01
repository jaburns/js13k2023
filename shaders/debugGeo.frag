//[
precision highp float;
//]

//varying vec3 v_normal;
//varying vec3 v_uvTag;

uniform vec3 u_color;

void main() {
    gl_FragColor = vec4(u_color, 1);
}
