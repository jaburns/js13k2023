//[
precision highp float;
//]

varying vec3 v_position;

void main() {
    const vec3 i_PURPLE = vec3(.13,.16,.31);
    const vec3 i_PINK = vec3(.9,.42,.44);
    const vec3 i_YELLOW = vec3(1,.86,.39);

    vec3 worldDir = normalize(v_position);


    float sunhit = dot(normalize(vec3(5,1,5)),worldDir);

    float sunAmount = max(0., 500.0*sunhit - 495.0);

    vec3 vertGradient = mix(i_PURPLE, i_PINK, 1.-2.*worldDir.y);

    //vec3 sky = 1. - mix(vertGradient, vec3(1), sunAmount);

    vec3 sky =
        mix(
            mix(
                vertGradient,
                i_YELLOW,
                clamp(exp(sunhit-1.0) - 0.5*worldDir.y,0.,1.)
            ),
            vec3(1),
            sunAmount
        );

    //    vec3 sky = mix(
    //        i_YELLOW,
    //        mix(i_PURPLE, i_PINK, 1.-2.*worldDir.y),
    //    );

    // vec3 sky = mix(
    //     vec3(1),
    //     step(1.,d)
    // );

    gl_FragColor = vec4(sky,1);
}
