<script setup lang="ts">
import type { ComponentPublicInstance } from "vue";
import { useInteractionContext, type InteractionInput } from "../composables/useInteractionContext";
import { workspaceLabels, type WorkspaceWindowId } from "../types/workspace";

const props = defineProps<{ activeId?: WorkspaceWindowId }>();

const emit = defineEmits<{
  open: [id: WorkspaceWindowId, trigger: HTMLButtonElement, input: InteractionInput];
}>();

const { setInteraction, clearInteraction } = useInteractionContext();
const buttonRefs = new Map<WorkspaceWindowId, HTMLButtonElement>();
let lastActivationInput: InteractionInput = "POINTER";

const entries: Array<{
  id: WorkspaceWindowId;
  index: string;
  category: string;
  title: string;
  description: string;
  hash: string;
}> = [
  { id: "projects", index: "01", category: "ARCHIVE", title: "Projects.", description: "SELECTED BUILDS", hash: "0x91A4" },
  { id: "lab", index: "02", category: "EXPERIMENTS", title: "Lab.", description: "RUNNING EXPERIMENTS", hash: "0xC27E" },
  { id: "logs", index: "03", category: "LOGS", title: "Logs.", description: "FIELD NOTES", hash: "0x5B08" },
  { id: "contact", index: "04", category: "CHANNEL", title: "Contact.", description: "DIRECT CHANNEL", hash: "0xE410" },
];

const setButtonRef = (
  id: WorkspaceWindowId,
  element: Element | ComponentPublicInstance | null,
) => {
  if (element instanceof HTMLButtonElement) buttonRefs.set(id, element);
};

const focusLauncher = (id: WorkspaceWindowId) => buttonRefs.get(id)?.focus();
defineExpose({ focusLauncher });

const updateContext = (
  id: WorkspaceWindowId,
  input: InteractionInput,
  action = "OPEN",
) => setInteraction(workspaceLabels[id], action, input);

const resetButton = (id: WorkspaceWindowId) => {
  if (props.activeId === id) updateContext(id, lastActivationInput, "WINDOW");
  else clearInteraction(workspaceLabels[id]);
};

const handleFocus = (id: WorkspaceWindowId, event: FocusEvent) => {
  const button = event.currentTarget as HTMLButtonElement;
  const input = button.matches(":focus-visible") ? "KEYBOARD" : lastActivationInput;
  updateContext(id, input, props.activeId === id ? "WINDOW" : "OPEN");
};

const openWindow = (id: WorkspaceWindowId, event: MouseEvent) => {
  lastActivationInput = event.detail === 0 ? "KEYBOARD" : "POINTER";
  updateContext(id, lastActivationInput, "WINDOW");
  emit("open", id, event.currentTarget as HTMLButtonElement, lastActivationInput);
};
</script>

<template>
  <nav class="directory-launcher" aria-label="内容目录">
    <header class="directory-launcher__header">
      <span>&gt; SYS.EXPLORE</span>
      <span>DIR_LIST</span>
    </header>

    <div class="directory-launcher__list">
      <button
        v-for="entry in entries"
        :key="entry.id"
        :ref="(element) => setButtonRef(entry.id, element)"
        class="directory-entry"
        :class="{ 'directory-entry--active': activeId === entry.id }"
        type="button"
        :disabled="activeId === entry.id"
        :aria-expanded="activeId === entry.id"
        @click="openWindow(entry.id, $event)"
        @pointerenter="updateContext(entry.id, 'POINTER')"
        @pointerleave="resetButton(entry.id)"
        @focus="handleFocus(entry.id, $event)"
        @blur="resetButton(entry.id)"
      >
        <span class="directory-entry__inner">
          <span class="directory-entry__content">
            <small>{{ entry.index }} / {{ entry.category }}</small>
            <strong><i aria-hidden="true">&gt;</i> {{ entry.title }}</strong>
            <span>{{ entry.description }}</span>
          </span>
          <span class="directory-entry__hash" aria-hidden="true">
            HASH: {{ entry.hash }} <i>_</i>
          </span>
        </span>
      </button>
    </div>
  </nav>
</template>

<style scoped>
.directory-launcher {
  display: grid;
  min-width: 0;
  align-content: center;
}

.directory-launcher__header {
  display: flex;
  justify-content: space-between;
  margin-bottom: clamp(18px, 3vh, 30px);
  padding-inline: 3px;
  color: var(--muted);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.28em;
}

.directory-launcher__header span:first-child {
  color: var(--white);
}

.directory-launcher__list {
  display: grid;
  gap: clamp(18px, 2.4vh, 24px);
}

.directory-entry {
  position: relative;
  min-height: clamp(96px, 15vh, 146px);
  padding: 0;
  border: 0;
  color: var(--white);
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition:
    margin-left 500ms cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 500ms cubic-bezier(0.16, 1, 0.3, 1),
    text-shadow 600ms cubic-bezier(0.19, 1, 0.22, 1);
}

.directory-entry::after {
  position: absolute;
  top: 0;
  left: -9px;
  width: 2px;
  height: 0;
  background: var(--arc);
  box-shadow: 0 0 10px var(--arc);
  content: "";
  opacity: 0;
  transition: height 400ms ease, opacity 400ms ease;
}

.directory-entry:hover,
.directory-entry:focus-visible,
.directory-entry--active {
  margin-left: 16px;
  box-shadow: 0 10px 30px -10px color-mix(in srgb, var(--arc) 28%, transparent);
  text-shadow: 2px 0 rgba(255, 0, 0, 0.34), -2px 0 rgba(0, 255, 255, 0.34);
}

.directory-entry:hover::after,
.directory-entry:focus-visible::after,
.directory-entry--active::after {
  height: 100%;
  opacity: 0.8;
}

.directory-entry:disabled {
  cursor: default;
}

.directory-entry__inner {
  display: flex;
  min-height: inherit;
  align-items: flex-end;
  justify-content: space-between;
  padding: clamp(25px, 3vw, 38px);
  gap: 28px;
}

.directory-entry__content {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.directory-entry__content small {
  margin-bottom: 7px;
  color: var(--muted);
  font-size: 9px;
  letter-spacing: 0.14em;
  opacity: 0.55;
  transition: color 300ms ease, opacity 300ms ease;
}

.directory-entry__content strong {
  margin-bottom: 3px;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(28px, 3vw, 42px);
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0.015em;
}

.directory-entry__content strong i {
  color: var(--white);
  font-family: var(--mono);
  font-size: 0.68em;
  font-style: normal;
  font-weight: 400;
}

.directory-entry__content > span {
  color: var(--muted);
  font-size: 9px;
  letter-spacing: 0.13em;
  opacity: 0.72;
}

.directory-entry__hash {
  flex: none;
  color: var(--arc);
  font-size: 8px;
  letter-spacing: 0.1em;
  opacity: 0.18;
  transition: opacity 300ms ease;
}

.directory-entry__hash i {
  font-style: normal;
  animation: directory-caret 1s steps(1, end) infinite;
}

.directory-entry:hover .directory-entry__content small,
.directory-entry:focus-visible .directory-entry__content small,
.directory-entry--active .directory-entry__content small,
.directory-entry:hover .directory-entry__hash,
.directory-entry:focus-visible .directory-entry__hash,
.directory-entry--active .directory-entry__hash {
  color: var(--arc);
  opacity: 1;
}

@keyframes directory-caret {
  50% {
    opacity: 0;
  }
}

@media (max-width: 760px) {
  .directory-launcher__list {
    grid-template-columns: 1fr 1fr;
  }

  .directory-entry {
    min-height: 132px;
  }

  .directory-entry:hover,
  .directory-entry:focus-visible,
  .directory-entry--active {
    margin-left: 6px;
  }

  .directory-entry__inner {
    align-items: flex-start;
    padding: 22px;
    flex-direction: column;
  }

  .directory-entry__hash {
    align-self: flex-end;
  }
}

@media (max-height: 800px) and (min-width: 761px) {
  .directory-launcher__list {
    gap: 14px;
  }

  .directory-entry__inner {
    padding: 18px 30px;
  }
}

@media (max-width: 460px) {
  .directory-launcher__list {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .directory-entry,
  .directory-entry::after,
  .directory-entry__content small,
  .directory-entry__hash {
    transition-duration: 0.01ms !important;
  }

  .directory-entry__hash i {
    animation: none;
  }
}
</style>
