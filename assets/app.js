(() => {
  const state = {
    prefersReducedMotion: window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches,
    rafId: null,
    hueIndex: 0,
    hues: [210, 152, 268, 12, 328], // Blue, Green, Purple, Orange, Pink
    user: "Zyrakk",
    repos: [
      {
        name: "MiniSec",
        descId: "desc-minisec",
        starId: "stars-minisec",
        langId: "lang-minisec",
        updId: "upd-minisec"
      },
      {
        name: "video_server",
        descId: "desc-vsrv",
        starId: "stars-vsrv",
        langId: "lang-vsrv",
        updId: "upd-vsrv"
      }
    ]
  };

  document.addEventListener("DOMContentLoaded", () => {
    initMenu();
    initReveal();
    initGitHub();
    initPalette();
    initNavHighlight();
    initWebGLBackground();
    handleVisibilityPause();
  });

  function initMenu() {
    const btn = document.querySelector(".menu-toggle");
    const menu = document.querySelector(".nav-container");
    btn?.addEventListener("click", () => {
      const open = menu?.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("click", (e) => {
      if (!menu || !btn) return;
      if (
        !menu.contains(e.target) &&
        !btn.contains(e.target) &&
        menu.classList.contains("open")
      ) {
        menu.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
      }
    });
  }

  function initReveal() {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("revealed");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    els.forEach((el) => io.observe(el));
  }

  async function initGitHub() {
    for (const r of state.repos) {
      const url = `https://api.github.com/repos/${state.user}/${r.name}`;
      try {
        const res = await fetch(url, {
          headers: { Accept: "application/vnd.github+json" },
          cache: "no-store"
        });
        if (!res.ok) throw new Error(`GitHub ${res.status}`);
        const data = await res.json();
        setText(r.descId, data.description || "No description.");
        setHTML(
          r.starId,
          `<i class="fa-regular fa-star"></i> ${data.stargazers_count}`
        );
        setText(r.langId, data.language || "—");
        setText(
          r.updId,
          `Updated: ${new Date(data.pushed_at)
            .toLocaleDateString()
            .replace(/\//g, "-")}`
        );
      } catch {
        setText(r.descId, "Couldn't load description.");
        setHTML(r.starId, `<i class="fa-regular fa-star"></i> —`);
        setText(r.langId, "—");
        setText(r.updId, "Updated: —");
      }
    }
  }
  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }
  function setHTML(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  function initPalette() {
    const btn = document.getElementById("palette");
    const root = document.documentElement;
    const saved = localStorage.getItem("hueIndex");
    if (saved) state.hueIndex = parseInt(saved, 10) % state.hues.length;
    root.style.setProperty("--hue", `${state.hues[state.hueIndex]}`);
    btn?.addEventListener("click", () => {
      state.hueIndex = (state.hueIndex + 1) % state.hues.length;
      root.style.setProperty("--hue", `${state.hues[state.hueIndex]}`);
      localStorage.setItem("hueIndex", String(state.hueIndex));
    });
  }

  function initNavHighlight() {
    const ids = ["home", "projects", "lab", "contact"];
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    const links = Array.from(
      document.querySelectorAll(".navbar-right a")
    ).map((a) => ({ id: a.getAttribute("href")?.slice(1), el: a }));

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.id;
          const link = links.find((l) => l.id === id);
          if (!link) return;
          if (entry.isIntersecting) {
            links.forEach((l) => l.el.classList.remove("active"));
            link.el.classList.add("active");
          }
        });
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0.1 }
    );
    sections.forEach((sec) => io.observe(sec));
  }

  function initWebGLBackground() {
    const canvas = document.getElementById("gl");
    if (!canvas) return;

    const gl =
      canvas.getContext("webgl", { antialias: false, alpha: true }) ||
      canvas.getContext("experimental-webgl");
    if (!gl || state.prefersReducedMotion) {
      canvas.style.background =
        "radial-gradient(1100px 700px at 12% -8%, #0c1616 0, transparent)," +
        "radial-gradient(900px 520px at 105% 12%, #0a1212 0, transparent)";
      return;
    }

    const vertSrc = `attribute vec2 p;void main(){gl_Position=vec4(p,0,1);}`;
    const fragSrc = `
      precision highp float;
      uniform vec2 r; uniform float t; uniform float h;

      vec3 hsl(float H, float S, float L) {
        H = mod(H, 1.0);
        vec3 c = vec3(0.);
        float v = (L <= 0.5) ? (L * (1.0 + S)) : (L + S - L * S);
        if (v > 0.0) {
          float m = L + L - v;
          float sv = (v - m) / v;
          H *= 6.0;
          float i = floor(H);
          float f = H - i;
          if (mod(i, 2.0) == 0.0) f = 1.0 - f;
          float vsf = v * sv * f;
          if (i == 0.0) c = vec3(v, v - vsf, m);
          else if (i == 1.0) c = vec3(v - vsf, v, m);
          else if (i == 2.0) c = vec3(m, v, v - vsf);
          else if (i == 3.0) c = vec3(m, v - vsf, v);
          else if (i == 4.0) c = vec3(v - vsf, m, v);
          else c = vec3(v, m, v - vsf);
        }
        return c;
      }

      mat2 rot(float a) { return mat2(cos(a), -sin(a), sin(a), cos(a)); }
      vec2 hash(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return -1.0 + 2.0 * fract(sin(p) * 43758.5453);
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * r) / r.y;
        float time = t * 0.1;
        uv *= rot(time);

        vec3 final_color = vec3(0.0);
        float scale = 5.0;
        vec2 p = uv * scale;
        vec2 i = floor(p);
        vec2 f = fract(p);

        for (int y = -1; y <= 1; y++) {
          for (int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 neighbor_i = i + neighbor;
            vec2 point_pos = 0.5 + 0.5 * sin(time * 0.5 + hash(neighbor_i) * 6.2831);
            vec2 diff = neighbor + point_pos - f;
            float dist = length(diff);
            float point_glow = smoothstep(0.1, 0.0, dist);
            final_color += point_glow;

            if (x == 0 && y == 0) continue;
            
            vec2 center_point_pos = 0.5 + 0.5 * sin(time * 0.5 + hash(i) * 6.2831);
            vec2 center_to_neighbor = diff - (center_point_pos - f);
            float line_dist = length(center_to_neighbor);
            
            if (line_dist < 1.0) {
                float h_proj = clamp(dot(diff, -center_to_neighbor) / dot(center_to_neighbor, center_to_neighbor), 0.0, 1.0);
                float line_glow = smoothstep(0.05, 0.0, length(diff - h_proj * (-center_to_neighbor)));
                final_color += line_glow * 0.3 * (1.0 - line_dist);
            }
          }
        }

        vec3 accent_color = hsl(h / 360.0, 0.9, 0.6);
        final_color *= accent_color;
        final_color += hsl(h / 360.0, 0.8, 0.05);
        final_color *= smoothstep(1.5, 0.4, length(uv));

        gl_FragColor = vec4(final_color, 1.0);
      }
    `;

    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vertSrc);
    gl.compileShader(vs);
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fragSrc);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) return;
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) return;

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "r");
    const uTime = gl.getUniformLocation(prog, "t");
    const uHue = gl.getUniformLocation(prog, "h");

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.floor(canvas.clientWidth * dpr);
      const h = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.uniform2f(uRes, gl.drawingBufferWidth, gl.drawingBufferHeight);
    }
    const onResize = throttle(resize, 200);
    resize();
    window.addEventListener("resize", onResize);

    // Mouse listener removed

    let start = performance.now();
    const loop = (now) => {
      const t = (now - start) * 0.0005;
      gl.uniform1f(uTime, t);
      const hueVar = getComputedStyle(
        document.documentElement
      ).getPropertyValue("--hue");
      gl.uniform1f(uHue, parseFloat(hueVar || "210"));
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      state.rafId = requestAnimationFrame(loop);
    };
    state.rafId = requestAnimationFrame(loop);
  }

  function throttle(fn, wait) {
    let timer = null;
    return function (...args) {
      if (timer) return;
      timer = setTimeout(() => {
        fn.apply(this, args);
        timer = null;
      }, wait);
    };
  }

  function handleVisibilityPause() {
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        if (state.rafId) cancelAnimationFrame(state.rafId);
        state.rafId = null;
      } else {
        initWebGLBackground();
      }
    });
  }
})();