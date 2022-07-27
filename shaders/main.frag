//[
precision highp float;
//]

varying vec3 v_normal;
varying vec3 v_uvTag;

uniform sampler2D u_tex[3];

vec3 i_samp() {
    vec2 uv = v_uvTag.xy;
    int tag = int(v_uvTag.z+.5);
    return (tag == 0 ? texture2D(u_tex[2], uv)
        : texture2D(u_tex[1], uv)).xyz;
}

void main() {
    vec3 texColor = i_samp() * (0.5+0.5*max(0.,dot(v_normal,normalize(vec3(1,2,1)))));
    gl_FragColor = vec4(texColor,1);
}
