<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useInteractionContext } from "../composables/useInteractionContext";
import type { InteractionInput } from "../composables/useInteractionContext";
import {
  workspaceLabels,
  workspaceSectionIds,
  type WorkspaceSectionId,
} from "../types/workspace";
import DirectoryLauncher from "./DirectoryLauncher.vue";
import OperatorProfileCard from "./OperatorProfileCard.vue";
import WorkspaceScreen from "./WorkspaceScreen.vue";

type DirectoryLauncherInstance = InstanceType<typeof DirectoryLauncher>;

const route = useRoute();
const router = useRouter();
const directoryLauncher = ref<DirectoryLauncherInstance | null>(null);
const returnFocusId = ref<WorkspaceSectionId>();
const { setInteraction, clearInteraction } = useInteractionContext();

const activeSection = computed<WorkspaceSectionId | undefined>(() => {
  const id = String(route.params.sectionId ?? "");
  return workspaceSectionIds.includes(id as WorkspaceSectionId)
    ? (id as WorkspaceSectionId)
    : undefined;
});

const openSection = async (id: WorkspaceSectionId, input: InteractionInput) => {
  returnFocusId.value = id;
  setInteraction(workspaceLabels[id], "OPEN", input);
  if (activeSection.value === id) return;
  await router.push({ name: "workspace", params: { sectionId: id } });
};

const returnHome = async (input: InteractionInput) => {
  if (activeSection.value) returnFocusId.value = activeSection.value;
  setInteraction("HOME", "READY", input);
  await router.replace({ name: "home" });
};

watch(activeSection, (current, previous) => {
  if (current || !previous) return;
  returnFocusId.value ??= previous;
});

const restoreLauncherFocus = async () => {
  if (activeSection.value || !returnFocusId.value) return;
  await nextTick();
  directoryLauncher.value?.focusLauncher(returnFocusId.value);
};

onBeforeUnmount(() => clearInteraction());
</script>

<template>
  <main class="home-screen">
    <Transition name="workspace-switch" mode="out-in" @after-enter="restoreLauncherFocus">
      <div v-if="!activeSection" key="home" class="home-layout">
        <OperatorProfileCard class="home-layout__profile" />
        <DirectoryLauncher
          ref="directoryLauncher"
          class="home-layout__directory"
          @open="openSection"
        />
      </div>

      <WorkspaceScreen
        v-else
        :key="activeSection"
        :id="activeSection"
        @back="returnHome"
      />
    </Transition>
  </main>
</template>

<style scoped>
.home-screen {
  position: relative;
  height: 100svh;
  min-height: 100svh;
  overflow: clip;
  isolation: isolate;
  background: transparent;
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
}

.home-layout__profile {
  --profile-offset-x: clamp(-36px, -2.5vw, -18px);
  align-self: center;
  min-height: clamp(400px, 52svh, 520px);
}

.home-layout__profile,
.home-layout__directory {
  min-width: 0;
}

.workspace-switch-enter-active,
.workspace-switch-leave-active {
  transition:
    opacity 220ms ease,
    transform 360ms cubic-bezier(0.16, 1, 0.3, 1),
    filter 260ms ease;
}

.workspace-switch-enter-from {
  opacity: 0;
  filter: blur(3px);
  transform: translateY(18px) scale(0.992);
}

.workspace-switch-leave-to {
  opacity: 0;
  filter: blur(2px);
  transform: translateY(-10px) scale(1.006);
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

}

@media (max-width: 420px) {
  .home-layout {
    padding-inline: 20px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .workspace-switch-enter-active,
  .workspace-switch-leave-active {
    transition-duration: 0.01ms !important;
  }
}
</style>
