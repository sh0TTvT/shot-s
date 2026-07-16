<script setup lang="ts">
import { ref } from "vue";

type UpdateLog = {
  id: string;
  title: string;
  date: string;
  paragraphs: string[];
};

const updateLogs: UpdateLog[] = [
  {
    id: "site-launched",
    title: "网站上线了",
    date: "2026.07.16",
    paragraphs: ["网站上线了"],
  },
];

const expandedIds = ref<Set<string>>(new Set());

const isExpanded = (id: string) => expandedIds.value.has(id);

const toggleLog = (id: string) => {
  const nextIds = new Set(expandedIds.value);

  if (nextIds.has(id)) {
    nextIds.delete(id);
  } else {
    nextIds.add(id);
  }

  expandedIds.value = nextIds;
};
</script>

<template>
  <article class="update-log" aria-labelledby="workspace-screen-title-logs">
    <h1 id="workspace-screen-title-logs" class="update-log__sr-only">PUBLIC LOG</h1>

    <div class="update-log__list">
      <section
        v-for="entry in updateLogs"
        :key="entry.id"
        class="update-log__entry"
        :class="{ 'update-log__entry--expanded': isExpanded(entry.id) }"
      >
        <h2 class="update-log__heading">
          <button
            class="update-log__trigger"
            type="button"
            :aria-expanded="isExpanded(entry.id)"
            :aria-controls="`${entry.id}-content`"
            @click="toggleLog(entry.id)"
          >
            <span class="update-log__title">{{ entry.title }}</span>
            <time class="update-log__date" :datetime="entry.date.replaceAll('.', '-')">
              {{ entry.date }}
            </time>
            <span class="update-log__marker" aria-hidden="true"></span>
          </button>
        </h2>

        <div
          :id="`${entry.id}-content`"
          class="update-log__disclosure"
          :class="{ 'update-log__disclosure--expanded': isExpanded(entry.id) }"
          role="region"
          :aria-label="`${entry.title}正文`"
          :aria-hidden="!isExpanded(entry.id)"
        >
          <div class="update-log__body">
            <div class="update-log__body-inner">
              <p v-for="paragraph in entry.paragraphs" :key="paragraph">{{ paragraph }}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  </article>
</template>

<style scoped>
.update-log {
  min-width: 0;
  width: 100%;
}

.update-log__sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.update-log__list {
  display: grid;
  gap: clamp(18px, 2.4vw, 30px);
  width: 100%;
}

.update-log__entry {
  position: relative;
  isolation: isolate;
  min-width: 0;
  border: 1px solid rgba(232, 236, 233, 0.16);
  background: transparent;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
  transform: translateY(0);
  transition:
    border-color 220ms ease,
    box-shadow 280ms ease,
    transform 320ms cubic-bezier(0.16, 1, 0.3, 1);
}

.update-log__entry:hover,
.update-log__entry:focus-within {
  box-shadow:
    0 0 18px rgba(232, 236, 233, 0.2),
    0 0 42px rgba(232, 236, 233, 0.08),
    0 24px 58px rgba(0, 0, 0, 0.42);
  transform: translateY(-6px);
}

.update-log__entry:focus-within {
  outline: 1px solid var(--arc);
  outline-offset: 5px;
}

.update-log__entry--expanded {
  border-color: color-mix(in srgb, var(--arc) 42%, rgba(232, 236, 233, 0.16));
}

.update-log__heading {
  margin: 0;
}

.update-log__trigger {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 16px;
  gap: clamp(18px, 3vw, 44px);
  align-items: center;
  width: 100%;
  min-height: clamp(68px, 9vh, 84px);
  padding: 0 clamp(18px, 2.2vw, 28px);
  border: 0;
  color: var(--white);
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition:
    color 180ms ease;
}

.update-log__title {
  overflow: hidden;
  font-family: var(--display);
  font-size: clamp(22px, 2.5vw, 31px);
  font-weight: 500;
  line-height: 1.08;
  letter-spacing: 0.035em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.update-log__date {
  color: rgba(232, 236, 233, 0.56);
  font-family: var(--mono);
  font-size: clamp(8px, 0.75vw, 10px);
  letter-spacing: 0.14em;
  transition: color 180ms ease;
}

.update-log__marker {
  position: relative;
  display: block;
  width: 13px;
  height: 13px;
}

.update-log__marker::before,
.update-log__marker::after {
  position: absolute;
  top: 6px;
  left: 1px;
  width: 11px;
  height: 1px;
  background: currentColor;
  content: "";
  transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
}

.update-log__marker::after {
  transform: rotate(90deg);
}

.update-log__trigger[aria-expanded="true"] {
  color: var(--arc);
}

.update-log__trigger[aria-expanded="true"] .update-log__marker::after {
  transform: rotate(0deg);
}

.update-log__trigger:hover,
.update-log__trigger:focus-visible {
  color: var(--arc);
}

.update-log__trigger:hover .update-log__date,
.update-log__trigger:focus-visible .update-log__date,
.update-log__trigger[aria-expanded="true"] .update-log__date {
  color: var(--arc);
}

.update-log__trigger:active {
  transform: scale(0.996);
}

.update-log__trigger:focus-visible {
  outline: none;
}

.update-log__disclosure {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition:
    grid-template-rows 320ms cubic-bezier(0.16, 1, 0.3, 1),
    opacity 180ms ease;
}

.update-log__disclosure--expanded {
  grid-template-rows: 1fr;
  opacity: 1;
}

.update-log__body {
  min-height: 0;
  overflow: hidden;
}

.update-log__body-inner {
  max-width: 68ch;
  margin: 0 clamp(18px, 2.2vw, 28px);
  padding: clamp(18px, 2.5vh, 24px) 0 clamp(24px, 3.5vh, 34px);
  border-top: 1px solid rgba(232, 236, 233, 0.13);
}

.update-log__body-inner p {
  margin: 0 0 10px;
  color: rgba(232, 236, 233, 0.72);
  font-family: system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.82;
  text-shadow: 0 1px 14px rgba(0, 0, 0, 0.78);
}

.update-log__body-inner p:last-child {
  margin-bottom: 0;
}

@media (max-width: 760px) {
  .update-log__trigger {
    grid-template-columns: minmax(0, 1fr) 14px;
    gap: 16px;
    min-height: 72px;
    padding: 14px 16px;
  }

  .update-log__title {
    white-space: normal;
  }

  .update-log__date {
    grid-column: 1;
    grid-row: 2;
  }

  .update-log__marker {
    grid-column: 2;
    grid-row: 1 / span 2;
  }

  .update-log__body-inner {
    margin-inline: 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .update-log__entry,
  .update-log__trigger,
  .update-log__date,
  .update-log__marker::before,
  .update-log__marker::after,
  .update-log__disclosure {
    transition-duration: 0.01ms !important;
  }

  .update-log__entry:hover,
  .update-log__entry:focus-within {
    transform: none;
  }
}
</style>
