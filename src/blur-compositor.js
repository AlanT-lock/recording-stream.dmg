/**
 * Compositeur WebGL pour le flou - rendu GPU ultra-rapide
 * Remplace la boucle pixel CPU par un shader fragment
 */

let gl = null;
let program = null;
let texSharp = null;
let texBlurred = null;
let texMask = null;
let texW = 0;
let texH = 0;
let vao = null;

const VERT_SHADER = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAG_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_sharp;
uniform sampler2D u_blurred;
uniform sampler2D u_mask;
uniform float u_edgeSoft;
in vec2 v_uv;
out vec4 fragColor;
void main() {
  vec4 sharp = texture(u_sharp, v_uv);
  vec4 blurred = texture(u_blurred, v_uv);
  float m = texture(u_mask, v_uv).r;
  float t = smoothstep(0.5 - u_edgeSoft, 0.5 + u_edgeSoft, m);
  fragColor = vec4(mix(blurred.rgb, sharp.rgb, t), 1.0);
}
`;

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl, vs, fs) {
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

let glCanvas = null;

function initGl() {
  if (gl) return gl;
  glCanvas = document.createElement('canvas');
  gl = glCanvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'high-performance',
    failIfMajorPerformanceCaveat: false
  });
  if (!gl) return null;

  const vsh = createShader(gl, gl.VERTEX_SHADER, VERT_SHADER);
  const fsh = createShader(gl, gl.FRAGMENT_SHADER, FRAG_SHADER);
  program = createProgram(gl, vsh, fsh);
  gl.deleteShader(vsh);
  gl.deleteShader(fsh);
  if (!program) return null;

  const posLoc = gl.getAttribLocation(program, 'a_pos');
  const posBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  return gl;
}

function createTexture(gl, width, height) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  return tex;
}

function ensureTextures(gl, w, h) {
  if (!texSharp || texW !== w || texH !== h) {
    [texSharp, texBlurred, texMask].forEach(t => t && gl.deleteTexture(t));
    texSharp = createTexture(gl, w, h);
    texBlurred = createTexture(gl, w, h);
    texMask = createTexture(gl, w, h);
    texW = w;
    texH = h;
  }
}

export function compositeWithWebGL(sharpCanvas, blurredCanvas, maskCanvas, outWidth, outHeight, edgeSoft = 0.12) {
  const g = initGl();
  if (!g || !program) return null;

  const w = sharpCanvas.width;
  const h = sharpCanvas.height;
  ensureTextures(g, w, h);

  glCanvas.width = outWidth;
  glCanvas.height = outHeight;

  g.activeTexture(g.TEXTURE0);
  g.bindTexture(g.TEXTURE_2D, texSharp);
  g.texImage2D(g.TEXTURE_2D, 0, g.RGBA8, g.RGBA, g.UNSIGNED_BYTE, sharpCanvas);

  g.activeTexture(g.TEXTURE1);
  g.bindTexture(g.TEXTURE_2D, texBlurred);
  g.texImage2D(g.TEXTURE_2D, 0, g.RGBA8, g.RGBA, g.UNSIGNED_BYTE, blurredCanvas);

  g.activeTexture(g.TEXTURE2);
  g.bindTexture(g.TEXTURE_2D, texMask);
  g.texImage2D(g.TEXTURE_2D, 0, g.RGBA8, g.RGBA, g.UNSIGNED_BYTE, maskCanvas);

  g.viewport(0, 0, outWidth, outHeight);
  g.useProgram(program);
  g.uniform1i(g.getUniformLocation(program, 'u_sharp'), 0);
  g.uniform1i(g.getUniformLocation(program, 'u_blurred'), 1);
  g.uniform1i(g.getUniformLocation(program, 'u_mask'), 2);
  g.uniform1f(g.getUniformLocation(program, 'u_edgeSoft'), edgeSoft);

  g.bindVertexArray(vao);
  g.drawArrays(g.TRIANGLES, 0, 6);
  g.bindVertexArray(null);

  return glCanvas;
}

export function isWebGL2Supported() {
  try {
    const canvas = document.createElement('canvas');
    return !!canvas.getContext('webgl2');
  } catch {
    return false;
  }
}
