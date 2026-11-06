export const simpleVertexShader = /* glsl */`
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const simpleFragmentShader = /* glsl */`
varying vec2 vUv;
uniform vec3 uColor;

void main() {
  gl_FragColor = vec4(uColor, 1.0);
}
`;