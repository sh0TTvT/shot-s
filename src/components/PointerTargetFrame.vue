<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

const frameElement = ref<HTMLElement | null>(null);
const dotElement = ref<HTMLElement | null>(null);

const interactiveSelector = [
  "a[href]",
  "button:not(:disabled)",
  "input:not(:disabled)",
  "select:not(:disabled)",
  "textarea:not(:disabled)",
  "summary",
  "label[for]",
  "[role='button']:not([aria-disabled='true'])",
  "[role='link']:not([aria-disabled='true'])",
  "[contenteditable='true']",
  "[data-pointer-frame]",
].join(",");

const pointerHalfWidth = 14;
const pointerHalfHeight = 14;
const targetGap = 7;
const targetFollowDistance = 5;
const viewportMargin = 4;
const targetMeasureDuration = 720;

let pointerX = -40;
let pointerY = -40;
let pointerInside = false;
let finePointerEnabled = false;
let activeTarget: HTMLElement | null = null;
let targetMeasureUntil = 0;
let renderFrame: number | undefined;
let resizeObserver: ResizeObserver | undefined;
let mutationObserver: MutationObserver | undefined;
let finePointerQuery: MediaQueryList | undefined;

const setFrameVisibility = (visible: boolean) => {
  frameElement.value?.classList.toggle("pointer-target-frame--visible", visible);
  dotElement.value?.classList.toggle("pointer-dot--visible", visible);
};

const setActiveTarget = (target: HTMLElement | null) => {
  if (activeTarget === target) return;

  resizeObserver?.disconnect();
  activeTarget = target;
  frameElement.value?.classList.toggle("pointer-target-frame--targeting", Boolean(target));

  if (target) {
    targetMeasureUntil = performance.now() + targetMeasureDuration;
    resizeObserver?.observe(target);
  }
};

const applyGeometry = (
  centerX: number,
  centerY: number,
  halfWidth: number,
  halfHeight: number,
) => {
  const frame = frameElement.value;
  if (!frame) return;

  // WHY: 连续指针值直接写入合成层，避免每次移动都触发 Vue 组件树更新。
  frame.style.transform = `translate3d(${centerX}px, ${centerY}px, 0)`;
  frame.style.setProperty("--pointer-frame-half-x", `${halfWidth}px`);
  frame.style.setProperty("--pointer-frame-half-y", `${halfHeight}px`);
};

const applyPointerDot = () => {
  const dot = dotElement.value;
  if (!dot) return;

  // WHY: 圆点必须锁定真实指针，不能复用会受组件磁吸影响的折角框中心。
  dot.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0)`;
};

const resolveInteractiveTarget = () => {
  const hitElement = document.elementFromPoint(pointerX, pointerY);
  if (!hitElement || hitElement.closest("[data-pointer-frame-ignore]")) return null;

  const target = hitElement.closest<HTMLElement>(interactiveSelector);
  if (!target || target.matches(":disabled, [aria-disabled='true']")) return null;
  return target;
};

const renderPointerFrame = (timestamp: number) => {
  renderFrame = undefined;
  if (!pointerInside || !finePointerEnabled) return;

  applyPointerDot();
  const target = resolveInteractiveTarget();
  setActiveTarget(target);

  if (target?.isConnected) {
    const rect = target.getBoundingClientRect();
    const left = Math.max(viewportMargin, rect.left - targetGap);
    const top = Math.max(viewportMargin, rect.top - targetGap);
    const right = Math.min(window.innerWidth - viewportMargin, rect.right + targetGap);
    const bottom = Math.min(window.innerHeight - viewportMargin, rect.bottom + targetGap);

    if (right > left && bottom > top) {
      const halfWidth = Math.max(pointerHalfWidth, (right - left) / 2);
      const halfHeight = Math.max(pointerHalfHeight, (bottom - top) / 2);
      const pointerRatioX = Math.min(
        1,
        Math.max(-1, ((pointerX - rect.left) / Math.max(1, rect.width)) * 2 - 1),
      );
      const pointerRatioY = Math.min(
        1,
        Math.max(-1, ((pointerY - rect.top) / Math.max(1, rect.height)) * 2 - 1),
      );
      // WHY: 偏移限制在外围留白内，既保留磁吸跟随，也不让折角侵入组件边界。
      const centerX = Math.min(
        window.innerWidth - viewportMargin - halfWidth,
        Math.max(
          viewportMargin + halfWidth,
          (left + right) / 2 + pointerRatioX * targetFollowDistance,
        ),
      );
      const centerY = Math.min(
        window.innerHeight - viewportMargin - halfHeight,
        Math.max(
          viewportMargin + halfHeight,
          (top + bottom) / 2 + pointerRatioY * targetFollowDistance,
        ),
      );

      applyGeometry(
        centerX,
        centerY,
        halfWidth,
        halfHeight,
      );
      setFrameVisibility(true);
      // WHY: 现有按钮会在 hover 时位移，短时持续测量才能让折角贴住动画后的真实边界。
      if (timestamp < targetMeasureUntil) scheduleRender();
      return;
    }
  }

  setActiveTarget(null);
  applyGeometry(pointerX, pointerY, pointerHalfWidth, pointerHalfHeight);
  setFrameVisibility(true);
};

const scheduleRender = () => {
  if (renderFrame === undefined) renderFrame = window.requestAnimationFrame(renderPointerFrame);
};

const handlePointerMove = (event: PointerEvent) => {
  if (event.pointerType === "touch") {
    hideFrame();
    return;
  }

  pointerX = event.clientX;
  pointerY = event.clientY;
  pointerInside = true;
  scheduleRender();
};

const hideFrame = () => {
  pointerInside = false;
  setActiveTarget(null);
  setFrameVisibility(false);
};

const handleViewportChange = () => scheduleRender();

const handlePointerCapabilityChange = (event: MediaQueryListEvent) => {
  finePointerEnabled = event.matches;
  if (!finePointerEnabled) hideFrame();
};

onMounted(() => {
  finePointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
  finePointerEnabled = finePointerQuery.matches;
  resizeObserver = new ResizeObserver(scheduleRender);
  mutationObserver = new MutationObserver(scheduleRender);
  mutationObserver.observe(document.getElementById("app") ?? document.body, {
    childList: true,
    subtree: true,
  });

  window.addEventListener("pointermove", handlePointerMove, { passive: true });
  document.documentElement.addEventListener("pointerenter", handlePointerMove, { passive: true });
  document.documentElement.addEventListener("pointerleave", hideFrame);
  document.addEventListener("scroll", handleViewportChange, { capture: true, passive: true });
  window.addEventListener("resize", handleViewportChange, { passive: true });
  window.addEventListener("blur", hideFrame);
  finePointerQuery.addEventListener("change", handlePointerCapabilityChange);
});

onBeforeUnmount(() => {
  window.removeEventListener("pointermove", handlePointerMove);
  document.documentElement.removeEventListener("pointerenter", handlePointerMove);
  document.documentElement.removeEventListener("pointerleave", hideFrame);
  document.removeEventListener("scroll", handleViewportChange, true);
  window.removeEventListener("resize", handleViewportChange);
  window.removeEventListener("blur", hideFrame);
  finePointerQuery?.removeEventListener("change", handlePointerCapabilityChange);
  resizeObserver?.disconnect();
  mutationObserver?.disconnect();
  if (renderFrame !== undefined) window.cancelAnimationFrame(renderFrame);
});
</script>

<template>
  <div ref="frameElement" class="pointer-target-frame" aria-hidden="true">
    <span class="pointer-target-frame__corner pointer-target-frame__corner--top-left"></span>
    <span class="pointer-target-frame__corner pointer-target-frame__corner--top-right"></span>
    <span class="pointer-target-frame__corner pointer-target-frame__corner--bottom-left"></span>
    <span class="pointer-target-frame__corner pointer-target-frame__corner--bottom-right"></span>
  </div>
  <span ref="dotElement" class="pointer-dot" aria-hidden="true"></span>
</template>

<style scoped>
@media (hover: hover) and (pointer: fine) {
  :global(html),
  :global(body),
  :global(#app),
  :global(#app *) {
    cursor: none !important;
  }
}

.pointer-target-frame {
  --pointer-frame-corner-size: 8px;
  --pointer-frame-half-x: 14px;
  --pointer-frame-half-y: 14px;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1250;
  width: 0;
  height: 0;
  color: var(--white);
  opacity: 0;
  pointer-events: none;
  transform: translate3d(-40px, -40px, 0);
  transition:
    transform 72ms cubic-bezier(0.2, 0.8, 0.2, 1),
    opacity 120ms ease;
  will-change: transform;
}

.pointer-dot {
  position: fixed;
  top: -3px;
  left: -3px;
  z-index: 1260;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #fff;
  opacity: 0;
  pointer-events: none;
  transform: translate3d(-40px, -40px, 0);
  transition: opacity 80ms ease;
  will-change: transform;
}

.pointer-dot--visible {
  opacity: 1;
}

.pointer-target-frame--visible {
  opacity: 0.88;
}

.pointer-target-frame--targeting {
  color: var(--white);
  opacity: 1;
  transition-duration: 180ms, 120ms;
}

.pointer-target-frame__corner {
  position: absolute;
  top: 0;
  left: 0;
  display: block;
  width: var(--pointer-frame-corner-size);
  height: var(--pointer-frame-corner-size);
  border-color: currentColor;
  opacity: 0.84;
  transition:
    transform 280ms cubic-bezier(0.16, 1, 0.3, 1),
    opacity 160ms ease;
  will-change: transform;
}

.pointer-target-frame--targeting .pointer-target-frame__corner {
  opacity: 1;
}

.pointer-target-frame__corner--top-left {
  border-top: 2px solid;
  border-left: 2px solid;
  transform: translate3d(
    calc(var(--pointer-frame-half-x) * -1),
    calc(var(--pointer-frame-half-y) * -1),
    0
  );
}

.pointer-target-frame__corner--top-right {
  border-top: 2px solid;
  border-right: 2px solid;
  transform: translate3d(
    calc(var(--pointer-frame-half-x) - var(--pointer-frame-corner-size)),
    calc(var(--pointer-frame-half-y) * -1),
    0
  );
}

.pointer-target-frame__corner--bottom-left {
  border-bottom: 2px solid;
  border-left: 2px solid;
  transform: translate3d(
    calc(var(--pointer-frame-half-x) * -1),
    calc(var(--pointer-frame-half-y) - var(--pointer-frame-corner-size)),
    0
  );
}

.pointer-target-frame__corner--bottom-right {
  border-right: 2px solid;
  border-bottom: 2px solid;
  transform: translate3d(
    calc(var(--pointer-frame-half-x) - var(--pointer-frame-corner-size)),
    calc(var(--pointer-frame-half-y) - var(--pointer-frame-corner-size)),
    0
  );
}

@media (pointer: coarse), (hover: none) {
  .pointer-target-frame,
  .pointer-dot {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pointer-target-frame,
  .pointer-target-frame__corner,
  .pointer-dot {
    transition-duration: 0.01ms !important;
  }
}

@media (forced-colors: active) {
  .pointer-target-frame {
    color: Highlight;
  }

  .pointer-dot {
    background: CanvasText;
  }
}
</style>
