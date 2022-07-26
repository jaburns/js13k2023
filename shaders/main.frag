//[
precision highp float;
//]

varying vec3 v_normal;
varying vec2 v_uv;
varying float v_tag;

uniform sampler2D u_tex0;
uniform sampler2D u_tex1;

void main() {
    vec2 uv = 0.2*v_uv;
    vec4 samp = v_tag > 0.5 ? texture2D(u_tex1,uv) : texture2D(u_tex0,uv);

    vec3 texColor = samp.xyz * (0.5+0.5*max(0.,dot(v_normal,normalize(vec3(1,2,1)))));

    gl_FragColor = vec4(texColor,1);
}
