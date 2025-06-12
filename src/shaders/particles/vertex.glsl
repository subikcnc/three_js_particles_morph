uniform vec2 uResolution;
uniform float uSize;
uniform float uProgress;

attribute vec3 aPositionTarget;

void main()
{
    // Mixed Position
    float progress = uProgress; // We need to animate this progress to get the morphing effect
    vec3 mixedPosition = mix(position, aPositionTarget, progress);
    // Final position
    // vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    vec4 modelPosition = modelMatrix * vec4(mixedPosition, 1.0); // Now instead of position, we use mixedPosition
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = projectedPosition;

    // Point size
    gl_PointSize = uSize * uResolution.y;
    gl_PointSize *= (1.0 / - viewPosition.z);
}