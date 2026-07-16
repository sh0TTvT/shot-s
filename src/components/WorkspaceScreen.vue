<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useInteractionContext, type InteractionInput } from "../composables/useInteractionContext";
import { useWorkspaceScrollProgress } from "../composables/useWorkspaceScrollProgress";
import { projects } from "../data/projects";
import { workspaceSections } from "../data/workspaceSections";
import type { WorkspaceSectionId } from "../types/workspace";
import ProjectsShowcase from "./ProjectsShowcase.vue";
import UpdateLogList from "./UpdateLogList.vue";

const props = defineProps<{ id: WorkspaceSectionId }>();

const emit = defineEmits<{
  back: [input: InteractionInput];
}>();

const screenElement = ref<HTMLElement | null>(null);
const stageElement = ref<HTMLElement | null>(null);
const sectionData = computed(() => workspaceSections[props.id]);
const titleId = computed(() => `workspace-screen-title-${props.id}`);
const isMinimalDocument = computed(() => props.id === "lab" || props.id === "monologue");
const { setInteraction, clearInteraction } = useInteractionContext();
const { setScrollMetrics, resetScrollProgress } = useWorkspaceScrollProgress();
let scrollFrame: number | undefined;
let stageResizeObserver: ResizeObserver | undefined;

const updateScrollProgress = () => {
  const stage = stageElement.value;
  if (!stage) {
    resetScrollProgress();
    return;
  }

  setScrollMetrics(stage.scrollTop, stage.scrollHeight, stage.clientHeight);
};

const handleStageScroll = () => {
  if (scrollFrame !== undefined) return;

  // WHY: 高频滚动读数合并到单帧，避免 HUD 数字更新影响内容滚动流畅度。
  scrollFrame = window.requestAnimationFrame(() => {
    scrollFrame = undefined;
    updateScrollProgress();
  });
};

const observeStageSize = () => {
  stageResizeObserver?.disconnect();
  const stage = stageElement.value;
  if (!stage) return;

  // WHY: 图片与字体晚于组件挂载完成时会改变可滚动距离，观察内容尺寸才能保持百分比准确。
  stageResizeObserver = new ResizeObserver(handleStageScroll);
  stageResizeObserver.observe(stage);
  Array.from(stage.children).forEach((child) => stageResizeObserver?.observe(child));
};

const setScreenInteraction = (input: InteractionInput = "POINTER") => {
  setInteraction(sectionData.value.label, "VIEW", input);
};

const requestBack = (input: InteractionInput = "POINTER") => {
  setInteraction("HOME", "RETURN", input);
  emit("back", input);
};

const handleBackClick = (event: MouseEvent) => {
  requestBack(event.detail === 0 ? "KEYBOARD" : "POINTER");
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key !== "Escape") return;
  event.preventDefault();
  requestBack("KEYBOARD");
};

watch(
  () => props.id,
  async (_, previousId) => {
    clearInteraction(workspaceSections[previousId].label);
    setScreenInteraction();
    await nextTick();
    screenElement.value?.focus({ preventScroll: true });
    updateScrollProgress();
    observeStageSize();
  },
);

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
  window.addEventListener("resize", handleStageScroll, { passive: true });
  setScreenInteraction();
  // WHY: 焦点先进入新界面语义容器，既避免遗留在已卸载的 Home 入口，也不会把返回按钮误标为当前动作。
  screenElement.value?.focus({ preventScroll: true });
  nextTick(() => {
    updateScrollProgress();
    observeStageSize();
  });
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeydown);
  window.removeEventListener("resize", handleStageScroll);
  if (scrollFrame !== undefined) window.cancelAnimationFrame(scrollFrame);
  stageResizeObserver?.disconnect();
  resetScrollProgress();
  clearInteraction(sectionData.value.label);
});
</script>

<template>
  <section
    ref="screenElement"
    class="workspace-screen"
    tabindex="-1"
    :aria-labelledby="titleId"
    @pointerenter="setScreenInteraction()"
  >
    <div class="workspace-screen__shell">
      <header class="workspace-screen__header">
        <button
          class="workspace-screen__back"
          type="button"
          aria-label="返回 Home 界面"
          @pointerenter="setInteraction('HOME', 'RETURN', 'POINTER')"
          @pointerleave="setScreenInteraction()"
          @click="handleBackClick"
        >
          <span aria-hidden="true">&lt;</span>
          <span>SYS.HOME</span>
        </button>

        <div class="workspace-screen__heading">
          <span class="workspace-screen__section-title" aria-hidden="true">
            {{ sectionData.label }}
          </span>

          <div class="workspace-screen__status" aria-label="当前内容区域">
            <span>{{ sectionData.label }}</span>
            <span>{{ sectionData.code }}</span>
          </div>
        </div>
      </header>

      <div
        ref="stageElement"
        class="workspace-screen__stage"
        :class="{
          'workspace-screen__stage--minimal': isMinimalDocument,
          'workspace-screen__stage--logs': props.id === 'logs',
        }"
        tabindex="0"
        aria-label="内容滚动区域"
        @scroll.passive="handleStageScroll"
      >
        <ProjectsShowcase
          v-if="props.id === 'projects'"
          :items="projects"
          :heading-id="titleId"
        />

        <UpdateLogList v-else-if="props.id === 'logs'" />

        <template v-else>
          <aside v-if="!isMinimalDocument" class="workspace-screen__identity" aria-hidden="true">
            <span class="workspace-screen__index">{{ sectionData.code.slice(-2) }}</span>
            <span class="workspace-screen__rail"></span>
            <span>SECTION / ACTIVE</span>
          </aside>

          <article class="workspace-screen__document">
            <p v-if="!isMinimalDocument" class="workspace-screen__label">{{ sectionData.label }}</p>
            <h1
              :id="titleId"
              :class="{ 'workspace-screen__title--visually-hidden': isMinimalDocument }"
            >
              {{ sectionData.title }}
            </h1>
            <div class="workspace-screen__content" v-html="sectionData.content"></div>
          </article>
        </template>
      </div>
    </div>
  </section>
</template>

<style scoped>
.workspace-screen {
  position: relative;
  z-index: 2;
  height: 100svh;
  min-height: 0;
  overflow: hidden;
  color: var(--white);
  background: transparent;
  outline: none;
}

.workspace-screen__shell {
  --workspace-gap: clamp(40px, 6vw, 90px);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  width: min(100%, 1440px);
  height: 100%;
  min-height: 0;
  margin: 0 auto;
  padding:
    clamp(92px, 11vh, 116px)
    clamp(74px, 7vw, 116px)
    clamp(74px, 9vh, 94px);
}

.workspace-screen__header {
  --back-arrow-width: clamp(19px, 1.65vw, 23px);
  --back-gap: 12px;
  --back-label-offset: calc(var(--back-arrow-width) + var(--back-gap));
  display: grid;
  grid-template-columns: minmax(110px, 0.28fr) minmax(0, 1.72fr);
  gap: var(--workspace-gap);
  align-items: center;
  padding-bottom: clamp(10px, 1.8vh, 16px);
}

.workspace-screen__back {
  position: relative;
  z-index: 1;
  grid-column: 1;
  grid-row: 1;
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: var(--back-gap);
  min-height: 44px;
  padding: 0;
  border: 0;
  color: var(--arc);
  background: transparent;
  font-family: var(--mono);
  font-size: clamp(10px, 0.85vw, 12px);
  letter-spacing: 0.18em;
  cursor: pointer;
  transition:
    color 180ms ease,
    transform 220ms cubic-bezier(0.16, 1, 0.3, 1),
    text-shadow 220ms ease;
}

.workspace-screen__back > span:first-child {
  flex: 0 0 var(--back-arrow-width);
  width: var(--back-arrow-width);
  color: var(--arc);
  font-size: var(--back-arrow-width);
  line-height: 1;
}

.workspace-screen__back:hover,
.workspace-screen__back:focus-visible {
  color: var(--arc);
  transform: translateX(-5px);
  text-shadow: 2px 0 rgba(255, 0, 0, 0.25), -2px 0 rgba(0, 255, 255, 0.25);
}

.workspace-screen__back:active {
  transform: translateX(-5px) scale(0.97);
}

.workspace-screen__back:focus-visible {
  outline: 1px solid var(--arc);
  outline-offset: 6px;
}

.workspace-screen__heading {
  grid-column: 1 / -1;
  grid-row: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: clamp(28px, 4vw, 64px);
  min-width: 0;
  pointer-events: none;
}

.workspace-screen__section-title {
  min-width: 0;
  overflow: hidden;
  padding-left: var(--back-label-offset);
  color: var(--white);
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(44px, 5.8vw, 76px);
  font-weight: 500;
  line-height: 0.8;
  letter-spacing: 0.06em;
  opacity: 0.05;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.workspace-screen__status {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 14px;
  color: var(--muted);
  font-size: clamp(8px, 0.72vw, 10px);
  letter-spacing: 0.15em;
}

.workspace-screen__status span:last-child {
  padding-left: 14px;
  border-left: 1px solid var(--line);
  color: var(--arc);
}

.workspace-screen__stage {
  display: grid;
  grid-template-columns: minmax(110px, 0.28fr) minmax(0, 1.72fr);
  gap: var(--workspace-gap);
  align-items: start;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior-y: contain;
  scrollbar-width: none;
  padding-block: clamp(48px, 8vh, 86px);
}

.workspace-screen__stage::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.workspace-screen__stage:focus-visible {
  outline: 1px solid color-mix(in srgb, var(--arc) 34%, transparent);
  outline-offset: -1px;
}

.workspace-screen__stage--logs {
  grid-template-columns: minmax(0, 1fr);
}

.workspace-screen__stage--minimal .workspace-screen__document {
  grid-column: 2;
  width: 100%;
  max-width: 1040px;
  transform: translateX(clamp(-64px, -4vw, -36px));
}

.workspace-screen__stage--minimal .workspace-screen__content {
  max-width: 1040px;
}

.workspace-screen__stage--minimal .workspace-screen__content :deep(p) {
  max-width: 64em;
  font-size: clamp(16px, 1.4vw, 20px);
  line-height: 1.75;
}

.workspace-screen__identity {
  display: grid;
  grid-template-rows: auto minmax(118px, 28vh) auto;
  gap: 18px;
  align-items: start;
  color: var(--muted);
  font-size: 7px;
  letter-spacing: 0.17em;
}

.workspace-screen__index {
  color: var(--arc);
  font-family: var(--display);
  font-size: clamp(42px, 5vw, 70px);
  font-weight: 500;
  line-height: 0.9;
  letter-spacing: 0.02em;
}

.workspace-screen__rail {
  display: block;
  width: 1px;
  height: 100%;
  margin-left: 3px;
  background: linear-gradient(var(--arc), color-mix(in srgb, var(--line) 45%, transparent));
}

.workspace-screen__document {
  min-width: 0;
  max-width: 920px;
}

.workspace-screen__label {
  margin: 0 0 14px;
  color: var(--arc);
  font-size: 9px;
  letter-spacing: 0.18em;
}

.workspace-screen__document h1 {
  max-width: 11ch;
  margin: 0 0 clamp(38px, 6vh, 60px);
  font-family: var(--display);
  font-size: clamp(48px, 7vw, 92px);
  font-weight: 520;
  line-height: 0.88;
  letter-spacing: 0.025em;
  text-wrap: balance;
  text-shadow: 0 10px 34px rgba(0, 0, 0, 0.42);
}

.workspace-screen__document .workspace-screen__title--visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
}

.workspace-screen__content {
  max-width: 760px;
}

.workspace-screen__content :deep(> :first-child) {
  margin-top: 0;
}

.workspace-screen__content :deep(> :last-child) {
  margin-bottom: 0;
}

.workspace-screen__content :deep(p) {
  max-width: 58em;
  margin: 0 0 22px;
  color: rgba(232, 236, 233, 0.76);
  font-family: system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.82;
  text-shadow: 0 1px 14px rgba(0, 0, 0, 0.78);
}

.workspace-screen__content :deep(h3) {
  margin: 34px 0 11px;
  color: var(--white);
  font-family: var(--display);
  font-size: clamp(25px, 3vw, 34px);
  font-weight: 520;
  line-height: 1.08;
  letter-spacing: 0.04em;
}

.workspace-screen__content :deep(hr) {
  width: min(100%, 520px);
  height: 1px;
  margin: 31px 0;
  border: 0;
  background: linear-gradient(90deg, var(--line), transparent 88%);
}

.workspace-screen__content :deep(code) {
  display: inline-block;
  padding: 4px 7px;
  border-left: 1px solid var(--arc);
  color: var(--arc);
  background: color-mix(in srgb, var(--arc) 4%, transparent);
  font-family: var(--mono);
  font-size: 8px;
  line-height: 1.2;
  letter-spacing: 0.1em;
}

.workspace-screen__content :deep(ul) {
  display: grid;
  gap: 10px;
  max-width: 620px;
  margin: 16px 0 0;
  padding: 0;
  list-style: none;
}

.workspace-screen__content :deep(li) {
  padding: 11px 14px;
  border-left: 1px solid var(--line);
  color: rgba(232, 236, 233, 0.7);
}

.workspace-screen__content :deep(a) {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 18px;
  min-height: 44px;
  padding: 0 2px;
  border-bottom: 1px solid var(--line);
  color: var(--white);
  font-size: 10px;
  line-height: 1;
  letter-spacing: 0.08em;
  text-decoration: none;
  transition:
    border-color 160ms ease,
    color 160ms ease,
    transform 180ms ease;
}

.workspace-screen__content :deep(a::after) {
  color: var(--muted);
  content: "↗";
}

.workspace-screen__content :deep(a:hover),
.workspace-screen__content :deep(a:focus-visible) {
  border-color: var(--arc);
  color: var(--arc);
  transform: translateX(5px);
}

.workspace-screen__content :deep(a:focus-visible) {
  outline: 1px solid var(--arc);
  outline-offset: 5px;
}

@media (max-width: 760px) {
  .workspace-screen__shell {
    padding: 132px 28px 78px;
  }

  .workspace-screen__header {
    --back-gap: 9px;
    grid-template-columns: auto minmax(0, 1fr);
    gap: clamp(14px, 4vw, 24px);
    padding-bottom: 10px;
  }

  .workspace-screen__back {
    grid-column: 1;
    font-size: 10px;
  }

  .workspace-screen__heading {
    grid-column: 1 / -1;
    gap: 16px;
  }

  .workspace-screen__status span:first-child {
    display: none;
  }

  .workspace-screen__status span:last-child {
    padding-left: 0;
    border-left: 0;
  }

  .workspace-screen__stage {
    grid-template-columns: 1fr;
    gap: 28px;
    padding-block: 38px 50px;
  }

  .workspace-screen__stage--minimal .workspace-screen__document {
    grid-column: 1;
    transform: none;
  }

  .workspace-screen__identity {
    display: flex;
    align-items: center;
    gap: 15px;
  }

  .workspace-screen__index {
    font-size: 36px;
  }

  .workspace-screen__rail {
    width: min(90px, 24vw);
    height: 1px;
    margin-left: 0;
    background: linear-gradient(90deg, var(--arc), var(--line));
  }

  .workspace-screen__document h1 {
    margin-bottom: 34px;
    font-size: clamp(43px, 14vw, 66px);
  }
}

@media (max-width: 420px) {
  .workspace-screen__shell {
    padding-right: 36px;
    padding-left: 20px;
  }

  .workspace-screen__status {
    display: none;
  }

}

@media (prefers-reduced-motion: reduce) {
  .workspace-screen__back,
  .workspace-screen__content :deep(a) {
    transition-duration: 0.01ms !important;
  }
}
</style>
