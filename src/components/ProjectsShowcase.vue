<script setup lang="ts">
import type { ProjectItem } from "../data/projects";

defineProps<{
  items: readonly ProjectItem[];
  headingId: string;
}>();
</script>

<template>
  <div class="projects-showcase">
    <h1 :id="headingId" class="projects-showcase__title">PROJECTS</h1>

    <ul class="projects-showcase__grid" aria-label="GitHub 项目列表">
      <li v-for="(project, index) in items" :key="project.id" class="projects-showcase__item">
        <a
          class="project-card"
          :href="project.githubUrl"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="`在新标签页打开 ${project.title} GitHub 仓库`"
        >
          <span class="project-card__media">
            <img
              :src="project.image"
              :alt="project.imageAlt"
              width="1265"
              height="712"
              :loading="index === 0 ? 'eager' : 'lazy'"
              :fetchpriority="index === 0 ? 'high' : 'auto'"
              decoding="async"
            />
          </span>

          <span class="project-card__body">
            <span class="project-card__title" role="heading" aria-level="2">
              {{ project.title }}
            </span>
            <span class="project-card__description">{{ project.description }}</span>

            <span class="project-card__tags" aria-label="技术标签">
              <span v-for="tag in project.tags" :key="tag">{{ tag }}</span>
            </span>
          </span>
        </a>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.projects-showcase {
  grid-column: 1 / -1;
  min-width: 0;
}

.projects-showcase__title {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.projects-showcase__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(30px, 3.3vw, 48px) clamp(24px, 2.8vw, 40px);
  margin: 0;
  padding: 0;
  list-style: none;
}

.projects-showcase__item {
  min-width: 0;
}

.project-card {
  position: relative;
  isolation: isolate;
  display: flex;
  height: 100%;
  min-width: 0;
  border: 1px solid rgba(232, 236, 233, 0.16);
  color: inherit;
  background: transparent;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
  text-decoration: none;
  transform: translateY(0);
  transition:
    box-shadow 280ms ease,
    transform 320ms cubic-bezier(0.16, 1, 0.3, 1);
  flex-direction: column;
}

.project-card__media {
  position: relative;
  display: block;
  aspect-ratio: 2 / 1;
  overflow: hidden;
  border-bottom: 1px solid rgba(232, 236, 233, 0.13);
  background: transparent;
}

.project-card__media img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  filter: grayscale(1) saturate(0) contrast(1.12) brightness(0.62);
  transform: scale(1);
  transition:
    filter 360ms ease,
    transform 520ms cubic-bezier(0.16, 1, 0.3, 1);
}

.project-card__body {
  display: flex;
  flex: 1;
  gap: 10px;
  padding: clamp(16px, 1.55vw, 20px);
  flex-direction: column;
}

.project-card__title {
  display: block;
  color: var(--white);
  font-family: var(--display);
  font-size: clamp(28px, 3vw, 38px);
  font-weight: 520;
  line-height: 0.98;
  letter-spacing: 0.035em;
  text-transform: uppercase;
}

.project-card__title::before {
  margin-right: 0.24em;
  color: var(--white);
  content: ">";
}

.project-card__description {
  display: block;
  max-width: 52em;
  color: rgba(232, 236, 233, 0.72);
  font-family: system-ui, sans-serif;
  font-size: clamp(12px, 1vw, 13.5px);
  line-height: 1.56;
}

.project-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: auto;
  padding-top: 4px;
}

.project-card__tags > span {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 4px 7px;
  border: 1px solid rgba(232, 236, 233, 0.2);
  color: rgba(232, 236, 233, 0.78);
  background: transparent;
  font-size: 8px;
  line-height: 1;
  letter-spacing: 0.12em;
}

.project-card__tags > span::before {
  margin-right: 3px;
  color: var(--white);
  content: "#";
}

.project-card:hover,
.project-card:focus-visible {
  box-shadow:
    0 0 18px rgba(232, 236, 233, 0.2),
    0 0 42px rgba(232, 236, 233, 0.08),
    0 24px 58px rgba(0, 0, 0, 0.42);
  transform: translateY(-6px);
}

.project-card:hover .project-card__media img,
.project-card:focus-visible .project-card__media img {
  filter: grayscale(0) saturate(0.9) contrast(1.04) brightness(0.84);
  transform: scale(1.025);
}

.project-card:focus-visible {
  outline: 1px solid var(--arc);
  outline-offset: 5px;
}

.project-card:active {
  transform: translateY(-3px) scale(0.992);
}

@media (max-width: 960px) {
  .projects-showcase__grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 420px) {
  .projects-showcase__grid {
    gap: 28px;
  }

  .project-card__body {
    padding: 16px;
  }

}

@media (prefers-reduced-motion: reduce) {
  .project-card,
  .project-card__media img {
    transition-duration: 0.01ms !important;
  }

  .project-card:hover,
  .project-card:focus-visible,
  .project-card:active,
  .project-card:hover .project-card__media img,
  .project-card:focus-visible .project-card__media img {
    transform: none;
  }
}
</style>
