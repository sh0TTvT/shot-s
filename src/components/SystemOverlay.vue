<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { useClock } from "../composables/useClock";
import { useInteractionContext } from "../composables/useInteractionContext";
import { usePointerTelemetry } from "../composables/usePointerTelemetry";
import { workspaceLabels } from "../types/workspace";

const route = useRoute();
const { time, date, weekday, timezone } = useClock();
const { x, y, tracking } = usePointerTelemetry();
const { target, action, input } = useInteractionContext();
const online = ref(navigator.onLine);
const linkStatus = computed(() => (online.value ? "STABLE" : "OFFLINE"));
const isWorkspace = computed(() => route.name === "home" || route.name === "workspace");
const viewLabel = computed(() => {
  if (route.name === "index") return "SYS.INDEX";
  if (route.name === "home") return "SYS.HOME";
  return workspaceLabels[String(route.params.windowId) as keyof typeof workspaceLabels] ?? "SYS.HOME";
});
const interactionHint = computed(() => (route.name === "index" ? "CLICK TO ENTER" : "SYSTEM READY"));

const setOnline = () => { online.value = true; };
const setOffline = () => { online.value = false; };

onMounted(() => {
  window.addEventListener("online", setOnline);
  window.addEventListener("offline", setOffline);
});

onBeforeUnmount(() => {
  window.removeEventListener("online", setOnline);
  window.removeEventListener("offline", setOffline);
});
</script>

<template>
  <aside
    class="system-overlay"
    :class="{ 'system-overlay--home': isWorkspace }"
    aria-label="终端状态与导航遥测"
  >
    <span class="viewport-corner viewport-corner-top-left" aria-hidden="true"></span>
    <span class="viewport-corner viewport-corner-top-right" aria-hidden="true"></span>
    <span class="viewport-corner viewport-corner-bottom-left" aria-hidden="true"></span>
    <span class="viewport-corner viewport-corner-bottom-right" aria-hidden="true"></span>

    <span class="frame-tick frame-tick-top-25" aria-hidden="true"></span>
    <span class="frame-tick frame-tick-top-50" aria-hidden="true"></span>
    <span class="frame-tick frame-tick-top-75" aria-hidden="true"></span>
    <span class="frame-tick frame-tick-bottom-25" aria-hidden="true"></span>
    <span class="frame-tick frame-tick-bottom-50" aria-hidden="true"></span>
    <span class="frame-tick frame-tick-bottom-75" aria-hidden="true"></span>
    <span class="frame-tick frame-tick-left-25" aria-hidden="true"></span>
    <span class="frame-tick frame-tick-left-50" aria-hidden="true"></span>
    <span class="frame-tick frame-tick-left-75" aria-hidden="true"></span>
    <span class="frame-tick frame-tick-right-25" aria-hidden="true"></span>
    <!-- <span class="frame-tick frame-tick-right-50" aria-hidden="true"></span> -->
    <span class="frame-tick frame-tick-right-75" aria-hidden="true"></span>
    <span class="frame-version" aria-hidden="true">TERMINAL / R01</span>

    <dl class="overlay-panel overlay-panel-top-left">
      <div class="overlay-status"><dt>SYS.ON<i class="overlay-status-dot"></i></dt></div>
      <div><dt>MODE</dt><dd>STATIC</dd></div>
      <div><dt>LINK</dt><dd :class="online ? 'cyan' : 'overlay-alert'">{{ linkStatus }}</dd></div>
    </dl>

    <div class="overlay-panel overlay-panel-top-right" aria-label="当前日期与时间">
      <time class="overlay-clock">{{ time }}</time>
      <span>{{ date }} / {{ weekday }}</span>
      <span class="overlay-timezone">{{ timezone }}</span>
    </div>

    <dl v-if="isWorkspace" class="overlay-panel overlay-panel-bottom-left">
      <div><dt>TARGET</dt><dd>{{ target }}</dd></div>
      <div><dt>ACTION</dt><dd>{{ action }}</dd></div>
      <div><dt>INPUT</dt><dd class="cyan">{{ input }}</dd></div>
    </dl>

    <dl v-else class="overlay-panel overlay-panel-bottom-left">
      <div><dt>PTR</dt><dd>X{{ x }} / Y{{ y }}</dd></div>
      <div><dt>FIELD</dt><dd>CONTOUR-01</dd></div>
      <div><dt>INPUT</dt><dd :class="{ cyan: tracking }">{{ tracking ? "TRACKING" : "IDLE" }}</dd></div>
    </dl>

    <dl class="overlay-panel overlay-panel-bottom-right">
      <div><dt>VIEW</dt><dd>{{ viewLabel }}</dd></div>
      <div><dt>SESSION</dt><dd>ACTIVE</dd></div>
      <div class="overlay-hint"><dt>{{ interactionHint }}</dt></div>
    </dl>
  </aside>
</template>
