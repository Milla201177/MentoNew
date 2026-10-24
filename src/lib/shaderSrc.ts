/** WebGL2 shader source used by HeroShader. */

export const vertSrc = `#version 300 es
in vec2 a_pos;
out vec2 vUv;
void main() {
  vUv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`

export const fragSrc = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uMouseActive;
// 1.0 = transparent mode (hero/thesis): teal dots on black, screen-blended.
// 0.0 = opaque mode: full teal base + rays + dots + vignette.
uniform float uAlphaMode;
// Number of dot-grid columns. 0 = use default (200). Use ~55 for small canvases.
uniform float uDotCols;
// 1.0 = include light rays (default). 0.0 = dots only.
uniform float uRays;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec2 hash22(vec2 p) {
  float n = hash21(p);
  return vec2(n, hash21(p + n));
}

vec3 orangeBackground(vec2 uv) {
  float grad = mix(0.82, 1.05, pow(1.0 - uv.y, 0.7));
  return vec3(0.15, 0.54, 0.52) * grad;
}

float rayStrength(vec2 raySource, vec2 rayRefDir, vec2 coord, float seedA, float seedB, float speed, float time, float reach, vec2 res) {
  vec2 sourceToCoord = coord - raySource;
  float cosAngle = dot(normalize(sourceToCoord), rayRefDir);
  float diagonal = length(res);
  return clamp(
    (0.45 + 0.15 * sin(cosAngle * seedA + time * speed)) +
    (0.3 + 0.2 * cos(-cosAngle * seedB + time * speed)),
    reach, 1.0) *
    clamp((diagonal - length(sourceToCoord)) / diagonal, reach, 1.0);
}

vec3 lightRays(vec2 uv, float time) {
  float aspect = uResolution.x / uResolution.y;

  float rays = 0.0;

  vec2 d1 = uv - vec2(0.3 + sin(time * 0.07) * 0.02, -0.2);
  d1.x *= aspect * 1.2;
  rays += exp(-d1.x * d1.x * 8.0) * exp(-d1.y * d1.y * 0.4);

  vec2 d2 = uv - vec2(0.5 + sin(time * 0.05) * 0.01, -0.25);
  d2.x *= aspect * 1.5;
  rays += exp(-d2.x * d2.x * 12.0) * exp(-d2.y * d2.y * 0.3) * 1.3;

  vec2 d3 = uv - vec2(0.65 + sin(time * 0.09) * 0.02, -0.15);
  d3.x *= aspect * 1.0;
  rays += exp(-d3.x * d3.x * 6.0) * exp(-d3.y * d3.y * 0.5);

  vec2 d4 = uv - vec2(0.12 + sin(time * 0.06) * 0.015, -0.1);
  d4.x *= aspect * 0.8;
  rays += exp(-d4.x * d4.x * 5.0) * exp(-d4.y * d4.y * 0.6) * 0.5;

  vec2 d5 = uv - vec2(0.85 + sin(time * 0.08) * 0.015, -0.1);
  d5.x *= aspect * 0.9;
  rays += exp(-d5.x * d5.x * 5.0) * exp(-d5.y * d5.y * 0.6) * 0.5;

  float floorLine = exp(-pow((uv.y - 0.02) * 8.0, 2.0)) * 0.6;
  float floorFade = smoothstep(0.0, 0.5, 1.0 - abs(uv.x - 0.5) * 1.5);
  rays += floorLine * floorFade;

  rays *= smoothstep(1.0, 0.15, uv.y);

  vec3 rayColor = vec3(0.45, 0.85, 0.80);
  return rayColor * rays * 0.35;
}

float dotGrid(vec2 uv, float time, vec2 mouse, float mouseActive) {
  float cols = uDotCols > 0.5 ? uDotCols : 200.0;
  float aspect = uResolution.x / uResolution.y;
  float rows = cols / aspect * 0.85;
  vec2 gridUv = vec2(uv.x * cols, uv.y * rows);
  gridUv.y -= time * 1.0;
  vec2 cell = floor(gridUv);
  vec2 f = fract(gridUv);
  float rnd = hash21(cell);
  float rnd2 = hash21(cell + 77.0);
  float rnd3 = hash21(cell + 155.0);
  vec2 worldPos = (cell + 0.5) / vec2(cols, rows);
  float distToMouse = length(worldPos - mouse);
  float mouseInfluence = 1.2 * exp(-distToMouse * 3.0) * mouseActive;
  vec2 toMouse = normalize(mouse - worldPos + 0.001);
  f -= toMouse * mouseInfluence * 0.4;
  float dist = length(f - 0.5);
  float dot = smoothstep(0.14, 0.10, dist);
  float blinkSpeed = mix(1.5, 6.0, rnd2);
  float blinkPhase = rnd * 6.28 + rnd3 * 12.57;
  float blink = sin(time * blinkSpeed + blinkPhase);
  blink = smoothstep(-0.3, 0.4, blink);
  float baseBright = mix(0.5, 1.0, rnd);
  return dot * blink * baseBright;
}

float dither(vec2 coord) {
  return (hash21(coord + fract(uTime)) - 0.5) / 255.0;
}

vec3 tonemap(vec3 c) {
  return tanh(c);
}

void main() {
  vec2 uv = vUv;
  vec3 rays = uRays > 0.5 ? lightRays(uv, uTime) : vec3(0.0);
  float dots = dotGrid(uv, uTime, uMouse, uMouseActive);

  if (uAlphaMode > 0.5) {
    vec3 teal = vec3(0.04, 0.78, 0.62);
    vec3 elems = teal * (dots * 0.9);
    fragColor = vec4(elems, 1.0);
  } else {
    vec3 color = orangeBackground(uv);
    color += rays * 0.9;
    color += vec3(dots) * vec3(0.51, 1.0, 0.97) * 0.7;
    vec3 bgColor = vec3(0.15, 0.54, 0.52);
    vec2 c = uv - 0.5;
    float vignette = length(c * vec2(1.2, 1.0));
    float mask = smoothstep(0.30, 0.78, vignette);
    color = mix(color, bgColor, mask);
    color = tonemap(color);
    color += dither(gl_FragCoord.xy);
    fragColor = vec4(color, 1.0);
  }
}`
