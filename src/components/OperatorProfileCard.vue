<script setup lang="ts">
import avatarPlaceholder from "../assets/avatar-placeholder.svg";
import { useInteractionContext } from "../composables/useInteractionContext";

const { setInteraction, clearInteraction } = useInteractionContext();

const showProfileContext = (input: "POINTER" | "KEYBOARD") =>
  setInteraction("PROFILE", "INSPECT", input);

const showActionContext = (target: string, input: "POINTER" | "KEYBOARD") =>
  setInteraction(target, "EXECUTE", input);

const clearProfileContext = () => clearInteraction();
</script>

<template>
  <div class="profile-frame">
    <aside
      class="operator-profile-card"
      aria-labelledby="operator-name"
      @pointerenter="showProfileContext('POINTER')"
      @pointerleave="clearProfileContext"
      @focusin="showProfileContext('KEYBOARD')"
      @focusout="clearProfileContext"
    >
      <header class="profile-status-line">
        <span>STATUS: SH0TT.OS</span>
        <strong><i aria-hidden="true"></i> ACTIVE</strong>
      </header>

      <div class="profile-body">
        <section class="profile-identity">
          <span class="profile-avatar">
            <img :src="avatarPlaceholder" alt="sh0TT 临时头像" />
            <i aria-hidden="true"></i>
          </span>
          <span class="profile-title">
            <strong id="operator-name">sh0TT</strong>
            <small>INDEPENDENT / PRODUCT DEVELOPER</small>
          </span>
        </section>

        <dl class="profile-specs">
          <div>
            <dt>DESIGNATION</dt>
            <dd>CREATOR</dd>
          </div>
          <div>
            <dt>PRODUCT_PWR</dt>
            <dd>DESIGN / DELIVERY</dd>
          </div>
          <div>
            <dt>ENGINE_PWR</dt>
            <dd>VUE / TYPESCRIPT</dd>
          </div>
          <div>
            <dt>LOCATION</dt>
            <dd>REMOTE / UTC+08</dd>
          </div>
          <div class="profile-specs__network">
            <dt>GITHUB_NET</dt>
            <dd>ONLINE</dd>
          </div>
        </dl>
      </div>

      <nav class="profile-actions" aria-label="个人快捷通道">
        <a
          href="https://github.com/sh0TTvT"
          target="_blank"
          rel="noreferrer"
          @pointerenter="showActionContext('GITHUB', 'POINTER')"
          @focus="showActionContext('GITHUB', 'KEYBOARD')"
        >
          EXEC_GITHUB
        </a>
        <a
          href="#/workspace/projects"
          @pointerenter="showActionContext('PROJECTS', 'POINTER')"
          @focus="showActionContext('PROJECTS', 'KEYBOARD')"
        >
          EXEC_PROJECTS
        </a>
        <a
          href="#/workspace/contact"
          @pointerenter="showActionContext('CONTACT', 'POINTER')"
          @focus="showActionContext('CONTACT', 'KEYBOARD')"
        >
          INIT_CONTACT
        </a>
      </nav>
    </aside>
  </div>
</template>

<style scoped>
.profile-frame {
  width: 100%;
  padding: 3px;
  transform: translateX(var(--profile-offset-x, 0px)) rotate(-1deg);
  transition: transform 500ms cubic-bezier(0.16, 1, 0.3, 1);
}

.profile-frame:hover,
.profile-frame:focus-within {
  transform: translateX(var(--profile-offset-x, 0px)) rotate(0);
}

.operator-profile-card {
  position: relative;
  display: flex;
  min-height: 520px;
  padding: clamp(24px, 2vw, 30px);
  color: var(--white);
  background: transparent;
  flex-direction: column;
  font-family: var(--mono);
  text-transform: uppercase;
  transition:
    text-shadow 600ms cubic-bezier(0.19, 1, 0.22, 1),
    box-shadow 600ms cubic-bezier(0.19, 1, 0.22, 1);
}

.operator-profile-card::after {
  position: absolute;
  top: 0;
  left: -7px;
  width: 2px;
  height: 0;
  background: var(--arc);
  box-shadow: 0 0 10px var(--arc);
  content: "";
  opacity: 0;
  transition: height 400ms ease, opacity 400ms ease;
}

.operator-profile-card:hover,
.operator-profile-card:focus-within {
  text-shadow: 2px 0 rgba(255, 0, 0, 0.34), -2px 0 rgba(0, 255, 255, 0.34);
}

.operator-profile-card:hover::after,
.operator-profile-card:focus-within::after {
  height: 100%;
  opacity: 0.8;
}

.profile-status-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 26px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--line-soft);
  font-size: 9px;
  letter-spacing: 0.14em;
}

.profile-status-line > span {
  opacity: 0.6;
}

.profile-status-line strong {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--arc);
  font-size: inherit;
  animation: profile-status-pulse 1.8s ease-in-out infinite;
}

.profile-status-line i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--arc);
  box-shadow: 0 0 8px var(--arc);
}

.profile-body {
  display: flex;
  gap: 29px;
  flex-direction: column;
}

.profile-identity {
  display: flex;
  align-items: center;
  gap: 16px;
}

.profile-avatar {
  position: relative;
  display: grid;
  width: 58px;
  height: 58px;
  overflow: hidden;
  border: 1px solid var(--arc);
  place-items: center;
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: grayscale(1);
  mix-blend-mode: luminosity;
  opacity: 0.82;
  transition: filter 500ms ease, opacity 500ms ease, transform 500ms ease;
}

.profile-avatar i {
  position: absolute;
  inset: 2px;
  border: 1px solid color-mix(in srgb, var(--arc) 46%, transparent);
  pointer-events: none;
}

.operator-profile-card:hover .profile-avatar img,
.operator-profile-card:focus-within .profile-avatar img {
  filter: grayscale(0);
  opacity: 1;
  transform: scale(1.04);
}

.profile-title {
  display: flex;
  min-width: 0;
  gap: 5px;
  flex-direction: column;
  letter-spacing: 0.1em;
}

.profile-title strong {
  font-family: Georgia, "Times New Roman", serif;
  font-size: 23px;
  font-weight: 600;
  line-height: 0.9;
  text-transform: none;
}

.profile-title small {
  color: var(--muted);
  font-size: 8px;
  letter-spacing: 0.12em;
  white-space: nowrap;
}

.profile-specs {
  display: flex;
  margin: 0;
  padding: 23px 0 0;
  border-top: 1px solid var(--line-soft);
  gap: 10px;
  flex-direction: column;
  font-size: 9px;
  letter-spacing: 0.11em;
  line-height: 1.65;
}

.profile-specs > div {
  display: flex;
  justify-content: space-between;
  gap: 18px;
}

.profile-specs dt {
  color: var(--muted);
  opacity: 0.58;
}

.profile-specs dd {
  margin: 0;
  color: var(--white);
  font-weight: 600;
  text-align: right;
}

.profile-specs__network {
  margin-top: 6px;
  padding-top: 8px;
  border-top: 1px dashed var(--line-soft);
}

.profile-specs__network dd {
  color: var(--arc);
}

.profile-actions {
  display: flex;
  margin-top: auto;
  padding-top: 24px;
  border-top: 1px solid var(--line-soft);
  gap: 9px;
  flex-direction: column;
}

.profile-actions a {
  position: relative;
  z-index: 0;
  display: inline-flex;
  min-height: 38px;
  overflow: hidden;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--line);
  color: var(--white);
  background: transparent;
  font-size: 9px;
  letter-spacing: 0.1em;
  text-decoration: none;
  isolation: isolate;
  transition: border-color 400ms cubic-bezier(0.16, 1, 0.3, 1), color 400ms cubic-bezier(0.16, 1, 0.3, 1);
}

.profile-actions a::before {
  position: absolute;
  inset: 0;
  z-index: -1;
  background: var(--arc);
  content: "";
  transform: translateY(100%);
  transition: transform 400ms cubic-bezier(0.16, 1, 0.3, 1);
}

.profile-actions a:hover,
.profile-actions a:focus-visible {
  border-color: var(--arc);
  color: var(--obsidian);
  text-shadow: none;
}

.profile-actions a:hover::before,
.profile-actions a:focus-visible::before {
  transform: translateY(0);
}

@keyframes profile-status-pulse {
  50% {
    opacity: 0.48;
  }
}

@media (max-width: 760px) {
  .profile-frame {
    transform: translateX(var(--profile-offset-x, 0px));
  }

  .operator-profile-card {
    min-height: 500px;
    padding: 24px;
  }
}

@media (max-width: 420px) {
  .profile-title small {
    max-width: 25ch;
    white-space: normal;
  }

  .profile-specs > div {
    gap: 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .profile-frame,
  .profile-avatar img,
  .operator-profile-card::after,
  .profile-actions a,
  .profile-actions a::before {
    transition-duration: 0.01ms !important;
  }

  .profile-status-line strong {
    animation: none;
  }
}
</style>
