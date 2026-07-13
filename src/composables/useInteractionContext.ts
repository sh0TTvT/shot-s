import { readonly, ref } from "vue";

export type InteractionInput = "POINTER" | "KEYBOARD";

const target = ref("HOME");
const action = ref("READY");
const input = ref<InteractionInput>("POINTER");

export function useInteractionContext() {
  const setInteraction = (
    nextTarget: string,
    nextAction: string,
    nextInput: InteractionInput = "POINTER",
  ) => {
    target.value = nextTarget;
    action.value = nextAction;
    input.value = nextInput;
  };

  const clearInteraction = (currentTarget?: string) => {
    // WHY: 多个区域快速切换时，只允许当前目标清空状态，避免 HUD 短暂闪回 HOME。
    if (currentTarget && target.value !== currentTarget) return;
    target.value = "HOME";
    action.value = "READY";
    input.value = "POINTER";
  };

  return {
    target: readonly(target),
    action: readonly(action),
    input: readonly(input),
    setInteraction,
    clearInteraction,
  };
}
