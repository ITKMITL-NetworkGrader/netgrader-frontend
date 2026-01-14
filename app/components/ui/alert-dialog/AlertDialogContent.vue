<script setup lang="ts">
import type { AlertDialogContentEmits, AlertDialogContentProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import {
  AlertDialogContent,
  AlertDialogOverlay,
  AlertDialogPortal,
  useForwardPropsEmits,
} from "reka-ui"
import { cn } from "@/lib/utils"
import { useModalClickPosition } from "@/composables/useModalClickPosition"

const props = defineProps<AlertDialogContentProps & { class?: HTMLAttributes["class"] }>()
const emits = defineEmits<AlertDialogContentEmits>()

const delegatedProps = reactiveOmit(props, "class")
const forwarded = useForwardPropsEmits(delegatedProps, emits)

const { clickPosition, hasPosition } = useModalClickPosition()

// Compute offset from click position to viewport center for animation
const modalStyle = computed(() => {
  if (!hasPosition.value) {
    return {
      '--modal-offset-x': '0px',
      '--modal-offset-y': '0px'
    }
  }
  
  // Calculate offset from viewport center to click position
  const viewportCenterX = window.innerWidth / 2
  const viewportCenterY = window.innerHeight / 2
  
  const offsetX = clickPosition.value.x - viewportCenterX
  const offsetY = clickPosition.value.y - viewportCenterY
  
  return {
    '--modal-offset-x': `${offsetX}px`,
    '--modal-offset-y': `${offsetY}px`
  }
})
</script>

<template>
  <AlertDialogPortal>
    <AlertDialogOverlay
      class="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-[overlay-enter_0.3s_ease-out] data-[state=closed]:animate-[overlay-exit_0.2s_ease-in]"
    />
    <AlertDialogContent
      v-bind="forwarded"
      :style="modalStyle"
      :class="
        cn(
          'fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border bg-background p-6 shadow-lg sm:rounded-lg',
          'data-[state=open]:animate-[modal-enter_0.35s_cubic-bezier(0.34,1.56,0.64,1)]',
          'data-[state=closed]:animate-[modal-exit_0.2s_cubic-bezier(0.4,0,0.2,1)]',
          props.class,
        )
      "
    >
      <slot />
    </AlertDialogContent>
  </AlertDialogPortal>
</template>

