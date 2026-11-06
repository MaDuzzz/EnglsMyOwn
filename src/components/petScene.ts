import * as THREE from "three";

type Appearance = { color: string; pattern: string; theme: string };
const coatColors: Record<string, string> = {
  cream: "#e9d5bb",
  silver: "#a7b3bf",
  ginger: "#cd9866",
  cocoa: "#89665a",
  charcoal: "#48505e",
  snow: "#f3eee5",
};

export function createPetScene(
  host: HTMLElement,
  appearance: Appearance,
  onLost: () => void,
) {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(32, 1, 0.1, 30);
  camera.position.set(0, 2.15, 5.8);
  camera.lookAt(0, 0.9, 0);
  scene.add(new THREE.HemisphereLight(0xfff8ee, 0x8897ae, 2.7));
  const key = new THREE.DirectionalLight(0xfff0df, 3.4);
  key.position.set(-3, 5, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xb9d9ff, 1.7);
  rim.position.set(3, 2, -2);
  scene.add(rim);
  const materials: THREE.Material[] = [];
  const material = (color: string, roughness = 0.8) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness });
    materials.push(m);
    return m;
  };
  const fur = material(coatColors[appearance.color] || coatColors.cream),
    cream = material("#fff4e6"),
    patch = material("#75665e");
  const pink = material("#e2a6a4"),
    noseMat = material("#b97981"),
    ink = material("#292b33", 0.3),
    iris = material("#718a81", 0.35),
    white = material("#ffffff", 0.3);
  const padMat = material("#dec6d3"),
    padEdge = material("#c7a8ba");
  const sphere = new THREE.SphereGeometry(1, 32, 24);
  const ball = (
    parent: THREE.Object3D,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
  ) => {
    const mesh = new THREE.Mesh(sphere, mat);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    parent.add(mesh);
    return mesh;
  };
  ball(scene, padMat, 0, 0.15, 0, 1.12, 0.17, 0.86);
  ball(scene, padEdge, 0, 0.07, 0, 1.08, 0.09, 0.82);
  // Soft contact shadow, drawn once. No per-frame shadow maps on mobile.
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = shadowCanvas.height = 128;
  const ctx = shadowCanvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  gradient.addColorStop(0, "rgba(36,25,37,.28)");
  gradient.addColorStop(1, "rgba(36,25,37,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas),
    shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
    });
  materials.push(shadowMat);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.45), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.315;
  scene.add(shadow);
  const cat = new THREE.Group();
  scene.add(cat);
  const body = ball(cat, fur, 0, 0.67, -0.12, 0.44, 0.43, 0.59);
  ball(cat, cream, 0, 0.56, 0.28, 0.29, 0.29, 0.24);
  for (const x of [-0.27, 0.27])
    ball(cat, fur, x, 0.38, 0.44, 0.16, 0.13, 0.25);
  const head = new THREE.Group();
  head.position.set(0, 1.17, 0.3);
  cat.add(head);
  ball(head, fur, 0, 0, 0, 0.61, 0.52, 0.48);
  const earShape = new THREE.Shape();
  earShape.moveTo(-0.16, 0);
  earShape.quadraticCurveTo(-0.13, 0.22, 0, 0.36);
  earShape.quadraticCurveTo(0.15, 0.25, 0.17, 0);
  earShape.closePath();
  const earGeometry = new THREE.ExtrudeGeometry(earShape, {
    depth: 0.09,
    bevelEnabled: true,
    bevelSize: 0.05,
    bevelThickness: 0.055,
    bevelSegments: 3,
    steps: 1,
    curveSegments: 12,
  });
  const ears: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const ear = new THREE.Group();
    ear.position.set(side * 0.38, 0.34, -0.06);
    ear.rotation.z = -side * 0.32;
    head.add(ear);
    ear.add(new THREE.Mesh(earGeometry, fur));
    const inner = new THREE.Mesh(earGeometry, pink);
    inner.scale.set(0.57, 0.61, 0.25);
    inner.position.set(0, 0.045, 0.135);
    ear.add(inner);
    ears.push(ear);
  }
  const eyes: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(side * 0.225, 0.045, 0.423);
    head.add(eye);
    eyes.push(eye);
    ball(eye, iris, 0, 0, 0, 0.103, 0.117, 0.045);
    ball(eye, ink, 0, -0.004, 0.037, 0.065, 0.088, 0.025);
    ball(eye, white, -0.022, 0.037, 0.06, 0.022, 0.026, 0.009);
    ball(head, cream, side * 0.075, -0.16, 0.431, 0.106, 0.073, 0.058);
    ball(head, pink, side * 0.32, -0.11, 0.419, 0.08, 0.028, 0.012);
  }
  ball(head, noseMat, 0, -0.115, 0.494, 0.047, 0.032, 0.025);
  const lineMat = new THREE.MeshStandardMaterial({
    color: 0x71564f,
    roughness: 1,
  });
  materials.push(lineMat);
  const line = (points: THREE.Vector3[], radius = 0.004) => {
    const m = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points),
        14,
        radius,
        5,
        false,
      ),
      lineMat,
    );
    head.add(m);
  };
  for (const s of [-1, 1]) {
    line(
      [
        new THREE.Vector3(0, -0.14, 0.49),
        new THREE.Vector3(s * 0.04, -0.195, 0.48),
        new THREE.Vector3(s * 0.09, -0.18, 0.47),
      ],
      0.006,
    );
    for (let i = 0; i < 2; i++)
      line(
        [
          new THREE.Vector3(s * 0.19, -0.15 - i * 0.04, 0.44),
          new THREE.Vector3(s * 0.42, -0.12 - i * 0.065, 0.45),
          new THREE.Vector3(s * 0.61, -0.08 - i * 0.09, 0.43),
        ],
        0.003,
      );
  }
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0.32, 0.4, -0.43);
  cat.add(tailPivot);
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.48, 0.05, -0.12),
    new THREE.Vector3(0.67, 0.18, 0.12),
    new THREE.Vector3(0.52, 0.3, 0.35),
  ]);
  tailPivot.add(
    new THREE.Mesh(
      new THREE.TubeGeometry(tailCurve, 28, 0.075, 12, false),
      fur,
    ),
  );
  const markings = new Map<string, THREE.Group>();
  for (const name of ["tabby", "tuxedo", "spotted"]) {
    const group = new THREE.Group();
    head.add(group);
    markings.set(name, group);
  }
  for (const x of [-0.18, 0, 0.18]) {
    const stripe = ball(
      markings.get("tabby")!,
      patch,
      x,
      0.325,
      0.355,
      0.027,
      0.115,
      0.014,
    );
    stripe.rotation.z = -x;
  }
  ball(markings.get("tuxedo")!, cream, 0, -0.25, 0.396, 0.22, 0.15, 0.07);
  for (const s of [-1, 1])
    for (let i = 0; i < 3; i++)
      ball(
        markings.get("spotted")!,
        patch,
        s * (0.32 + i * 0.035),
        0.19 - i * 0.085,
        0.36,
        0.05,
        0.032,
        0.015,
      );
  const bodyMarkings = new Map<string, THREE.Group>();
  for (const name of ["tabby", "tuxedo", "spotted"]) {
    const group = new THREE.Group();
    cat.add(group);
    bodyMarkings.set(name, group);
  }
  ball(bodyMarkings.get("tuxedo")!, cream, 0, 0.79, 0.25, 0.29, 0.24, 0.15);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      ball(
        bodyMarkings.get("tabby")!,
        patch,
        side * 0.38,
        0.61 + i * 0.1,
        0.07,
        0.035,
        0.025,
        0.26,
      );
      ball(
        bodyMarkings.get("spotted")!,
        patch,
        side * 0.31,
        0.57 + i * 0.11,
        0.28,
        0.05,
        0.035,
        0.025,
      );
    }
  }
  let current = appearance,
    pointerX = 0,
    pointerY = 0,
    greeting = -10,
    lastFrame = 0,
    elapsed = 0,
    lastTime = 0,
    visible = true,
    disposed = false;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const render = (time: number) => {
    if (disposed || !visible || document.hidden) return;
    if (time - lastFrame < 1000 / 30 && !reduce.matches) return;
    const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
    lastTime = time;
    lastFrame = time;
    elapsed += delta;
    const t = elapsed,
      wave = Math.max(0, 1 - (t - greeting) / 2.5),
      motion = reduce.matches ? 0 : 1;
    body.scale.y = 0.43 * (1 + Math.sin(t * 1.7) * 0.018 * motion);
    cat.rotation.y = THREE.MathUtils.damp(
      cat.rotation.y,
      pointerX * 0.45 + Math.sin(t * 0.42) * 0.055 * motion,
      7,
      delta,
    );
    head.rotation.y = THREE.MathUtils.damp(
      head.rotation.y,
      pointerX * 0.2 + Math.sin(t * 0.65) * 0.035 * motion,
      6,
      delta,
    );
    head.rotation.x = THREE.MathUtils.damp(
      head.rotation.x,
      pointerY * 0.12 + Math.sin(t * 1.4) * 0.025 * motion,
      6,
      delta,
    );
    head.rotation.z =
      (Math.sin(t * 0.6) * 0.025 + Math.sin((t - greeting) * 5) * wave * 0.1) *
      motion;
    ears.forEach((ear, i) => {
      ear.rotation.z =
        (i === 0 ? 0.32 : -0.32) +
        Math.pow(Math.max(0, Math.sin(t * 0.9 + i)), 22) * 0.16 * motion;
    });
    const blink = Math.pow(Math.max(0, Math.cos(t * 1.35)), 36);
    eyes.forEach((eye) => {
      eye.scale.y = 1 - blink * 0.92 * motion;
    });
    tailPivot.rotation.y =
      (Math.sin(t * 1.3) * 0.1 + Math.sin(t * 6) * wave * 0.22) * motion;
    renderer.render(scene, camera);
  };
  const resize = () => {
    if (!host.clientWidth) return;
    const w = host.clientWidth,
      h = host.clientHeight || 280;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  const visibility = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    lastTime = 0;
    updateLoop();
  });
  visibility.observe(host);
  function updateLoop() {
    if (reduce.matches) {
      body.scale.y = 0.43;
      cat.rotation.set(0, 0, 0);
      head.rotation.set(0, 0, 0);
      tailPivot.rotation.y = 0;
      eyes.forEach((eye) => {
        eye.scale.y = 1;
      });
    }
    renderer.setAnimationLoop(
      visible && !document.hidden && !reduce.matches ? render : null,
    );
    if (visible && !document.hidden) renderer.render(scene, camera);
  }
  const lost = (event: Event) => {
    event.preventDefault();
    renderer.setAnimationLoop(null);
    onLost();
  };
  renderer.domElement.addEventListener("webglcontextlost", lost);
  document.addEventListener("visibilitychange", updateLoop);
  reduce.addEventListener("change", updateLoop);
  function update(next: Appearance) {
    current = next;
    fur.color.set(coatColors[current.color] || coatColors.cream);
    patch.color.set(
      current.color === "charcoal" || current.color === "cocoa"
        ? "#d7c6ad"
        : "#77645c",
    );
    markings.forEach((group, name) => {
      group.visible = name === current.pattern;
    });
    bodyMarkings.forEach((group, name) => {
      group.visible = name === current.pattern;
    });
    padMat.color.set(current.theme === "dark" ? "#40566d" : "#dec6d3");
    padEdge.color.set(current.theme === "dark" ? "#2b3d50" : "#c7a8ba");
    renderer.render(scene, camera);
  }
  update(current);
  resize();
  updateLoop();
  return {
    update,
    look: (x: number, y: number) => {
      pointerX = x;
      pointerY = y;
    },
    greet: () => {
      greeting = elapsed;
    },
    dispose: () => {
      disposed = true;
      renderer.setAnimationLoop(null);
      observer.disconnect();
      visibility.disconnect();
      document.removeEventListener("visibilitychange", updateLoop);
      reduce.removeEventListener("change", updateLoop);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      const geometries = new Set<THREE.BufferGeometry>();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) geometries.add(object.geometry);
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      shadowTexture.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
