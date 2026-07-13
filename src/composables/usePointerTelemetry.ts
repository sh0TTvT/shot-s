import { onBeforeUnmount, onMounted, ref } from "vue";

export function usePointerTelemetry() {
  const x = ref(".---");
  const y = ref(".---");
  const tracking = ref(false);
  let refreshTimer: number | undefined;
  let pendingEvent: PointerEvent | undefined;

  const commitPosition = () => {
    if (!pendingEvent) {
      refreshTimer = undefined;
      return;
    }

    const normalizedX = Math.min(1, Math.max(0, pendingEvent.clientX / window.innerWidth));
    const normalizedY = Math.min(1, Math.max(0, pendingEvent.clientY / window.innerHeight));
    x.value = normalizedX.toFixed(3).slice(1);
    y.value = normalizedY.toFixed(3).slice(1);
    tracking.value = true;
    pendingEvent = undefined;
    refreshTimer = undefined;
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    pendingEvent = event;

    // WHY: 低频读数更接近仪器采样，也避免鼠标移动时高频触发 Vue 更新。
    if (refreshTimer === undefined) refreshTimer = window.setTimeout(commitPosition, 90);
  };

  const stopTracking = () => {
    window.clearTimeout(refreshTimer);
    refreshTimer = undefined;
    pendingEvent = undefined;
    tracking.value = false;
    x.value = ".---";
    y.value = ".---";
  };

  onMounted(() => {
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.documentElement.addEventListener("pointerenter", handlePointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", stopTracking);
    window.addEventListener("blur", stopTracking);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("pointermove", handlePointerMove);
    document.documentElement.removeEventListener("pointerenter", handlePointerMove);
    document.documentElement.removeEventListener("pointerleave", stopTracking);
    window.removeEventListener("blur", stopTracking);
    window.clearTimeout(refreshTimer);
  });

  return { x, y, tracking };
}
