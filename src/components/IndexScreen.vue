<script setup lang="ts">
import IntrusionWordmark from "./IntrusionWordmark.vue";

defineEmits<{
  enter: [];
}>();
</script>

<template>
  <main class="index-screen">
    <IntrusionWordmark @activate="$emit('enter')" />
  </main>
</template>
