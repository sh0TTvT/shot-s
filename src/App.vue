<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import ConstellationAtlasBackground from "./components/ConstellationAtlasBackground.vue";
import HomeScreen from "./components/HomeScreen.vue";
import IndexScreen from "./components/IndexScreen.vue";
import PointerTargetFrame from "./components/PointerTargetFrame.vue";
import SystemOverlay from "./components/SystemOverlay.vue";

const route = useRoute();
const router = useRouter();
const showIndex = computed(
  () =>
    route.name === "index" ||
    (route.name === undefined && ["", "#/"].includes(window.location.hash)),
);
const enterHome = () => router.push({ name: "home" });
</script>

<template>
  <ConstellationAtlasBackground />
  <SystemOverlay />
  <PointerTargetFrame />
  <Transition name="index-reveal">
    <IndexScreen v-if="showIndex" key="index" @enter="enterHome" />
    <HomeScreen v-else key="home" />
  </Transition>
</template>
