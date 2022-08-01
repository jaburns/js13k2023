//[
precision highp float;
//]

varying vec3 v_worldPos;

uniform vec3 u_color;

void main() {
    float p = 0.1 * (v_worldPos.x + v_worldPos.y + v_worldPos.z);
    gl_FragColor = vec4((fract(p)>0.5?1.0:0.0)*u_color, 1);
}
