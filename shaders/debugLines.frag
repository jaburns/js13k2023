//[
precision highp float;
//]

varying float v_tag;

void main() {
    gl_FragColor = v_tag > 0.5
        ? vec4(1,0,0,1)
        : vec4(1,1,0,1);

}
