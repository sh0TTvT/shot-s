<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

type TextShard = {
  id: number;
  clipPath: string;
  baseX: number;
  baseY: number;
  depth: number;
  travel: number;
};

const emit = defineEmits<{
  activate: [];
}>();

const fieldElement = ref<HTMLElement | null>(null);
const visualElement = ref<HTMLElement | null>(null);

const textShards: TextShard[] = [
  { id: 1, clipPath: "polygon(0% 0%, 35% 0%, 20% 60%, 0% 40%)", baseX: -1, baseY: -1, depth: 1, travel: 5 },
  { id: 2, clipPath: "polygon(0% 40%, 20% 60%, 10% 100%, 0% 100%)", baseX: -1, baseY: 1, depth: 1, travel: 7 },
  { id: 3, clipPath: "polygon(35% 0%, 65% 0%, 55% 45%, 20% 60%)", baseX: 0, baseY: -1, depth: 1, travel: 4 },
  { id: 4, clipPath: "polygon(20% 60%, 55% 45%, 60% 100%, 10% 100%)", baseX: 0, baseY: 1, depth: 1, travel: 6 },
  { id: 5, clipPath: "polygon(65% 0%, 100% 0%, 100% 50%, 85% 65%, 55% 45%)", baseX: 1, baseY: -1, depth: 1, travel: 5 },
  { id: 6, clipPath: "polygon(55% 45%, 85% 65%, 100% 50%, 100% 100%, 60% 100%)", baseX: 1, baseY: 1, depth: 1, travel: 8 },
  { id: 7, clipPath: "polygon(25% 20%, 45% 10%, 50% 40%, 30% 50%)", baseX: -0.5, baseY: -1, depth: 2, travel: 13 },
  { id: 8, clipPath: "polygon(65% 40%, 85% 30%, 90% 70%, 70% 80%)", baseX: 1, baseY: 0, depth: 2, travel: 17 },
  { id: 9, clipPath: "polygon(45% 60%, 60% 50%, 70% 80%, 50% 90%)", baseX: 0.5, baseY: 1, depth: 2, travel: 11 },
];

let visualBounds: DOMRect | undefined;
let resizeObserver: ResizeObserver | undefined;
let pointerFrame: number | undefined;
let pendingPointer: PointerEvent | undefined;
let shardElements: HTMLElement[] = [];

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const smoothstep = (minimum: number, maximum: number, value: number) => {
  const progress = clamp((value - minimum) / (maximum - minimum), 0, 1);
  return progress * progress * (3 - 2 * progress);
};

const measureVisual = () => {
  visualBounds = visualElement.value?.getBoundingClientRect();
};

const applyShardTransforms = (horizontal: number, vertical: number, strength: number) => {
  textShards.forEach((shard, index) => {
    const element = shardElements[index];
    if (!element) return;

    const idleDistance = shard.depth === 2 ? 1.6 : 0.8;
    const translateX = shard.baseX * idleDistance + horizontal * strength * shard.travel * 1.65;
    const translateY = shard.baseY * idleDistance + vertical * strength * shard.travel * 1.65;
    const rotationX = -vertical * strength * (shard.depth === 2 ? 14 : 5.5);
    const rotationY = horizontal * strength * (shard.depth === 2 ? 14 : 5.5);
    const scale = 1 + strength * (shard.depth === 2 ? 0.045 : 0.014);
    const depth = shard.depth * (10 + strength * 10);

    element.style.transform = [
      `translate3d(${translateX.toFixed(2)}px, ${translateY.toFixed(2)}px, ${depth.toFixed(2)}px)`,
      `rotateX(${rotationX.toFixed(2)}deg)`,
      `rotateY(${rotationY.toFixed(2)}deg)`,
      `scale(${scale.toFixed(3)})`,
    ].join(" ");
  });
};

const resetPointerField = () => {
  const field = fieldElement.value;
  field?.style.setProperty("--pointer-duration", "480ms");
  field?.style.setProperty("--field-strength", "0");
  field?.style.setProperty("--tilt-x", "0deg");
  field?.style.setProperty("--tilt-y", "0deg");
  applyShardTransforms(0, 0, 0);
};

const applyPointerField = () => {
  pointerFrame = undefined;
  const event = pendingPointer;
  const bounds = visualBounds;
  if (!event || !bounds) return;

  const centerX = bounds.left + bounds.width / 2;
  const centerY = bounds.top + bounds.height / 2;
  const horizontal = clamp((event.clientX - centerX) / (bounds.width / 2), -1.25, 1.25);
  const vertical = clamp((event.clientY - centerY) / (bounds.height / 2), -1.6, 1.6);
  const distance = Math.hypot(horizontal, vertical * 1.35);
  const strength = 1 - smoothstep(0.52, 1.14, distance);

  const field = fieldElement.value;
  field?.style.setProperty("--pointer-duration", "90ms");
  field?.style.setProperty("--field-strength", strength.toFixed(3));
  field?.style.setProperty("--tilt-x", `${(-vertical * strength * 5.5).toFixed(2)}deg`);
  field?.style.setProperty("--tilt-y", `${(horizontal * strength * 5.5).toFixed(2)}deg`);
  applyShardTransforms(horizontal, vertical, strength);
};

const handlePointerMove = (event: PointerEvent) => {
  if (event.pointerType === "touch") return;
  pendingPointer = event;
  if (pointerFrame === undefined) pointerFrame = window.requestAnimationFrame(applyPointerField);
};

onMounted(() => {
  shardElements = Array.from(
    fieldElement.value?.querySelectorAll<HTMLElement>(".intrusion-shard") ?? [],
  );
  resizeObserver = new ResizeObserver(measureVisual);
  if (visualElement.value) resizeObserver.observe(visualElement.value);
  measureVisual();
  fieldElement.value?.style.setProperty("--pointer-duration", "0ms");
  applyShardTransforms(0, 0, 0);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  if (pointerFrame !== undefined) window.cancelAnimationFrame(pointerFrame);
});
</script>

<template>
  <div
    ref="fieldElement"
    class="intrusion-field"
    @pointermove="handlePointerMove"
    @pointerleave="resetPointerField"
  >
    <div class="intrusion-stage">
      <div ref="visualElement" class="intrusion-tilt">
        <button
          class="intrusion-button"
          type="button"
          aria-label="进入 Sh0TT 个人终端"
          @click="emit('activate')"
        >
          <span class="intrusion-text" aria-hidden="true">
            <span class="intrusion-text-shadow">Sh0TT</span>
            <span class="intrusion-text-base">Sh0TT</span>
            <span
              v-for="shard in textShards"
              :key="shard.id"
              class="intrusion-shard"
              :class="{ 'is-glass': shard.id === 8 }"
              :style="{ clipPath: shard.clipPath }"
            >Sh0TT</span>
            <span class="intrusion-slice intrusion-slice-left">Sh0TT</span>
            <span class="intrusion-slice intrusion-slice-right">Sh0TT</span>
            <span class="intrusion-slice intrusion-slice-lower">Sh0TT</span>
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.intrusion-field {
  --field-strength: 0;
  --pointer-duration: 90ms;
  --tilt-x: 0deg;
  --tilt-y: 0deg;
  position: absolute;
  inset: 0;
  z-index: 2;
  display: grid;
  place-items: center;
  perspective: 1200px;
  pointer-events: none;
}

.intrusion-stage {
  display: grid;
  width: min(98vw, 1120px);
  aspect-ratio: 1120 / 440;
  place-items: center;
  pointer-events: auto;
}

.intrusion-tilt {
  width: min(90vw, 1000px);
  aspect-ratio: 1000 / 320;
  transform: rotateX(var(--tilt-x)) rotateY(var(--tilt-y));
  transform-style: preserve-3d;
  transition: transform var(--pointer-duration) cubic-bezier(0.16, 1, 0.3, 1);
  will-change: transform;
}

.intrusion-button {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  color: inherit;
  background: transparent;
  cursor: pointer;
  filter: drop-shadow(0 22px 38px rgba(0, 0, 0, 0.56));
  animation: intrusion-enter 680ms cubic-bezier(0.16, 1, 0.3, 1) both;
  pointer-events: auto;
  transition: filter 180ms ease;
}

.intrusion-button:hover {
  filter:
    drop-shadow(0 24px 42px rgba(0, 0, 0, 0.68))
    drop-shadow(0 0 10px rgba(85, 230, 220, 0.08));
}

.intrusion-button:focus-visible {
  outline: 1px solid rgba(85, 230, 220, 0.72);
  outline-offset: 14px;
}

.intrusion-text {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  transform-style: preserve-3d;
  pointer-events: none;
}

.intrusion-text::after {
  position: absolute;
  top: 50%;
  right: 9%;
  left: 9%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(85, 230, 220, 0.72), transparent);
  content: "";
  opacity: 0;
  transform: scaleX(0.12);
}

.intrusion-text-shadow,
.intrusion-text-base,
.intrusion-shard,
.intrusion-slice {
  grid-area: 1 / 1;
  padding-right: 0.14em;
  font-family: "Playwrite NZ", cursive;
  font-size: clamp(92px, 18vw, 230px);
  font-optical-sizing: auto;
  font-style: normal;
  font-weight: 400;
  font-synthesis: none;
  line-height: 1;
  letter-spacing: -0.055em;
  white-space: nowrap;
  user-select: none;
}

.intrusion-text-shadow {
  position: absolute;
  inset: 0;
  display: grid;
  color: rgba(232, 236, 233, 0.085);
  filter: blur(2.4px);
  place-items: center;
  text-shadow: 0 18px 34px rgba(0, 0, 0, 0.78);
  transform: translate3d(10px, 14px, -12px) scaleX(1.012);
}

.intrusion-text-base {
  color: rgba(232, 236, 233, 0.075);
  text-shadow: 0 0 22px rgba(85, 230, 220, 0.04);
  transform-origin: center;
}

.intrusion-shard {
  position: absolute;
  inset: 0;
  display: grid;
  color: rgba(232, 236, 233, 0.92);
  place-items: center;
  text-shadow:
    0 2px 12px rgba(255, 255, 255, 0.16),
    0 18px 34px rgba(0, 0, 0, 0.56);
  transform-origin: center;
  transform-style: preserve-3d;
  transition:
    transform var(--pointer-duration) cubic-bezier(0.16, 1, 0.3, 1),
    filter 150ms ease,
    opacity 150ms ease;
  will-change: transform;
}

.intrusion-shard.is-glass {
  background: rgba(255, 255, 255, calc(var(--field-strength) * 0.025));
  backdrop-filter: blur(10px) brightness(1.06);
  -webkit-backdrop-filter: blur(10px) brightness(1.06);
  filter: brightness(calc(1 + var(--field-strength) * 0.12));
}

.intrusion-slice {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  opacity: 0;
  transform-origin: center;
  z-index: 3;
  will-change: transform, opacity, filter;
}

.intrusion-slice-left {
  color: rgba(232, 236, 233, 0.92);
  clip-path: polygon(0 8%, 100% 0, 100% 34%, 0 43%);
  text-shadow: -5px 0 10px rgba(85, 230, 220, 0.34);
}

.intrusion-slice-right {
  color: rgba(232, 236, 233, 0.86);
  clip-path: polygon(0 37%, 100% 29%, 100% 66%, 0 58%);
  text-shadow: 5px 0 9px rgba(240, 68, 56, 0.26);
}

.intrusion-slice-lower {
  color: rgba(232, 236, 233, 0.88);
  clip-path: polygon(0 62%, 100% 70%, 100% 94%, 0 86%);
  text-shadow: -4px 0 8px rgba(85, 230, 220, 0.24);
}

.intrusion-text-base {
  animation: intrusion-core 3600ms steps(1, end) infinite;
}

.intrusion-slice-left {
  animation: intrusion-left 3600ms steps(1, end) infinite;
}

.intrusion-slice-right {
  animation: intrusion-right 3600ms steps(1, end) infinite;
}

.intrusion-slice-lower {
  animation: intrusion-lower 3600ms steps(1, end) infinite;
}

.intrusion-text::after {
  animation: intrusion-scan 3600ms steps(1, end) infinite;
}

@keyframes intrusion-enter {
  from {
    opacity: 0;
    filter: blur(5px) drop-shadow(0 12px 26px rgba(0, 0, 0, 0.3));
    transform: translateY(10px) scaleX(0.98);
  }
}

@keyframes intrusion-core {
  0%,
  8%,
  12%,
  31%,
  35%,
  58%,
  63%,
  100% {
    opacity: 1;
    filter: none;
    transform: translateX(0) scaleX(1);
  }
  9% {
    opacity: 0.22;
    filter: brightness(1.7);
    transform: translateX(-2px) scaleX(1.035);
  }
  10% {
    opacity: 0.82;
    transform: translateX(3px) scaleX(0.985);
  }
  32% {
    opacity: 0.38;
    transform: translateX(2px) scaleX(1.045) skewX(-2deg);
  }
  33% {
    opacity: 1;
    transform: translateX(-3px) scaleX(0.99);
  }
  59% {
    opacity: 0.12;
    filter: brightness(1.9);
    transform: scaleX(1.055);
  }
  61% {
    opacity: 0.88;
    transform: translateX(2px) scaleX(1.01);
  }
}

@keyframes intrusion-left {
  0%,
  8%,
  12%,
  31%,
  35%,
  58%,
  63%,
  100% {
    opacity: 0;
    transform: translateX(0) scaleX(1);
  }
  9% {
    opacity: 0.92;
    transform: translateX(-15px) scaleX(1.08) skewX(-4deg);
  }
  10% {
    opacity: 0.28;
    transform: translateX(5px) scaleX(0.98);
  }
  32% {
    opacity: 0.7;
    transform: translateX(-9px) scaleX(1.05);
  }
  59% {
    opacity: 0.84;
    transform: translateX(-18px) scaleX(1.1) skewX(-5deg);
  }
  61% {
    opacity: 0.18;
    transform: translateX(7px);
  }
}

@keyframes intrusion-right {
  0%,
  8%,
  12%,
  31%,
  35%,
  58%,
  63%,
  100% {
    opacity: 0;
    transform: translateX(0) scaleX(1);
  }
  9% {
    opacity: 0.64;
    transform: translateX(16px) scaleX(1.07) skewX(3deg);
  }
  10% {
    opacity: 0.2;
    transform: translateX(-4px) scaleX(0.99);
  }
  32% {
    opacity: 0.82;
    transform: translateX(12px) scaleX(1.06);
  }
  59% {
    opacity: 0.72;
    transform: translateX(20px) scaleX(1.11) skewX(4deg);
  }
  61% {
    opacity: 0.16;
    transform: translateX(-6px);
  }
}

@keyframes intrusion-lower {
  0%,
  31%,
  35%,
  58%,
  63%,
  100% {
    opacity: 0;
    transform: translateX(0) scaleX(1);
  }
  32% {
    opacity: 0.62;
    transform: translateX(-12px) scaleX(1.075);
  }
  33% {
    opacity: 0.18;
    transform: translateX(6px) scaleX(0.98);
  }
  59% {
    opacity: 0.76;
    transform: translateX(14px) scaleX(1.08);
  }
  61% {
    opacity: 0.14;
    transform: translateX(-5px);
  }
}

@keyframes intrusion-scan {
  0%,
  8%,
  12%,
  31%,
  35%,
  58%,
  63%,
  100% {
    opacity: 0;
    transform: translateY(-34px) scaleX(0.12);
  }
  9%,
  32%,
  59% {
    opacity: 0.62;
    transform: translateY(0) scaleX(1);
  }
  10%,
  33%,
  61% {
    opacity: 0.12;
    transform: translateY(28px) scaleX(0.32);
  }
}

@media (max-width: 640px) {
  .intrusion-stage {
    width: 100vw;
  }

  .intrusion-tilt {
    width: 94vw;
  }

  .intrusion-button:focus-visible {
    outline-offset: 8px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .intrusion-button {
    animation: none;
  }

  .intrusion-text-base {
    animation: none;
    filter: brightness(1.08);
    transform: scaleX(1.015);
  }

  .intrusion-slice,
  .intrusion-text::after {
    animation: none;
    opacity: 0;
  }

  .intrusion-tilt,
  .intrusion-shard {
    transition: none;
    transform: none !important;
  }
}

@media (pointer: coarse) {
  .intrusion-tilt,
  .intrusion-shard {
    transform: none !important;
  }
}
</style>
