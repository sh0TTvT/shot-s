<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import {
  contourSettings,
  createContourBuffer,
  type ContourBuffer,
} from "../utils/contourField";

const props = withDefaults(
  defineProps<{
    pointerScale?: number;
    paused?: boolean;
  }>(),
  {
    pointerScale: 1,
    paused: false,
  },
);

const canvasElement = ref<HTMLCanvasElement | null>(null);

let animationFrame: number | undefined;
let resizeObserver: ResizeObserver | undefined;
let contourBuffer: ContourBuffer | undefined;
let viewportWidth = 0;
let viewportHeight = 0;
let pixelRatio = 1;
let cameraX = 0;
let cameraY = 0;
let pointerOffsetX = 0;
let pointerOffsetY = 0;
let pointerTargetX = 0;
let pointerTargetY = 0;
let previousTime = 0;
let bufferRefreshPending = false;
let reducedMotionQuery: MediaQueryList | undefined;
let reducePointerMotion = false;

const resetPointerTarget = () => {
  pointerTargetX = 0;
  pointerTargetY = 0;
};

const handlePointerMove = (event: PointerEvent) => {
  if (event.pointerType === "touch" || reducePointerMotion || props.paused) return;

  const horizontal = (event.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
  const vertical = (event.clientY / Math.max(1, window.innerHeight) - 0.5) * 2;
  pointerTargetX = horizontal * Math.min(34, viewportWidth * 0.028) * props.pointerScale;
  pointerTargetY = vertical * Math.min(24, viewportHeight * 0.035) * props.pointerScale;
};

const handleMotionPreference = (event: MediaQueryListEvent) => {
  reducePointerMotion = event.matches;
  if (reducePointerMotion) resetPointerTarget();
};

const rebuildBuffer = () => {
  if (!viewportWidth || !viewportHeight) return;

  contourBuffer = createContourBuffer(
    viewportWidth,
    viewportHeight,
    cameraX + pointerOffsetX,
    cameraY + pointerOffsetY,
    pixelRatio,
  );
  bufferRefreshPending = false;
};

const resizeCanvas = () => {
  const canvas = canvasElement.value;
  if (!canvas) return;

  const bounds = canvas.getBoundingClientRect();
  viewportWidth = Math.max(1, bounds.width);
  viewportHeight = Math.max(1, bounds.height);
  pixelRatio = Math.min(window.devicePixelRatio || 1, contourSettings.maxDevicePixelRatio);
  canvas.width = Math.ceil(viewportWidth * pixelRatio);
  canvas.height = Math.ceil(viewportHeight * pixelRatio);
  rebuildBuffer();
};

const bufferNeedsRefresh = (buffer: ContourBuffer) => {
  const sourceX = cameraX + pointerOffsetX - buffer.originX;
  const sourceY = cameraY + pointerOffsetY - buffer.originY;
  const reserve = Math.max(viewportWidth, viewportHeight) * contourSettings.bufferMarginRatio * 0.42;

  return (
    sourceX > buffer.width - viewportWidth - reserve ||
    sourceY > buffer.height - viewportHeight - reserve
  );
};

const scheduleBufferRefresh = () => {
  if (bufferRefreshPending) return;
  bufferRefreshPending = true;

  window.setTimeout(rebuildBuffer, 0);
};

const renderFrame = (time: number) => {
  const canvas = canvasElement.value;
  const context = canvas?.getContext("2d");
  const buffer = contourBuffer;

  if (canvas && context && buffer) {
    const elapsed = previousTime ? Math.min(time - previousTime, 32) / 1000 : 0;
    if (!props.paused && !reducePointerMotion) {
      cameraX += contourSettings.driftX * elapsed;
      cameraY += contourSettings.driftY * elapsed;
      const pointerEase = 1 - Math.exp(-elapsed * 5.5);
      pointerOffsetX += (pointerTargetX - pointerOffsetX) * pointerEase;
      pointerOffsetY += (pointerTargetY - pointerOffsetY) * pointerEase;
    }
    const sourceX = (cameraX + pointerOffsetX - buffer.originX) * buffer.pixelRatio;
    const sourceY = (cameraY + pointerOffsetY - buffer.originY) * buffer.pixelRatio;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(
      buffer.canvas,
      sourceX,
      sourceY,
      viewportWidth * buffer.pixelRatio,
      viewportHeight * buffer.pixelRatio,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    if (bufferNeedsRefresh(buffer)) scheduleBufferRefresh();
  }

  previousTime = time;
  animationFrame = window.requestAnimationFrame(renderFrame);
};

onMounted(() => {
  const canvas = canvasElement.value;
  if (!canvas) return;

  resizeObserver = new ResizeObserver(resizeCanvas);
  resizeObserver.observe(canvas);
  resizeCanvas();
  reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  reducePointerMotion = reducedMotionQuery.matches;
  reducedMotionQuery.addEventListener("change", handleMotionPreference);
  window.addEventListener("pointermove", handlePointerMove, { passive: true });
  window.addEventListener("blur", resetPointerTarget);
  document.documentElement.addEventListener("pointerleave", resetPointerTarget);
  animationFrame = window.requestAnimationFrame(renderFrame);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  reducedMotionQuery?.removeEventListener("change", handleMotionPreference);
  window.removeEventListener("pointermove", handlePointerMove);
  window.removeEventListener("blur", resetPointerTarget);
  document.documentElement.removeEventListener("pointerleave", resetPointerTarget);
  if (animationFrame !== undefined) window.cancelAnimationFrame(animationFrame);
});
</script>

<template>
  <canvas ref="canvasElement" class="index-contour-canvas" aria-hidden="true" />
</template>
