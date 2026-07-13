<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useInteractionContext } from "../composables/useInteractionContext";
import type { InteractionInput } from "../composables/useInteractionContext";
import {
  workspaceLabels,
  workspaceWindowIds,
  type WorkspaceWindowId,
} from "../types/workspace";
import ContourMap from "./ContourMap.vue";
import DirectoryLauncher from "./DirectoryLauncher.vue";
import OperatorProfileCard from "./OperatorProfileCard.vue";
import WorkspaceWindow from "./WorkspaceWindow.vue";

type DirectoryLauncherInstance = InstanceType<typeof DirectoryLauncher>;

const route = useRoute();
const router = useRouter();
const directoryLauncher = ref<DirectoryLauncherInstance | null>(null);
const returnFocusId = ref<WorkspaceWindowId>();
const windowOrigin = ref<{ x: number; y: number }>();
const { setInteraction, clearInteraction } = useInteractionContext();

const activeWindow = computed<WorkspaceWindowId | undefined>(() => {
  const id = String(route.params.windowId ?? "");
  return workspaceWindowIds.includes(id as WorkspaceWindowId)
    ? (id as WorkspaceWindowId)
    : undefined;
});

const openWindow = async (
  id: WorkspaceWindowId,
  trigger: HTMLButtonElement,
  input: InteractionInput,
) => {
  returnFocusId.value = id;
  const bounds = trigger.getBoundingClientRect();
  windowOrigin.value = {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
  };
  setInteraction(workspaceLabels[id], "WINDOW", input);
  if (activeWindow.value === id) return;
  const destination = { name: "workspace", params: { windowId: id } } as const;
  if (activeWindow.value) await router.replace(destination);
  else await router.push(destination);
};

const closeWindow = async (input: InteractionInput) => {
  if (activeWindow.value) returnFocusId.value = activeWindow.value;
  setInteraction("HOME", "READY", input);
  await router.replace({ name: "home" });
};

watch(activeWindow, async (current, previous) => {
  if (current || !previous) return;
  returnFocusId.value ??= previous;
  await nextTick();
  directoryLauncher.value?.focusLauncher(returnFocusId.value);
});

onBeforeUnmount(() => clearInteraction());
</script>

<template>
  <main
    class="home-screen"
    :class="{ 'home-screen--window-open': activeWindow }"
  >
    <div class="home-screen__contour" aria-hidden="true">
      <ContourMap :pointer-scale="0.35" :paused="Boolean(activeWindow)" />
    </div>

    <div class="home-layout">
      <OperatorProfileCard
        class="home-layout__profile"
        :inert="Boolean(activeWindow)"
        :aria-hidden="activeWindow ? 'true' : undefined"
      />
      <DirectoryLauncher
        ref="directoryLauncher"
        class="home-layout__directory"
        :active-id="activeWindow"
        @open="openWindow"
      />
    </div>

    <div class="workspace-window-layer" aria-live="polite">
      <WorkspaceWindow
        v-if="activeWindow"
        :key="activeWindow"
        :id="activeWindow"
        :origin="windowOrigin"
        @close="closeWindow"
      />
    </div>
  </main>
</template>

<style scoped>
.home-screen {
  position: relative;
  height: 100svh;
  min-height: 100svh;
  overflow-x: hidden;
  overflow-y: auto;
  isolation: isolate;
  background:
    radial-gradient(circle at 23% 52%, rgba(85, 230, 220, 0.035), transparent 28rem),
    linear-gradient(115deg, rgba(255, 255, 255, 0.012), transparent 44%),
    var(--obsidian);
}

.home-screen::after {
  position: fixed;
  inset: 0;
  z-index: 1;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='homeNoise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.76' numOctaves='3' stitchTiles='stitchTiles'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23homeNoise)' opacity='.14'/%3E%3C/svg%3E");
  content: "";
  opacity: 0.14;
  mix-blend-mode: soft-light;
  pointer-events: none;
}

.home-screen--window-open {
  overflow: hidden;
}

.home-screen__contour {
  position: fixed;
  inset: -4%;
  z-index: 0;
  opacity: 0.32;
  transition: opacity 320ms ease;
  pointer-events: none;
}

.home-layout {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns:
    minmax(360px, 0.7fr)
    minmax(580px, 1.3fr);
  gap: clamp(28px, 2.4vw, 36px);
  width: min(100%, 1440px);
  min-height: 100svh;
  margin: 0 auto;
  padding:
    clamp(112px, 15vh, 148px)
    clamp(74px, 7vw, 116px)
    clamp(90px, 12vh, 118px);
  transition: opacity 260ms ease, transform 320ms cubic-bezier(0.16, 1, 0.3, 1);
}

.home-layout__profile {
  --profile-offset-x: clamp(-36px, -2.5vw, -18px);
  align-self: center;
  min-height: clamp(400px, 52svh, 520px);
}

.home-layout__profile,
.home-layout__directory {
  min-width: 0;
  transition: opacity 240ms ease;
}

.home-screen--window-open .home-layout {
  transform: scale(0.992);
}

.home-screen--window-open .home-layout__profile {
  opacity: 0.2;
  pointer-events: none;
}

.home-screen--window-open .home-layout__directory {
  opacity: 0.58;
}

.home-screen--window-open .home-screen__contour {
  opacity: 0.26;
}

.workspace-window-layer {
  position: absolute;
  inset: clamp(72px, 8vw, 104px);
  z-index: 50;
  pointer-events: none;
}

.workspace-window-layer > * {
  pointer-events: auto;
}

@media (max-width: 1080px) {
  .home-layout {
    grid-template-columns: minmax(290px, 0.78fr) minmax(420px, 1.22fr);
    gap: clamp(24px, 3vw, 40px);
    min-height: auto;
    padding-top: 126px;
    padding-bottom: 128px;
  }

  .home-layout__profile {
    --profile-offset-x: -12px;
  }
}

@media (max-width: 760px) {
  .home-layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: 34px;
    padding: 118px 28px 124px;
  }

  .home-layout__profile {
    --profile-offset-x: 0px;
  }

  .workspace-window-layer {
    position: fixed;
    inset: 70px 14px 70px;
  }
}

@media (max-width: 420px) {
  .home-layout {
    padding-inline: 20px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-layout,
  .home-screen__contour {
    transition-duration: 0.01ms !important;
  }
}
</style>
