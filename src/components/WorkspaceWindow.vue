<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { gsap } from "gsap";
import { useInteractionContext, type InteractionInput } from "../composables/useInteractionContext";
import { workspaceWindows } from "../data/workspaceWindows";
import type { WorkspaceWindowId } from "../types/workspace";

const props = defineProps<{
  id: WorkspaceWindowId;
  origin?: { x: number; y: number };
}>();

const emit = defineEmits<{
  close: [input: InteractionInput];
}>();

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
};

const windowElement = ref<HTMLElement | null>(null);
const closeButton = ref<HTMLButtonElement | null>(null);
const positionX = ref(0);
const positionY = ref(0);
const isDragging = ref(false);
const isMobileViewport = ref(false);
const canDrag = ref(false);
const isClosing = ref(false);
const windowData = computed(() => workspaceWindows[props.id]);
const titleId = computed(() => `workspace-window-title-${props.id}`);
const windowPosition = computed(() =>
  isMobileViewport.value
    ? undefined
    : {
        left: `${positionX.value}px`,
        top: `${positionY.value}px`,
      },
);

const { setInteraction, clearInteraction } = useInteractionContext();

let dragState: DragState | undefined;
let mobileViewportQuery: MediaQueryList | undefined;
let coarsePointerQuery: MediaQueryList | undefined;
let reducedMotionQuery: MediaQueryList | undefined;
let windowTween: gsap.core.Tween | undefined;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const getMovementBounds = () => {
  const element = windowElement.value;
  if (!element) return undefined;

  const bounds = element.getBoundingClientRect();
  const horizontalInset = Math.min(56, Math.max(16, (window.innerWidth - bounds.width) / 2));
  const verticalRoom = Math.max(16, (window.innerHeight - bounds.height) / 2);
  const minimumY = Math.min(118, verticalRoom);

  return {
    minimumX: horizontalInset,
    maximumX: Math.max(horizontalInset, window.innerWidth - bounds.width - horizontalInset),
    minimumY,
    maximumY: Math.max(minimumY, window.innerHeight - bounds.height - 116),
  };
};

const constrainPosition = (nextX: number, nextY: number) => {
  const bounds = getMovementBounds();
  if (!bounds) return;

  positionX.value = Math.round(clamp(nextX, bounds.minimumX, bounds.maximumX));
  positionY.value = Math.round(clamp(nextY, bounds.minimumY, bounds.maximumY));
};

const centerWindow = () => {
  const element = windowElement.value;
  if (!element || isMobileViewport.value) return;

  const bounds = element.getBoundingClientRect();
  constrainPosition(
    (window.innerWidth - bounds.width) / 2,
    (window.innerHeight - bounds.height) / 2,
  );
};

const updateInputMode = () => {
  isMobileViewport.value = mobileViewportQuery?.matches ?? false;
  canDrag.value = !isMobileViewport.value && !(coarsePointerQuery?.matches ?? false);

  if (isMobileViewport.value) {
    dragState = undefined;
    isDragging.value = false;
  } else {
    nextTick(() => constrainPosition(positionX.value, positionY.value));
  }
};

const setWindowInteraction = (input: InteractionInput = "POINTER") => {
  setInteraction(windowData.value.label, "WINDOW", input);
};

const startDrag = (event: PointerEvent) => {
  if (!canDrag.value || event.button !== 0 || isClosing.value) return;

  const handle = event.currentTarget as HTMLElement;
  event.preventDefault();
  handle.setPointerCapture(event.pointerId);
  dragState = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    originX: positionX.value,
    originY: positionY.value,
  };
  isDragging.value = true;
  setInteraction(windowData.value.label, "DRAG", "POINTER");
};

const moveDrag = (event: PointerEvent) => {
  if (!dragState || dragState.pointerId !== event.pointerId) return;

  constrainPosition(
    dragState.originX + event.clientX - dragState.startX,
    dragState.originY + event.clientY - dragState.startY,
  );
};

const endDrag = (event: PointerEvent) => {
  if (!dragState || dragState.pointerId !== event.pointerId) return;

  const handle = event.currentTarget as HTMLElement;
  if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
  dragState = undefined;
  isDragging.value = false;
  setWindowInteraction();
};

const requestClose = (input: InteractionInput = "POINTER") => {
  if (isClosing.value) return;

  const element = windowElement.value;
  isClosing.value = true;
  setInteraction(windowData.value.label, "WINDOW", input);
  windowTween?.kill();

  if (!element) {
    emit("close", input);
    return;
  }

  windowTween = gsap.to(element, {
    autoAlpha: 0,
    y: 8,
    scale: 0.975,
    duration: reducedMotionQuery?.matches ? 0 : 0.18,
    ease: "power2.in",
    onComplete: () => emit("close", input),
  });
};

const handleWindowKeydown = (event: KeyboardEvent) => {
  if (event.key !== "Escape") return;

  event.preventDefault();
  requestClose("KEYBOARD");
};

const handleCloseClick = (event: MouseEvent) => {
  requestClose(event.detail === 0 ? "KEYBOARD" : "POINTER");
};

const handleViewportResize = () => {
  updateInputMode();
  if (!isMobileViewport.value) constrainPosition(positionX.value, positionY.value);
};

watch(
  () => props.id,
  async (_, previousId) => {
    clearInteraction(workspaceWindows[previousId].label);
    setWindowInteraction();
    await nextTick();
    closeButton.value?.focus({ preventScroll: true });
  },
);

onMounted(async () => {
  mobileViewportQuery = window.matchMedia("(max-width: 700px)");
  coarsePointerQuery = window.matchMedia("(pointer: coarse)");
  reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  mobileViewportQuery.addEventListener("change", updateInputMode);
  coarsePointerQuery.addEventListener("change", updateInputMode);
  window.addEventListener("resize", handleViewportResize, { passive: true });
  window.addEventListener("keydown", handleWindowKeydown);
  updateInputMode();
  await nextTick();
  centerWindow();
  setWindowInteraction();

  const element = windowElement.value;
  if (element) {
    const bounds = element.getBoundingClientRect();
    const originOffsetX = props.origin
      ? props.origin.x - (bounds.left + bounds.width / 2)
      : 0;
    const originOffsetY = props.origin
      ? props.origin.y - (bounds.top + bounds.height / 2)
      : 14;
    windowTween = gsap.fromTo(
      element,
      {
        autoAlpha: 0,
        x: originOffsetX,
        y: originOffsetY,
        scale: props.origin ? 0.2 : 0.96,
        transformOrigin: "center",
      },
      {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: reducedMotionQuery.matches ? 0 : 0.32,
        ease: "power3.out",
        clearProps: "transform",
      },
    );
  }

  // WHY: 单活动窗口出现后立即提供明确的键盘出口，但不把程序化聚焦误报为键盘输入。
  closeButton.value?.focus({ preventScroll: true });
});

onBeforeUnmount(() => {
  windowTween?.kill();
  mobileViewportQuery?.removeEventListener("change", updateInputMode);
  coarsePointerQuery?.removeEventListener("change", updateInputMode);
  window.removeEventListener("resize", handleViewportResize);
  window.removeEventListener("keydown", handleWindowKeydown);
  clearInteraction(windowData.value.label);
});
</script>

<template>
  <article
    ref="windowElement"
    class="workspace-window"
    :class="{
      'workspace-window--dragging': isDragging,
      'workspace-window--static': !canDrag,
    }"
    :style="windowPosition"
    role="dialog"
    aria-modal="false"
    :aria-labelledby="titleId"
    @pointerenter="setWindowInteraction()"
  >
    <header
      class="workspace-window__header"
      @pointerdown="startDrag"
      @pointermove="moveDrag"
      @pointerup="endDrag"
      @pointercancel="endDrag"
    >
      <div class="workspace-window__identity">
        <p>
          <span>{{ windowData.label }}</span>
          <span class="workspace-window__code">{{ windowData.code }}</span>
        </p>
        <h2 :id="titleId">{{ windowData.title }}</h2>
      </div>

      <button
        ref="closeButton"
        class="workspace-window__close"
        type="button"
        :aria-label="`关闭 ${windowData.label} 窗口`"
        @pointerdown.stop
        @click="handleCloseClick"
      >
        <span aria-hidden="true"></span>
      </button>
    </header>

    <div class="workspace-window__content" v-html="windowData.content"></div>

    <footer class="workspace-window__footer" aria-hidden="true">
      <span>ACTIVE WINDOW / 01</span>
      <span>ESC / CLOSE</span>
    </footer>
  </article>
</template>

<style scoped>
.workspace-window {
  position: fixed;
  z-index: 80;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  width: min(610px, calc(100vw - 80px));
  height: min(400px, calc(100svh - 160px));
  min-height: 300px;
  overflow: hidden;
  border: 1px solid rgba(232, 236, 233, 0.3);
  color: var(--white, #e8ece9);
  background: transparent;
  box-shadow:
    0 30px 90px rgba(0, 0, 0, 0.68),
    inset 0 0 0 1px rgba(255, 255, 255, 0.025);
  opacity: 0;
  pointer-events: auto;
  isolation: isolate;
  text-shadow: 0 1px 12px rgba(0, 0, 0, 0.85);
}

.workspace-window::before,
.workspace-window::after {
  position: absolute;
  z-index: 3;
  width: 16px;
  height: 1px;
  content: "";
  pointer-events: none;
}

.workspace-window::before {
  top: -1px;
  left: 42px;
  background: var(--arc, #55e6dc);
  box-shadow: 0 0 12px rgba(85, 230, 220, 0.35);
}

.workspace-window::after {
  right: 18px;
  bottom: -1px;
  width: 7px;
  background: var(--signal, #f04438);
}

.workspace-window__header {
  position: relative;
  display: flex;
  min-height: 76px;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 13px 15px 13px 20px;
  border-bottom: 1px solid var(--line, #303736);
  background: linear-gradient(90deg, rgba(85, 230, 220, 0.075), transparent 32%);
  cursor: grab;
  user-select: none;
  touch-action: none;
}

.workspace-window--dragging .workspace-window__header {
  cursor: grabbing;
}

.workspace-window--static .workspace-window__header {
  cursor: default;
  touch-action: auto;
}

.workspace-window__identity {
  min-width: 0;
}

.workspace-window__identity p {
  display: flex;
  gap: 10px;
  align-items: center;
  margin: 0 0 5px;
  color: var(--muted, #87908c);
  font-size: 8px;
  line-height: 1;
  letter-spacing: 0.16em;
}

.workspace-window__code {
  padding-left: 10px;
  border-left: 1px solid var(--line, #303736);
  color: var(--arc, #55e6dc);
}

.workspace-window__identity h2 {
  overflow: hidden;
  margin: 0;
  font-family: var(--display, "Barlow Condensed", sans-serif);
  font-size: clamp(22px, 2.5vw, 28px);
  font-weight: 550;
  line-height: 1;
  letter-spacing: 0.055em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workspace-window__close {
  position: relative;
  flex: 0 0 auto;
  width: 38px;
  height: 38px;
  padding: 0;
  border: 1px solid var(--line, #303736);
  background: transparent;
  cursor: pointer;
  transition:
    border-color 150ms ease,
    background 150ms ease,
    transform 150ms ease;
}

.workspace-window__close span::before,
.workspace-window__close span::after {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 13px;
  height: 1px;
  background: currentColor;
  content: "";
}

.workspace-window__close span::before {
  transform: translate(-50%, -50%) rotate(45deg);
}

.workspace-window__close span::after {
  transform: translate(-50%, -50%) rotate(-45deg);
}

.workspace-window__close:hover {
  border-color: var(--signal, #f04438);
  color: var(--signal, #f04438);
  background: rgba(240, 68, 56, 0.055);
}

.workspace-window__close:active {
  transform: scale(0.94);
}

.workspace-window__close:focus-visible {
  outline: 1px solid var(--arc, #55e6dc);
  outline-offset: 3px;
}

.workspace-window__content {
  overflow: auto;
  padding: 22px 24px 28px;
  scrollbar-color: var(--line, #303736) transparent;
  scrollbar-width: thin;
}

.workspace-window__content :deep(> :first-child) {
  margin-top: 0;
}

.workspace-window__content :deep(> :last-child) {
  margin-bottom: 0;
}

.workspace-window__content :deep(p) {
  max-width: 54em;
  margin: 0 0 16px;
  color: rgba(232, 236, 233, 0.72);
  font-family: system-ui, sans-serif;
  font-size: 12px;
  line-height: 1.75;
}

.workspace-window__content :deep(h3) {
  margin: 22px 0 8px;
  color: var(--white, #e8ece9);
  font-family: var(--display, "Barlow Condensed", sans-serif);
  font-size: 23px;
  font-weight: 550;
  line-height: 1.1;
  letter-spacing: 0.045em;
}

.workspace-window__content :deep(hr) {
  height: 1px;
  margin: 20px 0;
  border: 0;
  background: linear-gradient(90deg, var(--line, #303736), transparent 86%);
}

.workspace-window__content :deep(code) {
  display: inline-block;
  padding: 3px 6px;
  border: 1px solid rgba(85, 230, 220, 0.16);
  color: var(--arc, #55e6dc);
  background: rgba(85, 230, 220, 0.035);
  font-family: var(--mono, "IBM Plex Mono", monospace);
  font-size: 8px;
  line-height: 1.2;
  letter-spacing: 0.1em;
}

.workspace-window__content :deep(ul) {
  display: grid;
  gap: 8px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}

.workspace-window__content :deep(li) {
  padding: 10px 12px;
  border-left: 1px solid var(--line, #303736);
  color: rgba(232, 236, 233, 0.68);
}

.workspace-window__content :deep(a) {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 360px;
  padding: 13px 15px;
  border: 1px solid var(--line, #303736);
  color: var(--white, #e8ece9);
  font-size: 10px;
  line-height: 1;
  letter-spacing: 0.08em;
  text-decoration: none;
  transition:
    border-color 160ms ease,
    color 160ms ease,
    padding-left 160ms ease;
}

.workspace-window__content :deep(a::after) {
  color: var(--muted, #87908c);
  content: "↗";
}

.workspace-window__content :deep(a:hover) {
  padding-left: 19px;
  border-color: var(--arc, #55e6dc);
  color: var(--arc, #55e6dc);
}

.workspace-window__content :deep(a:focus-visible) {
  outline: 1px solid var(--arc, #55e6dc);
  outline-offset: 3px;
}

.workspace-window__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 29px;
  padding: 0 14px;
  border-top: 1px solid var(--line, #303736);
  color: rgba(135, 144, 140, 0.72);
  background: transparent;
  font-size: 7px;
  line-height: 1;
  letter-spacing: 0.13em;
}

@media (max-width: 700px) {
  .workspace-window {
    inset: clamp(82px, 10svh, 96px) 12px clamp(68px, 9svh, 82px) !important;
    width: auto;
    height: auto;
    min-height: 0;
  }

  .workspace-window__header {
    min-height: 68px;
    padding-left: 16px;
    cursor: default;
    touch-action: auto;
  }

  .workspace-window__identity h2 {
    font-size: 21px;
  }

  .workspace-window__content {
    padding: 19px 18px 24px;
  }

  .workspace-window__footer {
    padding-inline: 11px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .workspace-window__close,
  .workspace-window__content :deep(a) {
    transition: none;
  }
}
</style>
