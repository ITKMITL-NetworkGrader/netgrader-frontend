<template>
  <canvas
    ref="canvasRef"
    :class="$props.class"
    :style="{ width: '100%', height: '100%' }"
  ></canvas>
</template>

<script setup lang="ts">
import {
  create,
  type GlobalOptions as ConfettiGlobalOptions,
  type Options as ConfettiOptions,
  type CreateTypes as ConfettiInstance,
} from "canvas-confetti";
import { ref, onMounted, onUnmounted, provide } from "vue";

type Api = {
  fire: (options?: ConfettiOptions) => void;
};

type ConfettiProps = {
  options?: ConfettiOptions;
  globalOptions?: ConfettiGlobalOptions;
  manualstart?: boolean;
  class?: string;
};

const props = defineProps<ConfettiProps>();

const instanceRef = ref<ConfettiInstance | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);

// Confetti API
function fire(opts: ConfettiOptions = {}) {
  instanceRef.value?.({ ...props.options, ...opts });
}

const api: Api = { fire };

provide("ConfettiContext", api);

// Initialize confetti when mounted
onMounted(() => {
  if (canvasRef.value) {
    // Set canvas dimensions to match window
    const canvas = canvasRef.value;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    instanceRef.value = create(canvas, {
      ...props.globalOptions,
      resize: true,
      useWorker: true,
    });

    if (!props.manualstart) {
      fire();
    }

    // Handle window resize
    const handleResize = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup resize listener
    onUnmounted(() => {
      window.removeEventListener('resize', handleResize);
    });
  }
});

// Cleanup when unmounted
onUnmounted(() => {
  if (instanceRef.value) {
    instanceRef.value.reset();
    instanceRef.value = null;
  }
});

defineExpose({
  fire,
});
</script>
