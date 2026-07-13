<script setup lang="ts">
import ContourMap from "./ContourMap.vue";
import IntrusionWordmark from "./IntrusionWordmark.vue";

defineEmits<{
  enter: [];
}>();
</script>

<template>
  <main class="index-screen">
    <div class="index-contour-camera" aria-hidden="true">
      <ContourMap />
    </div>

    <IntrusionWordmark @activate="$emit('enter')" />
  </main>
</template>
