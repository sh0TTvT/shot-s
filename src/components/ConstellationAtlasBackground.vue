<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import {
  atlasPalette,
  createAtlasScene,
  type AtlasConstellation,
  type AtlasFieldMode,
  type AtlasScene,
  type AtlasStar,
} from "../utils/constellationField";
import {
  DEFAULT_LOCKED_CAMERA,
  cameraAtTime,
  createCameraBasis,
  interpolateSkyCamera,
  projectVector,
  type CameraBasis,
  type ProjectedPoint,
  type SkyCamera,
} from "../utils/celestialProjection";

const props = withDefaults(defineProps<{ mode?: AtlasFieldMode }>(), {
  mode: "chart",
});

type ProjectedStar = {
  source: AtlasStar;
  x: number;
  y: number;
  radius: number;
  quietFactor: number;
  probeEnergy: number;
  twinkle: number;
};

type TraceState = {
  constellation?: AtlasConstellation;
  progress: number;
  alpha: number;
};

const canvasElement = ref<HTMLCanvasElement | null>(null);
const scene: AtlasScene = createAtlasScene();
const projectedStarBuffer: ProjectedStar[] = [];

let context: CanvasRenderingContext2D | null = null;
let animationFrame: number | undefined;
let resizeObserver: ResizeObserver | undefined;
let reducedMotionQuery: MediaQueryList | undefined;
let width = 0;
let height = 0;
let pixelRatio = 1;
let projectedStarCount = 0;
let previousTime = 0;
let lastRenderedAt = 0;
let simulationElapsed = 0;
let reduceMotion = false;
let cameraInitialized = false;
let currentCamera: SkyCamera = { ...DEFAULT_LOCKED_CAMERA };
let lockedCamera: SkyCamera | undefined;
let reducedMotionCamera: SkyCamera | undefined;
let activeConstellation: AtlasConstellation | undefined;
let activeSince = 0;
let pointerX = 0.5;
let pointerY = 0.5;
let pointerTargetX = 0.5;
let pointerTargetY = 0.5;
let pointerPresence = 0;
let pointerPresenceTarget = 0;

const rgba = (color: readonly number[], alpha: number) =>
  `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const smoothstep = (minimum: number, maximum: number, value: number) => {
  const progress = clamp(
    (value - minimum) / Math.max(0.0001, maximum - minimum),
    0,
    1,
  );
  return progress * progress * (3 - 2 * progress);
};

const dot = (
  left: CameraBasis["forward"],
  right: CameraBasis["forward"],
) => left.x * right.x + left.y * right.y + left.z * right.z;

const modeSettings = {
  chart: {
    fieldAlpha: 0.24,
    edgeAlpha: 0.13,
    anchorAlpha: 0.58,
    probeStrength: 0.9,
    labelLimit: 5,
    frameInterval: 0,
    mobileMagnitude: 5.35,
  },
  drift: {
    fieldAlpha: 0.16,
    edgeAlpha: 0.07,
    anchorAlpha: 0.4,
    probeStrength: 0.62,
    labelLimit: 2,
    frameInterval: 32,
    mobileMagnitude: 5.1,
  },
  locked: {
    fieldAlpha: 0.1,
    edgeAlpha: 0.045,
    anchorAlpha: 0.28,
    probeStrength: 0,
    labelLimit: 1,
    frameInterval: 0,
    mobileMagnitude: 5,
  },
} as const;

const settingsForMode = () => modeSettings[props.mode];

const rawCameraFromCurrent = (): SkyCamera => ({
  ...currentCamera,
  // WHY: 移动端扩大的 FOV 只属于投影适配，缓存锁定姿态前需还原，避免每次模式切换重复叠加。
  fov: width < 680 ? Math.max(20, currentCamera.fov - 18) : currentCamera.fov,
});

const quietFactorAt = (x: number, y: number) => {
  const horizontal = (x / Math.max(1, width) - 0.5) / 0.34;
  const vertical = (y / Math.max(1, height) - 0.5) / 0.24;
  const distance = Math.hypot(horizontal, vertical);

  if (props.mode === "chart") {
    return 0.08 + smoothstep(0.6, 1.12, distance) * 0.92;
  }
  if (props.mode === "drift") {
    return 0.38 + smoothstep(0.68, 1.14, distance) * 0.62;
  }
  return 0.58;
};

const hudFactorAt = (x: number, y: number) => {
  const normalizedX = x / Math.max(1, width);
  const normalizedY = y / Math.max(1, height);
  const edgeX = Math.min(normalizedX, 1 - normalizedX);
  const edgeY = Math.min(normalizedY, 1 - normalizedY);
  const cornerDistance = Math.hypot(edgeX / 0.2, edgeY / 0.19);
  return 0.24 + smoothstep(0.72, 1.2, cornerDistance) * 0.76;
};

const visibilityFactorAt = (x: number, y: number) =>
  quietFactorAt(x, y) * hudFactorAt(x, y);

const probeRadius = () => clamp(Math.min(width, height) * 0.31, 156, 230);

const probeEnergyAt = (x: number, y: number) => {
  if (reduceMotion || props.mode === "locked") return 0;
  const distance = Math.hypot(x - pointerX * width, y - pointerY * height);
  const radius = probeRadius();
  return (1 - smoothstep(radius * 0.22, radius, distance)) * pointerPresence;
};

const pointToSegmentDistance = (
  pointX: number,
  pointY: number,
  start: ProjectedPoint,
  end: ProjectedPoint,
) => {
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const lengthSquared = segmentX * segmentX + segmentY * segmentY;
  if (lengthSquared === 0) return Math.hypot(pointX - start.x, pointY - start.y);
  const amount = clamp(
    ((pointX - start.x) * segmentX + (pointY - start.y) * segmentY) /
      lengthSquared,
    0,
    1,
  );
  return Math.hypot(
    pointX - (start.x + segmentX * amount),
    pointY - (start.y + segmentY * amount),
  );
};

const edgeProbeEnergyAt = (start: ProjectedPoint, end: ProjectedPoint) => {
  if (reduceMotion || props.mode === "locked") return 0;
  const radius = probeRadius();
  const distance = pointToSegmentDistance(
    pointerX * width,
    pointerY * height,
    start,
    end,
  );
  return (1 - smoothstep(radius * 0.16, radius * 0.88, distance)) * pointerPresence;
};

const segmentTouchesViewport = (start: ProjectedPoint, end: ProjectedPoint) => {
  if (!start.inFront || !end.inFront) return false;
  const padding = 48;
  return !(
    (start.x < -padding && end.x < -padding) ||
    (start.x > width + padding && end.x > width + padding) ||
    (start.y < -padding && end.y < -padding) ||
    (start.y > height + padding && end.y > height + padding)
  );
};

const projectFieldStars = (basis: CameraBasis, elapsed: number) => {
  const compactViewport = width < 680;
  const magnitudeLimit = compactViewport ? settingsForMode().mobileMagnitude : 6;
  projectedStarCount = 0;

  for (const star of scene.stars) {
    if (star.magnitude > magnitudeLimit) continue;
    const projected = projectVector(star.vector, basis);
    if (!projected.visible) continue;

    const probeEnergy = probeEnergyAt(projected.x, projected.y);
    const pointerPixelX = pointerX * width;
    const pointerPixelY = pointerY * height;
    const fromPointerX = projected.x - pointerPixelX;
    const fromPointerY = projected.y - pointerPixelY;
    const pointerDistance = Math.max(1, Math.hypot(fromPointerX, fromPointerY));
    const intrusionOffset = probeEnergy * 1.15;
    const x = projected.x + (fromPointerX / pointerDistance) * intrusionOffset;
    const y = projected.y + (fromPointerY / pointerDistance) * intrusionOffset;
    const luminosity = 1 - smoothstep(-1.4, 6.15, star.magnitude);
    const target = projectedStarBuffer[projectedStarCount] ?? {
      source: star,
      x: 0,
      y: 0,
      radius: 0,
      quietFactor: 0,
      probeEnergy: 0,
      twinkle: 1,
    };

    target.source = star;
    target.x = x;
    target.y = y;
    target.radius = 0.34 + Math.pow(luminosity, 1.72) * 2.05;
    target.quietFactor = visibilityFactorAt(x, y);
    target.probeEnergy = probeEnergy;
    target.twinkle = reduceMotion || props.mode === "locked"
      ? 0.94
      : 0.88 + Math.sin(elapsed * 0.48 + star.phase) * 0.12;
    projectedStarBuffer[projectedStarCount] = target;
    projectedStarCount += 1;
  }
};

const bestVisibleConstellation = (basis: CameraBasis) => {
  let candidate: AtlasConstellation | undefined;
  let candidateScore = -Infinity;

  for (const constellation of scene.constellations) {
    const labelPoint = projectVector(constellation.labelVector, basis);
    if (!labelPoint.visible) continue;
    const centerScore = dot(constellation.labelVector, basis.forward);
    const score = centerScore - Math.max(0, constellation.rank - 1) * 0.035;
    if (score <= candidateScore) continue;
    candidate = constellation;
    candidateScore = score;
  }

  return candidate;
};

const traceStateFor = (basis: CameraBasis, elapsed: number): TraceState => {
  if (props.mode !== "chart" || reduceMotion) {
    return { progress: 0, alpha: 0 };
  }

  const candidate = bestVisibleConstellation(basis);
  const activePoint = activeConstellation
    ? projectVector(activeConstellation.labelVector, basis)
    : undefined;
  const canChange = elapsed - activeSince > 7.5 || !activePoint?.visible;

  if (!activeConstellation || (candidate && candidate !== activeConstellation && canChange)) {
    activeConstellation = candidate;
    activeSince = elapsed;
  }

  const activeAge = Math.max(0, elapsed - activeSince);
  return {
    constellation: activeConstellation,
    progress: smoothstep(0.35, 4.9, activeAge),
    alpha: smoothstep(0.05, 1.1, activeAge),
  };
};

const drawFieldStars = () => {
  const drawingContext = context;
  if (!drawingContext) return;
  const settings = settingsForMode();

  for (let index = 0; index < projectedStarCount; index += 1) {
    const star = projectedStarBuffer[index];
    if (!star) continue;
    const luminosity = 1 - smoothstep(-1.4, 6.15, star.source.magnitude);
    const activity = star.probeEnergy * settings.probeStrength;
    const alpha = clamp(
      (settings.fieldAlpha * (0.32 + luminosity * 0.82) * star.twinkle +
        activity * 0.2) * star.quietFactor,
      0,
      0.68,
    );
    const color = activity > 0.1
      ? atlasPalette.cyan
      : star.source.colorIndex < 0.18
        ? atlasPalette.white
        : atlasPalette.muted;
    const radius = star.radius + activity * 0.55;

    if (radius > 1.48 && alpha > 0.12) {
      drawingContext.beginPath();
      drawingContext.arc(star.x, star.y, radius * 2.7, 0, Math.PI * 2);
      drawingContext.fillStyle = rgba(color, alpha * 0.055);
      drawingContext.fill();
    }

    drawingContext.fillStyle = rgba(color, alpha);
    if (radius < 0.76) {
      const size = Math.max(0.52, radius * 1.18);
      drawingContext.fillRect(star.x - size / 2, star.y - size / 2, size, size);
      continue;
    }

    drawingContext.beginPath();
    drawingContext.arc(star.x, star.y, radius * 0.58, 0, Math.PI * 2);
    drawingContext.fill();
  }
};

const segmentCountFor = (constellation?: AtlasConstellation) =>
  constellation?.lines.reduce(
    (total, line) => total + Math.max(0, line.vectors.length - 1),
    0,
  ) ?? 0;

const drawConstellationEdges = (basis: CameraBasis, trace: TraceState) => {
  const drawingContext = context;
  if (!drawingContext) return;
  const settings = settingsForMode();
  const traceSegmentCount = segmentCountFor(trace.constellation);
  let traceSegmentIndex = 0;

  for (const constellation of scene.constellations) {
    const isActive = constellation === trace.constellation;
    for (const line of constellation.lines) {
      for (let index = 1; index < line.vectors.length; index += 1) {
        const start = projectVector(line.vectors[index - 1]!, basis);
        const end = projectVector(line.vectors[index]!, basis);
        const currentTraceIndex = traceSegmentIndex;
        if (isActive) traceSegmentIndex += 1;
        if (!segmentTouchesViewport(start, end)) continue;

        // WHY: 临近视锥侧面的短天球弧会被透视放大，超长屏幕线应视为裁剪残片。
        if (Math.hypot(end.x - start.x, end.y - start.y) > Math.max(width, height) * 0.72) {
          continue;
        }

        const quietFactor = Math.min(
          visibilityFactorAt(start.x, start.y),
          visibilityFactorAt(end.x, end.y),
        );
        const rankFactor = constellation.rank <= 1 ? 1 : 0.72;
        drawingContext.beginPath();
        drawingContext.moveTo(start.x, start.y);
        drawingContext.lineTo(end.x, end.y);
        drawingContext.strokeStyle = rgba(
          constellation.rank <= 1 ? atlasPalette.white : atlasPalette.muted,
          settings.edgeAlpha * rankFactor * quietFactor,
        );
        drawingContext.lineWidth = 0.55;
        drawingContext.stroke();

        const probeActivity = edgeProbeEnergyAt(start, end) * settings.probeStrength;
        if (probeActivity > 0.02) {
          drawingContext.beginPath();
          drawingContext.moveTo(start.x, start.y);
          drawingContext.lineTo(end.x, end.y);
          drawingContext.strokeStyle = rgba(
            atlasPalette.cyan,
            clamp(probeActivity * 0.46 * quietFactor, 0, 0.46),
          );
          drawingContext.lineWidth = 0.66 + probeActivity * 0.48;
          drawingContext.stroke();
        }

        if (!isActive || traceSegmentCount === 0) continue;
        const reveal = clamp(
          trace.progress * traceSegmentCount - currentTraceIndex,
          0,
          1,
        );
        if (reveal <= 0) continue;
        drawingContext.beginPath();
        drawingContext.moveTo(start.x, start.y);
        drawingContext.lineTo(
          start.x + (end.x - start.x) * reveal,
          start.y + (end.y - start.y) * reveal,
        );
        drawingContext.strokeStyle = rgba(
          atlasPalette.cyan,
          clamp((0.18 + trace.alpha * 0.42) * quietFactor, 0, 0.58),
        );
        drawingContext.lineWidth = 0.82 + trace.alpha * 0.32;
        drawingContext.stroke();
      }
    }
  }
};

const drawAnchorStars = (basis: CameraBasis, trace: TraceState) => {
  const drawingContext = context;
  if (!drawingContext) return;
  const settings = settingsForMode();

  for (const constellation of scene.constellations) {
    const isActive = constellation === trace.constellation;
    for (let index = 0; index < constellation.anchorVectors.length; index += 1) {
      const point = projectVector(constellation.anchorVectors[index]!, basis);
      if (!point.visible) continue;
      const quietFactor = visibilityFactorAt(point.x, point.y);
      const probeActivity = probeEnergyAt(point.x, point.y) * settings.probeStrength;
      const autoActivity = isActive ? trace.alpha * 0.66 : 0;
      const activity = Math.max(probeActivity, autoActivity);
      const rankFactor = constellation.rank <= 1 ? 1 : 0.68;
      const alpha = clamp(
        (settings.anchorAlpha * rankFactor + activity * 0.28) * quietFactor,
        0,
        0.82,
      );
      const color = activity > 0.1 ? atlasPalette.cyan : atlasPalette.white;
      const coreRadius = 0.62 + rankFactor * 0.34 + activity * 0.3;

      if (activity > 0.08) {
        drawingContext.beginPath();
        drawingContext.arc(point.x, point.y, 4.2 + activity * 3.4, 0, Math.PI * 2);
        drawingContext.fillStyle = rgba(color, activity * 0.052 * quietFactor);
        drawingContext.fill();
      }

      drawingContext.beginPath();
      drawingContext.arc(point.x, point.y, coreRadius, 0, Math.PI * 2);
      drawingContext.fillStyle = rgba(color, alpha);
      drawingContext.fill();

      if (!isActive || trace.progress < 0.45 || index % 3 !== 0) continue;
      const inner = coreRadius + 2.1;
      const outer = inner + 3.2;
      drawingContext.beginPath();
      drawingContext.moveTo(point.x - outer, point.y);
      drawingContext.lineTo(point.x - inner, point.y);
      drawingContext.moveTo(point.x + inner, point.y);
      drawingContext.lineTo(point.x + outer, point.y);
      drawingContext.moveTo(point.x, point.y - outer);
      drawingContext.lineTo(point.x, point.y - inner);
      drawingContext.moveTo(point.x, point.y + inner);
      drawingContext.lineTo(point.x, point.y + outer);
      drawingContext.strokeStyle = rgba(color, alpha * 0.58);
      drawingContext.lineWidth = 0.55;
      drawingContext.stroke();
    }
  }
};

const drawPointerTriangulation = () => {
  const drawingContext = context;
  if (
    !drawingContext ||
    reduceMotion ||
    props.mode === "locked" ||
    pointerPresence < 0.035
  ) {
    return;
  }

  const pointerPixelX = pointerX * width;
  const pointerPixelY = pointerY * height;
  const radius = probeRadius();
  const nearest: { star: ProjectedStar; distance: number }[] = [];

  // WHY: 只维护最近三个亮星，避免旧实现每帧为全部星点创建数组并排序。
  for (let index = 0; index < projectedStarCount; index += 1) {
    const star = projectedStarBuffer[index];
    if (!star || star.radius < 0.68) continue;
    const distance = Math.hypot(star.x - pointerPixelX, star.y - pointerPixelY);
    if (distance >= radius) continue;
    const insertionIndex = nearest.findIndex((entry) => distance < entry.distance);
    if (insertionIndex === -1) nearest.push({ star, distance });
    else nearest.splice(insertionIndex, 0, { star, distance });
    if (nearest.length > 3) nearest.pop();
  }
  if (nearest.length < 3) return;

  const activity =
    (1 - smoothstep(radius * 0.42, radius, nearest[2]!.distance)) * pointerPresence;
  if (activity <= 0.01) return;
  const quietFactor = Math.min(...nearest.map(({ star }) => star.quietFactor));
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.moveTo(nearest[0]!.star.x, nearest[0]!.star.y);
  drawingContext.lineTo(nearest[1]!.star.x, nearest[1]!.star.y);
  drawingContext.lineTo(nearest[2]!.star.x, nearest[2]!.star.y);
  drawingContext.closePath();
  drawingContext.setLineDash([3, 6]);
  drawingContext.strokeStyle = rgba(
    atlasPalette.cyan,
    clamp(activity * 0.18 * quietFactor, 0, 0.16),
  );
  drawingContext.lineWidth = 0.55;
  drawingContext.stroke();
  drawingContext.restore();
};

const drawConstellationLabels = (basis: CameraBasis, trace: TraceState) => {
  const drawingContext = context;
  if (!drawingContext) return;
  const candidates: {
    constellation: AtlasConstellation;
    point: ProjectedPoint;
    score: number;
  }[] = [];

  for (const constellation of scene.constellations) {
    if (constellation.rank > 2 && constellation !== trace.constellation) continue;
    const point = projectVector(constellation.labelVector, basis);
    if (!point.visible) continue;
    const activeBoost = constellation === trace.constellation ? 2 : 0;
    candidates.push({
      constellation,
      point,
      score: dot(constellation.labelVector, basis.forward) + activeBoost,
    });
  }
  candidates.sort((left, right) => right.score - left.score);
  const labelLimit = width < 680 ? 1 : settingsForMode().labelLimit;

  drawingContext.save();
  drawingContext.font = "500 9px 'IBM Plex Mono', monospace";
  drawingContext.textBaseline = "middle";
  for (const candidate of candidates.slice(0, labelLimit)) {
    const { constellation, point } = candidate;
    const isActive = constellation === trace.constellation;
    const quietFactor = visibilityFactorAt(point.x, point.y);
    const alpha = isActive
      ? trace.alpha * 0.72 * quietFactor
      : 0.22 * quietFactor * (constellation.rank <= 1 ? 1 : 0.72);
    if (alpha < 0.018) continue;
    const direction = point.x > width * 0.72 ? -1 : 1;
    const lineStart = point.x + direction * 7;
    const lineEnd = point.x + direction * (isActive ? 24 : 14);
    const textX = lineEnd + direction * 5;

    drawingContext.beginPath();
    drawingContext.moveTo(lineStart, point.y - 7);
    drawingContext.lineTo(lineEnd, point.y - 7);
    if (isActive) drawingContext.lineTo(lineEnd, point.y - 3);
    drawingContext.strokeStyle = rgba(
      isActive ? atlasPalette.cyan : atlasPalette.muted,
      alpha * (isActive ? 0.72 : 0.42),
    );
    drawingContext.lineWidth = 0.55;
    drawingContext.stroke();

    drawingContext.textAlign = direction > 0 ? "left" : "right";
    drawingContext.fillStyle = rgba(
      isActive ? atlasPalette.white : atlasPalette.muted,
      alpha,
    );
    drawingContext.fillText(
      isActive
        ? `${constellation.code} / ${constellation.label}`
        : `${constellation.code}  ${constellation.label}`,
      textX,
      point.y - 7,
    );
  }
  drawingContext.restore();
};

const drawFrame = (time: number) => {
  animationFrame = undefined;
  const drawingContext = context;
  if (!drawingContext) return;

  const mobileInterval = width < 680 ? 28 : 0;
  const frameInterval = Math.max(settingsForMode().frameInterval, mobileInterval);
  if (
    frameInterval > 0 &&
    !reduceMotion &&
    lastRenderedAt > 0 &&
    time - lastRenderedAt < frameInterval
  ) {
    requestRender();
    return;
  }
  lastRenderedAt = time;

  const delta = previousTime ? Math.min(time - previousTime, 64) / 1000 : 1 / 60;
  previousTime = time;
  if (!reduceMotion && props.mode !== "locked") simulationElapsed += delta;

  const pointerEase = 1 - Math.exp(-delta * 7.8);
  const presenceEase =
    1 - Math.exp(-delta * (pointerPresenceTarget > pointerPresence ? 8.6 : 2.2));
  pointerX += (pointerTargetX - pointerX) * pointerEase;
  pointerY += (pointerTargetY - pointerY) * pointerEase;
  pointerPresence += (pointerPresenceTarget - pointerPresence) * presenceEase;

  const targetCamera = cameraAtTime({
    elapsed: simulationElapsed,
    mode: props.mode,
    reducedMotion: reduceMotion,
    pointerX,
    pointerY,
    pointerPresence,
    lockedCamera: reduceMotion ? reducedMotionCamera : lockedCamera,
  });
  const viewportCamera = width < 680
    ? { ...targetCamera, fov: Math.min(102, targetCamera.fov + 18) }
    : targetCamera;

  if (!cameraInitialized || reduceMotion || props.mode === "locked") {
    currentCamera = { ...viewportCamera };
    cameraInitialized = true;
  } else {
    // WHY: chart/drift 采用不同巡航节奏，球面缓动能让路由切换保持连续而不是瞬移。
    currentCamera = interpolateSkyCamera(
      currentCamera,
      viewportCamera,
      1 - Math.exp(-delta * 2.35),
    );
  }

  const basis = createCameraBasis(currentCamera, width, height);
  const trace = traceStateFor(basis, simulationElapsed);
  drawingContext.clearRect(0, 0, width, height);
  projectFieldStars(basis, simulationElapsed);
  drawFieldStars();
  drawConstellationEdges(basis, trace);
  drawPointerTriangulation();
  drawAnchorStars(basis, trace);
  drawConstellationLabels(basis, trace);

  if (!reduceMotion && props.mode !== "locked" && !document.hidden) requestRender();
};

function requestRender() {
  if (animationFrame !== undefined || document.hidden) return;
  animationFrame = window.requestAnimationFrame(drawFrame);
}

const resize = () => {
  const canvas = canvasElement.value;
  if (!canvas) return;
  const bounds = canvas.getBoundingClientRect();
  const nextWidth = Math.max(1, bounds.width);
  const nextHeight = Math.max(1, bounds.height);
  const deviceCap = nextWidth < 680 ? 1.25 : 1.5;
  const pixelBudgetRatio = Math.sqrt(5_000_000 / (nextWidth * nextHeight));
  const nextPixelRatio = Math.min(window.devicePixelRatio || 1, deviceCap, pixelBudgetRatio);

  if (
    nextWidth === width &&
    nextHeight === height &&
    nextPixelRatio === pixelRatio &&
    context
  ) {
    return;
  }

  width = nextWidth;
  height = nextHeight;
  pixelRatio = nextPixelRatio;
  canvas.width = Math.ceil(width * pixelRatio);
  canvas.height = Math.ceil(height * pixelRatio);
  context = canvas.getContext("2d");
  context?.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  if (context) {
    context.lineCap = "round";
    context.lineJoin = "round";
  }
  previousTime = 0;
  lastRenderedAt = 0;
  requestRender();
};

const handlePointerMove = (event: PointerEvent) => {
  const canvas = canvasElement.value;
  if (!canvas || event.pointerType === "touch" || reduceMotion || props.mode === "locked") {
    return;
  }
  const bounds = canvas.getBoundingClientRect();
  pointerTargetX = clamp(
    (event.clientX - bounds.left) / Math.max(1, bounds.width),
    0,
    1,
  );
  pointerTargetY = clamp(
    (event.clientY - bounds.top) / Math.max(1, bounds.height),
    0,
    1,
  );
  pointerPresenceTarget = 1;
  requestRender();
};

const resetPointer = () => {
  pointerTargetX = 0.5;
  pointerTargetY = 0.5;
  pointerPresenceTarget = 0;
  requestRender();
};

const handleMotionPreference = (event: MediaQueryListEvent) => {
  if (event.matches) reducedMotionCamera = rawCameraFromCurrent();
  reduceMotion = event.matches;
  if (!reduceMotion) reducedMotionCamera = undefined;
  resetPointer();
  previousTime = 0;
  lastRenderedAt = 0;
  requestRender();
};

const handleVisibilityChange = () => {
  if (document.hidden) {
    if (animationFrame !== undefined) window.cancelAnimationFrame(animationFrame);
    animationFrame = undefined;
    return;
  }
  previousTime = 0;
  lastRenderedAt = 0;
  requestRender();
};

watch(
  () => props.mode,
  (mode, previousMode) => {
    if (mode === "locked") {
      lockedCamera = rawCameraFromCurrent();
      resetPointer();
    } else if (previousMode === "locked") {
      lockedCamera = undefined;
    }
    if (mode === "chart") {
      activeConstellation = undefined;
      activeSince = simulationElapsed;
    }
    previousTime = 0;
    lastRenderedAt = 0;
    requestRender();
  },
);

onMounted(() => {
  const canvas = canvasElement.value;
  if (!canvas) return;
  resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  reduceMotion = reducedMotionQuery.matches;
  reducedMotionQuery.addEventListener("change", handleMotionPreference);
  window.addEventListener("pointermove", handlePointerMove, { passive: true });
  window.addEventListener("blur", resetPointer);
  document.documentElement.addEventListener("pointerleave", resetPointer);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  resize();
  requestRender();
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  reducedMotionQuery?.removeEventListener("change", handleMotionPreference);
  window.removeEventListener("pointermove", handlePointerMove);
  window.removeEventListener("blur", resetPointer);
  document.documentElement.removeEventListener("pointerleave", resetPointer);
  document.removeEventListener("visibilitychange", handleVisibilityChange);
  if (animationFrame !== undefined) window.cancelAnimationFrame(animationFrame);
});
</script>

<template>
  <div
    class="atlas-background"
    :class="`atlas-background--${props.mode}`"
    :data-field-mode="props.mode"
    aria-hidden="true"
  >
    <canvas ref="canvasElement" class="atlas-background__canvas" />
  </div>
</template>

<style scoped>
.atlas-background {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  background:
    radial-gradient(circle at 19% 18%, rgba(232, 236, 233, 0.035), transparent 26%),
    radial-gradient(circle at 82% 73%, rgba(85, 230, 220, 0.026), transparent 30%),
    linear-gradient(152deg, #0c1011 0%, #050708 48%, #020304 100%),
    var(--obsidian);
  pointer-events: none;
}

.atlas-background::after {
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='atlasNoise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.78' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23atlasNoise)' opacity='.14'/%3E%3C/svg%3E");
  content: "";
  opacity: 0.12;
  mix-blend-mode: soft-light;
}

.atlas-background__canvas {
  display: block;
  width: 100%;
  height: 100%;
  transition: opacity 420ms ease;
}

.atlas-background--drift .atlas-background__canvas {
  opacity: 0.86;
}

.atlas-background--locked .atlas-background__canvas {
  opacity: 0.55;
}

@media (prefers-reduced-motion: reduce) {
  .atlas-background__canvas {
    transition: none;
  }
}
</style>
