/**
 * STUDIA - Átomo: Shader Waves
 * ------------------------------------------------------------------
 * Fondo de ondas fluídas de color dibujado con WebGL (GLSL) sobre un
 * <canvas>, sin dependencias externas.
 *
 * PROCEDENCIA: "Shader Waves" es un componente de React Bits Pro, un producto
 * de pago. Este proyecto no dispone de licencia, por lo que este archivo NO es
 * el componente original: es una reimplementación propia que respeta la misma
 * API de props documentada y está adaptada a los tokens de diseño de STUDIA
 * (lee los colores del tema desde CSS si no se pasan por props).
 *
 * Props (misma firma que la documentada):
 *   width, height, speed, color1, color2, frequency, intensity, complexity,
 *   opacity, transparent, backgroundColor, className, children
 *
 * Accesibilidad: el canvas es decorativo (`aria-hidden`) y, si el usuario tiene
 * `prefers-reduced-motion`, se dibuja un único fotograma estático.
 */

import { useEffect, useRef, useState } from 'react';

const VERTEX_SHADER = `
attribute vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;

uniform vec2  u_resolution;
uniform float u_time;
uniform vec3  u_color1;
uniform vec3  u_color2;
uniform float u_frequency;
uniform float u_intensity;
uniform float u_complexity;
uniform float u_opacity;

// Ondas suaves: suma de senos en capas que se desplazan con el tiempo.
float waves(vec2 uv, float t) {
  float octaves = clamp(1.0 + u_complexity * 5.0, 1.0, 6.0);
  float value = 0.0;
  float amplitude = 0.6;
  float total = 0.0;

  for (int i = 0; i < 6; i++) {
    if (float(i) >= octaves) break;
    float fi = float(i);
    float freq = u_frequency * (1.0 + fi * 0.8);
    value += amplitude * sin(uv.x * freq + t * (0.70 + fi * 0.32) + fi * 1.7)
                        * cos(uv.y * freq * 0.85 - t * (0.55 + fi * 0.20) + fi * 0.9);
    total += amplitude;
    uv *= 1.55;
    amplitude *= 0.55;
  }

  return value / max(total, 0.0001);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float aspect = u_resolution.x / u_resolution.y;
  uv.x *= aspect;

  float n = waves(uv * 1.2, u_time * 0.6);
  n = clamp(n * u_intensity, -1.0, 1.0);

  float band = smoothstep(-0.45, 0.45, n);
  vec3 color = mix(u_color2, u_color1, band);

  // Atenua hacia los bordes para que el contenido central conserve el protagonismo.
  vec2 centered = (uv - vec2(aspect * 0.5, 0.5)) * vec2(1.0, 1.25);
  float vignette = smoothstep(1.35, 0.2, length(centered));

  gl_FragColor = vec4(color, u_opacity * mix(0.35, 1.0, vignette));
}
`;

/** Convierte "#rrggbb" en un vector normalizado [r, g, b]. */
const hexToRgb = (hex) => {
  const match = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!match) return [0, 0, 0];
  const int = parseInt(match[1], 16);
  return [((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255];
};

/** Lee un token de color del documento; si no existe, usa el valor por defecto. */
const cssToken = (name, fallback) => {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return /^#?[0-9a-f]{6}$/i.test(value) ? value : fallback;
};

const compileShader = (gl, type, source) => {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
};

const buildProgram = (gl) => {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  if (!vertex || !fragment) return null;

  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
};

export default function ShaderWaves({
  width = '100%',
  height = '100%',
  speed = 0.35,
  color1,
  color2,
  frequency = 1,
  intensity = 1,
  complexity = 0.5,
  opacity = 0.5,
  transparent = true,
  backgroundColor = '#faf9f7',
  className = '',
  children,
}) {
  const canvasRef = useRef(null);
  const [supported, setSupported] = useState(true);

  // Los colores por defecto se toman del tema para mantener la marca del proyecto.
  const resolvedColor1 = color1 || cssToken('--color-primary', '#8574d8');
  const resolvedColor2 = color2 || cssToken('--lav-300', '#c2b6ee');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      depth: false,
      premultipliedAlpha: false,
      powerPreference: 'low-power',
    });

    const program = gl && buildProgram(gl);
    if (!program) {
      setSupported(false);
      return undefined;
    }

    setSupported(true);

    let frameId = 0;
    let disposed = false;

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    // Triángulo que cubre toda la pantalla (más grande que el clip space).
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.useProgram(program);

    const uniforms = {
      resolution: gl.getUniformLocation(program, 'u_resolution'),
      time: gl.getUniformLocation(program, 'u_time'),
      color1: gl.getUniformLocation(program, 'u_color1'),
      color2: gl.getUniformLocation(program, 'u_color2'),
      frequency: gl.getUniformLocation(program, 'u_frequency'),
      intensity: gl.getUniformLocation(program, 'u_intensity'),
      complexity: gl.getUniformLocation(program, 'u_complexity'),
      opacity: gl.getUniformLocation(program, 'u_opacity'),
    };

    gl.uniform3fv(uniforms.color1, hexToRgb(resolvedColor1));
    gl.uniform3fv(uniforms.color2, hexToRgb(resolvedColor2));
    gl.uniform1f(uniforms.frequency, frequency);
    gl.uniform1f(uniforms.intensity, intensity);
    gl.uniform1f(uniforms.complexity, complexity);
    gl.uniform1f(uniforms.opacity, opacity);

    const background = hexToRgb(transparent ? '#000000' : backgroundColor);
    const clearAlpha = transparent ? 0 : 1;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const nextWidth = Math.max(1, Math.round(rect.width * ratio));
      const nextHeight = Math.max(1, Math.round(rect.height * ratio));

      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
        gl.viewport(0, 0, nextWidth, nextHeight);
        gl.uniform2f(uniforms.resolution, nextWidth, nextHeight);
      }
    };

    const drawFrame = (elapsed) => {
      gl.clearColor(background[0], background[1], background[2], clearAlpha);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uniforms.time, elapsed);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    resize();

    const prefersReducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      drawFrame(12);
    } else {
      let elapsed = 0;
      let previous = performance.now();

      const loop = (now) => {
        if (disposed) return;
        const delta = Math.min((now - previous) / 1000, 0.1);
        previous = now;
        elapsed += delta * speed;
        resize();
        drawFrame(elapsed);
        frameId = requestAnimationFrame(loop);
      };

      frameId = requestAnimationFrame(loop);
    }

    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    if (observer) observer.observe(canvas);
    window.addEventListener('resize', resize);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      if (observer) observer.disconnect();
      gl.deleteBuffer(positionBuffer);
      gl.deleteProgram(program);
    };
  }, [
    resolvedColor1,
    resolvedColor2,
    speed,
    frequency,
    intensity,
    complexity,
    opacity,
    transparent,
    backgroundColor,
  ]);

  return (
    <div
      className={`shader-waves ${className}`.trim()}
      style={{
        width,
        height,
        background: transparent ? 'transparent' : backgroundColor,
      }}
    >
      <canvas
        ref={canvasRef}
        className="shader-waves__canvas"
        aria-hidden="true"
        style={{ display: supported ? 'block' : 'none' }}
      />
      {children ? <div className="shader-waves__content">{children}</div> : null}
    </div>
  );
}
