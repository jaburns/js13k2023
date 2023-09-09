//[
precision highp float;
//]

varying vec3 v_position;
varying vec3 v_normal;
varying float v_tag;

uniform sampler2D u_tex[k_numTextures];

void main() {
    vec3 c3d = floor(fract(v_position * 0.001) * 64.0);
    vec2 uv  = (c3d.xy + vec2(mod(c3d.z, 8.0), floor(c3d.z / 8.0)) * 64.0 + vec2(0.5)) / 512.0;

    vec4 samp;
    int tag = int(v_tag+.5);
    if (tag == 1) samp = texture2D(u_tex[1], uv);
    if (tag == 2) samp = texture2D(u_tex[2], uv);
    samp = texture2D(u_tex[0], uv);

    vec3 texColor = samp.rgb * (0.5+0.5*max(0.,dot(v_normal,normalize(vec3(1,2,1)))));
    gl_FragColor = vec4(texColor,1);
}
