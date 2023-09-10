//[
precision highp float;
//]

varying vec3 v_position;
varying vec3 v_normal;
varying float v_tag;

uniform sampler2D u_tex[k_numTextures];
uniform vec3 u_ballPos;

void main() {
    vec3 c3d = floor(fract(v_position * 0.005) * 64.0);
    vec2 uv  = (c3d.xy + vec2(mod(c3d.z, 8.0), floor(c3d.z / 8.0)) * 64.0 + vec2(0.5)) / 512.0;

    vec4 samp;
    int tag = int(v_tag+.5);
    if (tag == 0) samp = texture2D(u_tex[0], uv);
    if (tag == 1) samp = texture2D(u_tex[1], uv);
    if (tag == 2) samp = texture2D(u_tex[2], uv);
    if (tag == 3) samp = texture2D(u_tex[3], uv);

    float sundir = dot(v_normal,normalize(vec3(5,1,5)));

    const vec3 i_YELLOW = vec3(1,.86,.39);
    const vec3 i_PINK = vec3(.9,.42,.44) + 0.1;

    vec3 mixColor = mix(i_PINK, i_YELLOW, 0.5+0.5*sundir);
    float shadowMul = 0.75+0.25*max(0.,sundir);

    float shadow_r = length(v_position.xz - u_ballPos.xz);
    if (shadow_r < 20.0 && v_position.y < u_ballPos.y) {
        shadowMul *= 1.0 - clamp(0.5 - 0.1*(shadow_r-5.), 0.0, 0.4);
    }

    gl_FragColor = vec4(samp.rgb * mixColor * shadowMul,1);
}
