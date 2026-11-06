export const globeToMapVertex = /* glsl */`
uniform float uMorph;
uniform float uRadius;

varying vec2 vUv;
varying float vMorph;

#define PI 3.141592653589793

void main() {
  vUv = uv;
  vMorph = uMorph;

  vec3 dir = normalize(position);
  
  // Globe
  vec3 globePos = dir * uRadius;
  
  // Lat/Lon
  float phi = asin(clamp(dir.y, -1.0, 1.0)); // latitude (-PI/2..PI/2)
  float theta = atan(dir.z, dir.x); // longitude (-PI..PI)
  
  // Equirectangular: normalize to square-ish layout, preserve aspect
  // Scale so globe circumference matches map width
  float mapScale = uRadius * PI; // half circumference approx for full width 2PI
  vec3 mapPos = vec3(
    theta * (uRadius / PI),      // X
    phi * (uRadius * 0.5 / (PI/2.0)) * 0.5 + 0.0, // Y (gentler)
    0.0
  );
  // Simpler: keep proportional to sphere radius
  mapPos = vec3(theta * uRadius * 0.5, phi * uRadius, 0.0);
  
  // Avoid pole pinching artifacts by easing near edges? optional
  vec3 pos = mix(globePos, mapPos, uMorph);
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

export const globeToMapFragment = /* glsl */`
varying vec2 vUv;
varying float vMorph;

void main() {
  vec3 base = vec3(0.06, 0.14, 0.28);
  float grid = step(0.995, fract(vUv.x * 24.0)) + step(0.995, fract(vUv.y * 12.0));
  grid = clamp(grid, 0.0, 1.0);
  vec3 col = mix(base, base * 1.5, grid * (1.0 - vMorph * 0.4));
  gl_FragColor = vec4(col, 1.0 - vMorph * 0.15);
}
`;
