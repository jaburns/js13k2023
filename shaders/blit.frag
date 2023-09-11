//[
precision highp float;
//]

uniform sampler2D u_tex;
uniform vec2 u_size;

void main()
{
    vec2 uv = gl_FragCoord.xy / u_size;
    gl_FragColor = texture2D(u_tex, vec2(uv.x,1.-uv.y));
}
