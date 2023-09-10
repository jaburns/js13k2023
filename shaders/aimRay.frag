//[
precision highp float;
//]

varying vec3 v_worldPos;

void main() {
    float p = 0.1 * (v_worldPos.x + v_worldPos.y + v_worldPos.z);
    gl_FragColor = vec4(0,1,0,0.25);
}
