export const globeToMapVertexShader = /* glsl */`
varying vec2 vUv;
uniform float uMorph; // 0 -> globe, 1 -> map
uniform float uRadius;

void main() {
  vUv = uv;
  
  // Globe position
  vec3 globePos = normalize(position) * uRadius;
  
  // Map position (equirectangular projection)
  // Convert spherical-like position to lat/lon mapping
  // For a sphere, phi is polar angle from y, theta is azimuthal
  float phi = acos(globePos.y / uRadius); // polar angle
  float theta = atan(globePos.z, globePos.x); // azimuthal angle
  
  // Map: x,y in 2D plane
  vec2 mapPos2D = vec2(theta, phi - PI/2.0); // centered
  vec3 mapPos = vec3(mapPos2D.x * uRadius * 0.8, mapPos2D.y * uRadius * 0.8, 0.0);
  
  // Morph between globe and map
  vec3 pos = mix(globePos, mapPos, uMorph);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

export const globeToMapFragmentShader = /* glsl */`
varying vec2 vUv;
uniform float uMorph;

void main() {
  vec3 color = vec3(0.04, 0.1, 0.2); // ocean-like
  float edge = smoothstep(0.0, 0.01, abs(vUv.x - 0.5) * 2.0);
  gl_FragColor = vec4(color * (1.0 - uMorph * 0.3), 1.0);
}
`;