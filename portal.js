(() => {
  const canvas = document.querySelector("#cosmos");
  const portalAction = document.querySelector("#portal-action");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (!canvas) return;

  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    powerPreference: "low-power",
  });

  if (!gl) return;

  const vertexSource = `
    attribute vec2 a_position;
    varying vec2 v_uv;

    void main() {
      v_uv = a_position * 0.5 + 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const fragmentSource = `
    precision highp float;

    uniform float u_time;
    uniform vec2 u_resolution;
    uniform vec2 u_mouse;
    varying vec2 v_uv;

    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

    float noise(vec2 value) {
      const vec4 c = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
      vec2 cell = floor(value + dot(value, c.yy));
      vec2 base = value - cell + dot(cell, c.xx);
      vec2 offset = base.x > base.y ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 points = base.xyxy + c.xxzz;
      points.xy -= offset;
      cell = mod289(cell);
      vec3 permutation = permute(permute(cell.y + vec3(0.0, offset.y, 1.0)) + cell.x + vec3(0.0, offset.x, 1.0));
      vec3 weight = max(0.5 - vec3(dot(base, base), dot(points.xy, points.xy), dot(points.zw, points.zw)), 0.0);
      weight *= weight;
      weight *= weight;
      vec3 x = 2.0 * fract(permutation * c.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 gradient = x - ox;
      weight *= 1.79284291400159 - 0.85373472095314 * (gradient * gradient + h * h);
      vec3 result;
      result.x = gradient.x * base.x + h.x * base.y;
      result.yz = gradient.yz * points.xz + h.yz * points.yw;
      return 130.0 * dot(weight, result);
    }

    void main() {
      vec2 point = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
      vec2 mouse = u_mouse / u_resolution.xy - vec2(0.5);
      point -= mouse * 0.075;

      float time = u_time * 0.15;
      vec3 color = mix(vec3(0.012, 0.02, 0.055), vec3(0.025, 0.045, 0.1), v_uv.y);

      float blueNoise = noise(vec2(point.x * 1.2 + time * 0.4, point.y * 0.8 - time * 0.2));
      float blueGlow = smoothstep(0.72, 0.0, abs(point.y + 0.1 * sin(point.x * 2.5 + time) - blueNoise * 0.25));
      color += vec3(0.1, 0.32, 0.92) * blueGlow * 0.32;

      float violetNoise = noise(vec2(point.x * 1.5 - time * 0.3, point.y * 1.1 + time * 0.25 + 10.0));
      float violetGlow = smoothstep(0.82, 0.0, abs(point.y - 0.15 * cos(point.x * 2.0 - time * 0.8) - violetNoise * 0.3));
      color += vec3(0.4, 0.16, 0.82) * violetGlow * 0.24;

      float portalGlow = exp(-length(point) * 2.25);
      color += vec3(0.06, 0.42, 0.86) * portalGlow * 0.42;

      float gridAlpha = 0.0;
      if (point.y < 0.1) {
        float depth = max(0.001, -point.y + 0.12);
        vec2 gridCoord = vec2(point.x / depth * 1.5, (1.0 / depth) * 0.4 + u_time * 0.08);
        vec2 grid = abs(fract(gridCoord - 0.5) - 0.5);
        float line = 1.0 - smoothstep(0.0, 0.025, min(grid.x, grid.y));
        gridAlpha = line * smoothstep(0.0, 0.5, depth) * smoothstep(1.5, 0.2, depth) * 0.065;
      }
      color += vec3(0.18, 0.48, 0.9) * gridAlpha;

      float starSeed = fract(sin(dot(floor(gl_FragCoord.xy * 0.25 + vec2(0.0, u_time * 2.0)), vec2(12.9898, 78.233))) * 43758.5453);
      float star = step(0.9984, starSeed) * 0.4;
      color += vec3(star * 0.55, star * 0.75, star);

      float vignette = 1.0 - smoothstep(0.4, 1.35, length(v_uv - 0.5));
      color *= vignette;
      float grain = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.018;
      gl_FragColor = vec4(color + grain, 1.0);
    }
  `;

  const createShader = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn("Portal shader compile failed:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };

  const vertexShader = createShader(gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertexShader || !fragmentShader) return;

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn("Portal shader link failed:", gl.getProgramInfoLog(program));
    return;
  }

  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  const position = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const timeUniform = gl.getUniformLocation(program, "u_time");
  const resolutionUniform = gl.getUniformLocation(program, "u_resolution");
  const mouseUniform = gl.getUniformLocation(program, "u_mouse");
  const mouse = { x: 0.5, y: 0.5 };
  let frameId = 0;
  let startTime = performance.now();

  const resize = () => {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.round(canvas.clientWidth * pixelRatio);
    const height = Math.round(canvas.clientHeight * pixelRatio);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  };

  const draw = (now) => {
    resize();
    const elapsed = reduceMotion.matches ? 0 : (now - startTime) / 1000;
    gl.uniform1f(timeUniform, elapsed);
    gl.uniform2f(resolutionUniform, canvas.width, canvas.height);
    gl.uniform2f(mouseUniform, mouse.x * canvas.width, mouse.y * canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (!reduceMotion.matches && !document.hidden) frameId = requestAnimationFrame(draw);
  };

  const restart = () => {
    cancelAnimationFrame(frameId);
    startTime = performance.now();
    frameId = requestAnimationFrame(draw);
  };

  window.addEventListener("pointermove", (event) => {
    mouse.x = event.clientX / window.innerWidth;
    mouse.y = 1 - event.clientY / window.innerHeight;
  }, { passive: true });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && !reduceMotion.matches) restart();
  });

  reduceMotion.addEventListener?.("change", restart);
  document.documentElement.classList.add("webgl-ready");
  restart();

  if (portalAction && window.matchMedia("(pointer: fine)").matches && !reduceMotion.matches) {
    const resetButton = () => {
      portalAction.style.transform = "translate3d(0, 0, 0)";
    };

    portalAction.addEventListener("pointermove", (event) => {
      const bounds = portalAction.getBoundingClientRect();
      const x = event.clientX - bounds.left - bounds.width / 2;
      const y = event.clientY - bounds.top - bounds.height / 2;
      portalAction.style.transform = `translate3d(${x * 0.16}px, ${y * 0.16}px, 0)`;
    });
    portalAction.addEventListener("pointerleave", resetButton);
    portalAction.addEventListener("blur", resetButton, true);
  }
})();
