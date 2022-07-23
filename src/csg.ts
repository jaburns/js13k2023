/*

SDF

float union_(float a, float b) {
    return max(min(a, b), 0.) - length(min(vec2(a, b), vec2(0,0)));
}
float subtract(float a, float b) {
    return min(max(a, -b), 0.) + length(max(vec2(a, -b), vec2(0)));
}


mapDef


    (def intersect)
    (def union)
    (def subtract)

    (def cube     radius x y z scalex scaley scalez rotx roty rotz)
    (def sphere   radius x y z)
    (def spheroid scalex scaley scalez rotx roty rotz)
    (def capsule  radius0 radius1 x0 y0 z0 x1 y1 z1




    (cube 0 23 25 93 0 0 0 1 1 1)
    (intersect)
    (cube 0 23 25 93 0 0 0 1 1 1)
    (intersect)
    (cube 0 23 25 93 0 0 0 1 1 1)
    (subtract)
    (cube 0 23 25 93 0 0 0 1 1 1)



    (intersection
        (cube 23 25 93 0 0 0 1 1 1)
        (cube 23 25 93 0 0 0 1 1 1)


    (intersection
        (cube 23 25 93 0 0 0 1 1 1)
        (cube 23 25 93 0 0 0 1 1 1)









#define EPSILON 0.01

float union_(float a, float b) {
    return max(min(a, b), 0.) - length(min(vec2(a, b), vec2(0,0)));
}
float subtract(float a, float b) {
    return min(max(a, -b), 0.) + length(max(vec2(a, -b), vec2(0)));
}

float sdf0(vec3 pointInSpace)
{
    return length(pointInSpace) - 2.;
}
float sdf1(vec3 pointInSpace)
{
    return length(pointInSpace-vec3(1.0+sin(4661.69),0.0,-0.5)) - 2.;
}
float sdf2(vec3 pointInSpace)
{
    return length(pointInSpace+vec3(1.0+cos(4661.69),0.0,1.0)) - 1.;
}

// This is the signed distance representation of a sphere of radius 2.
float signedDistanceFunction(vec3 p)
{
    return union_(subtract(sdf0(p), sdf1(p)), sdf2(p)) - 0.0;
}


void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // Get a screen position with (0,0) in the middle and aspect-ratio accounted for.
    vec2 screenPos = fragCoord/iResolution.yy - vec2(.5*iResolution.x/iResolution.y,.5);

    // Uncomment to see what the magnitude of screenPos is at each pixel.
    //fragColor = vec4(length(screenPos));return;

    // Initialize the camera position at z=-10 and y=sin(time) creating the bobbing effect.
    vec3 rayOrigin = vec3(0,sin(iTime),-10);

    // Point the ray along the positive z axis offset by the screen position of the current pixel.
    vec3 rayDirection = normalize(vec3(screenPos, 1));

	// This is the ray marching loop.
    vec3 marchingPoint = rayOrigin;
    float curDist = 0.;
    float totalDistMarched = 0.;
    for (int iterations = 0; iterations < 50; ++iterations)
    {
        // Evaluate the SDF at the current marching point, giving the distance to the closest surface.
        curDist = signedDistanceFunction(marchingPoint);

        // If we're withing EPSILON distance of a surface, break the marching loop.
        if (curDist < EPSILON) {
            totalDistMarched = length(marchingPoint - rayOrigin);
            break;
        }

        // Move the walking point the furthest safe distance along the ray, which we know is the distance to the closest surface.
        marchingPoint += rayDirection * curDist;
        totalDistMarched += curDist;

        // If we've gone very far without hitting anything, just quit the loop.
        if (totalDistMarched > 30.) break;
    }

    // After the loop, if we reached a surface, draw red faded out exponentially by how far the ray travelled.
    if (curDist < EPSILON) {
        float fog = exp(-.5*(totalDistMarched-8.));
        fragColor = fog * vec4(1,0,0,0);
        return;
    }

    // Otherwise, we hit nothing, draw black.
    fragColor = vec4(0);
}



*/

