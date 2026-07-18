<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import profileAvatar from "../assets/profile-avatar.jpg";
import { useInteractionContext } from "../composables/useInteractionContext";

const { setInteraction, clearInteraction } = useInteractionContext();
const pointerOffset = ref({ x: 0, y: 0 });
const pointerTilt = ref({ x: 0, y: 0 });
const profileFrameStyle = computed(() => ({
  "--profile-pointer-x": `${pointerOffset.value.x}px`,
  "--profile-pointer-y": `${pointerOffset.value.y}px`,
  "--profile-tilt-x": `${pointerTilt.value.x}deg`,
  "--profile-tilt-y": `${pointerTilt.value.y}deg`,
}));

const PROFILE_POINTER_OFFSET = 7;
const PROFILE_POINTER_TILT = 3;
const ACTION_SCRAMBLE_INTERVAL = 60;
const ACTION_SCRAMBLE_CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%*+-/<>[]";
const ACTION_LABELS = {
  GITHUB: "OPEN_GITHUB",
  EMAIL: "COPY_EMAIL",
  MONOLOGUE: "READ_MONOLOGUE",
} as const;

type ActionKey = keyof typeof ACTION_LABELS;

const actionLabels = ref<Record<ActionKey, string>>({ ...ACTION_LABELS });
const actionScrambleTimers = new Map<ActionKey, number>();

const showProfileContext = (input: "POINTER" | "KEYBOARD") =>
  setInteraction("PROFILE", "INSPECT", input);

const showActionContext = (target: string, input: "POINTER" | "KEYBOARD") =>
  setInteraction(target, "EXECUTE", input);

const clearProfileContext = () => clearInteraction();
const copyEmail = () => navigator.clipboard.writeText("shothollis@gmail.com");

const createScrambledLabel = (label: string) =>
  Array.from(label, (character) => {
    if (character === " " || character === "_") return character;
    if (Math.random() < 0.12) return character;

    const randomIndex = Math.floor(Math.random() * ACTION_SCRAMBLE_CHARACTERS.length);
    return ACTION_SCRAMBLE_CHARACTERS[randomIndex];
  }).join("");

const clearActionScramble = (action: ActionKey) => {
  const timer = actionScrambleTimers.get(action);
  if (timer !== undefined) window.clearInterval(timer);

  actionScrambleTimers.delete(action);
  actionLabels.value[action] = ACTION_LABELS[action];
};

const isCoreActionAnimation = (event: AnimationEvent) =>
  !event.pseudoElement && event.animationName.startsWith("profile-action-intrusion-core");

const startActionScramble = (action: ActionKey, event: AnimationEvent) => {
  if (
    !isCoreActionAnimation(event) ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  clearActionScramble(action);
  const originalLabel = ACTION_LABELS[action];

  // WHY: 随机串只写入装饰层，避免按钮真实文案和读屏名称跟着抖动。
  const scramble = () => {
    actionLabels.value[action] = createScrambledLabel(originalLabel);
  };

  scramble();
  actionScrambleTimers.set(action, window.setInterval(scramble, ACTION_SCRAMBLE_INTERVAL));
};

const stopActionScramble = (action: ActionKey, event: AnimationEvent) => {
  if (!isCoreActionAnimation(event)) return;
  clearActionScramble(action);
};

const updateProfileOffset = (event: PointerEvent) => {
  if (event.pointerType !== "mouse") return;

  const card = event.currentTarget as HTMLElement;
  const bounds = card.getBoundingClientRect();
  const normalizedX = Math.max(
    -1,
    Math.min(1, ((event.clientX - bounds.left) / bounds.width) * 2 - 1),
  );
  const normalizedY = Math.max(
    -1,
    Math.min(1, ((event.clientY - bounds.top) / bounds.height) * 2 - 1),
  );

  // WHY: 平移维持原有跟随感，反向映射的微倾斜让卡片朝指针抬起且不过度抢眼。
  pointerOffset.value = {
    x: normalizedX * PROFILE_POINTER_OFFSET,
    y: normalizedY * PROFILE_POINTER_OFFSET,
  };
  pointerTilt.value = {
    x: normalizedY * -PROFILE_POINTER_TILT,
    y: normalizedX * PROFILE_POINTER_TILT,
  };
};

const leaveProfile = () => {
  pointerOffset.value = { x: 0, y: 0 };
  pointerTilt.value = { x: 0, y: 0 };
  clearProfileContext();
};

onBeforeUnmount(() => {
  actionScrambleTimers.forEach((timer) => window.clearInterval(timer));
  actionScrambleTimers.clear();
});
</script>

<template>
  <div
    class="profile-frame"
    :style="profileFrameStyle"
  >
    <aside
      class="operator-profile-card"
      aria-labelledby="operator-name"
      @pointerenter="showProfileContext('POINTER')"
      @pointermove="updateProfileOffset"
      @pointerleave="leaveProfile"
      @focusin="showProfileContext('KEYBOARD')"
      @focusout="clearProfileContext"
    >
      <header class="profile-status-line">
        <span>STATUS: Admin</span>
        <strong><i aria-hidden="true"></i> ACTIVE</strong>
      </header>

      <div class="profile-body">
        <section class="profile-identity">
          <span class="profile-avatar">
            <img :src="profileAvatar" alt="sh0TT 头像" />
          </span>
          <span class="profile-title">
            <strong id="operator-name">sh0TT</strong>
            <small>Lv.22 Developer</small>
          </span>
        </section>

        <dl class="profile-specs">
          <div>
            <dt>OPERATOR_CLASS</dt>
            <dd>CREATOR</dd>
          </div>
          <div>
            <dt>LOGIC_STACK</dt>
            <dd>JAVA / PYTHON</dd>
          </div>
          <div>
            <dt>INTERFACE_STACK</dt>
            <dd>VUE</dd>
          </div>
          <div>
            <dt>MIND_PROFILE</dt>
            <dd>INFP</dd>
          </div>
          <div class="profile-specs__network">
            <dt>SOURCE_LINK</dt>
            <dd>shothollis@gmail.com</dd>
          </div>
        </dl>
      </div>

      <nav class="profile-actions" aria-label="个人快捷通道">
        <a
          aria-label="OPEN_GITHUB"
          :data-intrusion-label="actionLabels.GITHUB"
          href="https://github.com/sh0TTvT"
          target="_blank"
          rel="noreferrer"
          @pointerenter="showActionContext('GITHUB', 'POINTER')"
          @focus="showActionContext('GITHUB', 'KEYBOARD')"
          @animationstart="startActionScramble('GITHUB', $event)"
          @animationcancel="stopActionScramble('GITHUB', $event)"
        >
          <span class="profile-action-label" aria-hidden="true">{{ actionLabels.GITHUB }}</span>
        </a>
        <a
          aria-label="COPY_EMAIL"
          :data-intrusion-label="actionLabels.EMAIL"
          href="#"
          @click.prevent="copyEmail"
          @pointerenter="showActionContext('EMAIL', 'POINTER')"
          @focus="showActionContext('EMAIL', 'KEYBOARD')"
          @animationstart="startActionScramble('EMAIL', $event)"
          @animationcancel="stopActionScramble('EMAIL', $event)"
        >
          <span class="profile-action-label" aria-hidden="true">{{ actionLabels.EMAIL }}</span>
        </a>
        <a
          aria-label="READ_MONOLOGUE"
          :data-intrusion-label="actionLabels.MONOLOGUE"
          href="#/workspace/monologue"
          @pointerenter="showActionContext('MONOLOGUE', 'POINTER')"
          @focus="showActionContext('MONOLOGUE', 'KEYBOARD')"
          @animationstart="startActionScramble('MONOLOGUE', $event)"
          @animationcancel="stopActionScramble('MONOLOGUE', $event)"
        >
          <span class="profile-action-label" aria-hidden="true">{{ actionLabels.MONOLOGUE }}</span>
        </a>
      </nav>
    </aside>
  </div>
</template>

<style scoped>
.profile-frame {
  width: 100%;
  padding: 3px;
  transform-origin: center;
  transform: translate3d(var(--profile-offset-x, 0px), 0, 0);
  transition: transform 500ms cubic-bezier(0.16, 1, 0.3, 1);
}

@media (hover: hover) and (pointer: fine) {
  .profile-frame:hover {
    transform:
      perspective(900px)
      translate3d(
        calc(var(--profile-offset-x, 0px) + var(--profile-pointer-x, 0px)),
        var(--profile-pointer-y, 0px),
        0
      )
      rotateX(var(--profile-tilt-x, 0deg))
      rotateY(var(--profile-tilt-y, 0deg));
    transition-duration: 160ms;
    will-change: transform;
  }
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
  display: grid;
  width: 58px;
  height: 58px;
  overflow: hidden;
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
  background-color: transparent;
  background-image: linear-gradient(90deg, transparent, rgba(85, 230, 220, 0.62), transparent);
  background-position: 50% -1px;
  background-repeat: no-repeat;
  background-size: 0 1px;
  font-size: 9px;
  letter-spacing: 0.1em;
  text-decoration: none;
  text-shadow: none;
  isolation: isolate;
  transition: border-color 160ms ease;
}

.profile-actions a::before,
.profile-actions a::after {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: grid;
  color: rgba(232, 236, 233, 0.92);
  content: attr(data-intrusion-label);
  font: inherit;
  letter-spacing: inherit;
  opacity: 0;
  place-items: center;
  pointer-events: none;
  will-change: opacity, transform, filter;
}

.profile-action-label {
  position: relative;
  z-index: 0;
}

.profile-actions a::before {
  clip-path: polygon(0 14%, 100% 7%, 100% 45%, 0 53%);
  text-shadow: -3px 0 6px rgba(85, 230, 220, 0.58);
}

.profile-actions a::after {
  clip-path: polygon(0 52%, 100% 44%, 100% 88%, 0 95%);
  text-shadow: 3px 0 6px rgba(240, 68, 56, 0.5);
}

.profile-actions a:hover,
.profile-actions a:focus-visible {
  color: var(--white);
  animation: profile-action-intrusion-core 2400ms steps(1, end) infinite;
}

.profile-actions a:hover::before,
.profile-actions a:focus-visible::before {
  animation: profile-action-intrusion-upper 2400ms steps(1, end) infinite;
}

.profile-actions a:hover::after,
.profile-actions a:focus-visible::after {
  animation: profile-action-intrusion-lower 2400ms steps(1, end) infinite;
}

@keyframes profile-status-pulse {
  50% {
    opacity: 0.48;
  }
}

@keyframes profile-action-intrusion-core {
  0% {
    background-position: 50% 34%;
    background-size: 72% 1px;
    border-color: var(--arc);
    color: rgba(232, 236, 233, 0.16);
    filter: brightness(1.7);
    text-shadow: -2px 0 rgba(85, 230, 220, 0.74), 2px 0 rgba(240, 68, 56, 0.68);
  }
  3% {
    background-position: 50% 68%;
    background-size: 36% 1px;
    border-color: rgba(240, 68, 56, 0.7);
    color: var(--white);
    filter: none;
    text-shadow: 2px 0 rgba(240, 68, 56, 0.5);
  }
  6%,
  52%,
  64%,
  100% {
    background-position: 50% -1px;
    background-size: 0 1px;
    border-color: var(--line);
    color: var(--white);
    filter: none;
    text-shadow: none;
  }
  55% {
    background-position: 50% 48%;
    background-size: 64% 1px;
    border-color: var(--arc);
    color: rgba(232, 236, 233, 0.2);
    filter: brightness(1.55);
    text-shadow: -2px 0 rgba(85, 230, 220, 0.7), 2px 0 rgba(240, 68, 56, 0.56);
  }
  59% {
    background-position: 50% 72%;
    background-size: 28% 1px;
    border-color: rgba(85, 230, 220, 0.58);
    color: var(--white);
    filter: none;
    text-shadow: 2px 0 rgba(240, 68, 56, 0.38);
  }
}

@keyframes profile-action-intrusion-upper {
  0% {
    opacity: 0.92;
    transform: translateX(-4px) scaleX(1.025) skewX(-2deg);
  }
  3% {
    opacity: 0.26;
    transform: translateX(2px) scaleX(0.99);
  }
  6%,
  52%,
  64%,
  100% {
    opacity: 0;
    transform: translateX(0) scaleX(1);
  }
  55% {
    opacity: 0.72;
    transform: translateX(-3px) scaleX(1.025);
  }
  59% {
    opacity: 0.18;
    transform: translateX(2px) scaleX(0.99);
  }
}

@keyframes profile-action-intrusion-lower {
  0% {
    opacity: 0.72;
    transform: translateX(4px) scaleX(1.025) skewX(2deg);
  }
  3% {
    opacity: 0.2;
    transform: translateX(-2px) scaleX(0.99);
  }
  6%,
  52%,
  64%,
  100% {
    opacity: 0;
    transform: translateX(0) scaleX(1);
  }
  55% {
    opacity: 0.64;
    transform: translateX(3px) scaleX(1.025);
  }
  59% {
    opacity: 0.16;
    transform: translateX(-2px) scaleX(0.99);
  }
}

@media (max-width: 760px) {
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
  .profile-frame:hover {
    transform: translate3d(var(--profile-offset-x, 0px), 0, 0);
  }

  .profile-frame,
  .profile-avatar img,
  .operator-profile-card::after,
  .profile-actions a,
  .profile-actions a::before,
  .profile-actions a::after {
    transition-duration: 0.01ms !important;
  }

  .profile-actions a:hover,
  .profile-actions a:focus-visible {
    border-color: var(--arc);
    animation: none;
  }

  .profile-actions a::before,
  .profile-actions a::after {
    animation: none !important;
    opacity: 0;
  }

  .profile-status-line strong {
    animation: none;
  }
}
</style>
