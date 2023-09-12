//[
precision highp float;
//]

uniform sampler2D u_tex;
uniform vec4 u_info;

void main()
{
    vec2 uv = gl_FragCoord.xy / u_info.xy;
    vec4 samp = texture2D(u_tex, vec2(uv.x,1.-uv.y));
    gl_FragColor = mix(
        vec4(mix(
            vec3(0),
            samp.rgb,
            u_info.w
        ), 1),
        samp,
        u_info.z
    );
}
