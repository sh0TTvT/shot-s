import { readonly, ref } from "vue";

const scrollProgress = ref(0);

const clamp = (value: number) => Math.min(1, Math.max(0, value));

export function useWorkspaceScrollProgress() {
  const setScrollMetrics = (
    scrollTop: number,
    scrollHeight: number,
    clientHeight: number,
  ) => {
    const scrollableDistance = Math.max(0, scrollHeight - clientHeight);
    scrollProgress.value = scrollableDistance > 0 ? clamp(scrollTop / scrollableDistance) : 0;
  };

  const resetScrollProgress = () => {
    scrollProgress.value = 0;
  };

  return {
    scrollProgress: readonly(scrollProgress),
    setScrollMetrics,
    resetScrollProgress,
  };
}
