export const globeVertex = /* glsl */`
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const globeFragment = /* glsl */`
varying vec2 vUv;

void main() {
  vec3 color = vec3(0.1, 0.25, 0.5);
  gl_FragColor = vec4(color, 1.0);
}
`;
