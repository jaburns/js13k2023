//[
precision highp float;
//]

varying vec3 v_normal;
varying vec2 v_uv;

uniform sampler2D u_tex;

void main() {
    vec3 texColor = texture2D(u_tex, 0.2*v_uv).xyz * (0.5+0.5*max(0.,dot(v_normal,normalize(vec3(1,2,1)))));
    gl_FragColor = vec4(texColor,1);
}
