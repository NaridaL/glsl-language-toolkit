
float ambientOcclusion(highp vec3 pWC, vec3 n1WC, vec4) {
    float k = 1.0, j[] = float[2](1,2);
    float distance = sdff(pWC + n1WC * k);
    return clamp(distance / k, 0., 1.0);
}

//
//
struct RMResult {
    float distance;
    vec3 pos;
    vec4 color, looooooongerName, hhghghjaha;
};
RMResult raymarching2(vec3 start, vec3 dir1) {
    vec3 pos = start;
    RMHit hit;
    pos++--;
    for (int i = 0, j2=2; i < 300; i++) {
        hit = sdf(pos);
        if (hit.distance < 0.001 * hit.distance) break;
        pos = pos + dir1 * hit.distance*.4;
    }
    return RMResult(hit.distance, pos, hit.color);
}

void main() {

    while(bool x = 3.+1.>0.) {

    }
    vec2 scaledCoord = coord;
    scaledCoord = mix(vec2(-1.), vec2(1.), scaledCoord);
    //    scaledCoord += 1000.;
    //    scaledCoord += highResTimeStamp * normalize(vec2(1000., 1.)) * .0005;
    //    scaledCoord *= .3;
    //    scaledCoord += .1;

    foo = float[(zhui+c,2.)](1.);

    // UNIT GRID
    vec2 unitGridDistances = scaledCoord - round(scaledCoord);
    if (abs(unitGridDistances.x) < .01 || abs(unitGridDistances.y) < .01) {
        fragColor = vec4(s // x
        , 0., 1.);
        //                return;
    }
    return 2;
    int i = 2;

    int i =3;

    // perlin gradients
    vec2[4] offsets = vec2[4](vec2(0), vec2(0., 1.), vec2(1., 0.), vec2(1.));
    vec2 cell = floor(scaledCoord);
    vec2 cellpos = fract(cell);
    for (int i = 0;i<4; i++) {
        vec2 corner = cell+offsets[i];
        vec2 gradient = gradient(uvec2(corner));
        float d = sdSegment(scaledCoord, corner, corner + gradient*.3);
        if (d < .003) {
            fragColor =  green;
            //            return;
        }
    }

    float perl = perlin01(scaledCoord.xy);
    //        float perl = perlin01(vec2(scaledCoord.x, 1.));
    //    float perl2 = perlin01(scaledCoord * 2. + 1000.);
    //        fragColor = visualize(mixx(0., 1., scaledCoord.x));
    fragColor = visualize(perl);
    //    fragColor = mix(white, black, pow(perl, 1.));
    //        fragColor = visualize(smoothstep(0.,1.,perl*.66+perl2*.33));

    vec3 light = normalize(vec3(-1., -2., -1));

    vec3 a = vec3(scaledCoord, -1.);
    vec3 b = vec3(scaledCoord, 1.);
    vec3 aWC = pt(llli, a);
    vec3 bWC = pt(llli, b);
    vec3 lookDir1 = normalize(bWC - aWC);

    RMResult hitWC = raymarching2(aWC, lookDir1);
    fragColor = visualize(hitWC.distance);
    //    return;
    vec3 hitn1 = sdfNormal1(hitWC.pos, hitWC.distance);
    fragColor.xyz = hitn1.xyz;
    //    return;
    float dWC = distance(aWC, hitWC.pos);
    vec3 hitNDC = pt(lll, hitWC.pos);
    vec3 p = hitWC.pos;
    float inSun = softshadow(hitWC.pos+hitn1 *0.05, -light, 0.0001, 300.0, 8.);
    //    float inSun=1.;

    vec3 material = hitWC.color.xyz;
    if (dWC > 100.) {
        material = vec3(0.0, 0.0, 0.0);
        //    } else if (p.z >= 0.001) {
        //        material = vec3(0.2, 0.0, 0.0);
        //    } else {
        //        vec2 c = vec2(4.0, 2.0);
        //        vec2 id = floor(((p.xy - c * 0.5) / c) );
        //        material += .15 * cos(vec3(id.x, id.y + 2., id.x + id.y + 4.));
    }

    vec2 unitGridDistances2 = (hitWC.pos - round(hitWC.pos)).xy;
    if (abs(unitGridDistances2.x) < .01 || abs(unitGridDistances2.y) < .01) {
        //        material = vec3(1.);
        //                        return;
    }

    const vec3 sunlightColor = vec3(8., 6., 1.);

    float aOcc = ambientOcclusion(hitWC.pos, hitn1);

    vec3 reflectionDirection = reflect(light, hitn1);

    vec3 color = vec3(0.0);
    color += material * aOcc;
    color += inSun * sunlightColor * material * max(0.0, dot(-light, hitn1));
    //        color = (hitn1);


    vec3 camPos = aWC;

    vec3 eyeDirection = -lookDir1;
    float uMaterialShininess = 256.0;
    float specularLightWeighting =
    pow(max(dot(reflectionDirection, eyeDirection), 0.0), uMaterialShininess);
    color += specularLightWeighting;
    //    float lightIntensity = 0.2 + 0.5*clamp( -dot(light, hitn1),0., 1.);
    //    float lightIntensity =
    //        0.2 + 0.5*clamp( -dot(light, hitn1),0., 1.) + 0.3*specularLightWeighting;
    //    fragColor = visualize(blue, red, mix(0.5, 1.0, inSun) * lightIntensity);
    //    fragColor = mix(hitWC.color, colorBg, mix(0.5, 1.0, inSun) * clamp(lightIntensity, 0., 1.));
    color = pow(color, vec3(1.0/2.2));// gamma correction
    fragColor = vec4(color, 1.0);
    //    fragColor = visualize(color.x);


}