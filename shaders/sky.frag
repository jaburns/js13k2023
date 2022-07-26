//[
precision highp float;
//]

varying vec3 v_worldPos;

void main() {
    vec3 worldDir = normalize(v_worldPos);

    vec3 texColor = vec3(0,0,1);
    texColor += vec3(1,0,0) * 2.0*max(0.,dot(normalize(vec3(1,2,1)),worldDir) - 0.5);

    gl_FragColor = vec4(texColor,1);
}
