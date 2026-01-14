<script setup lang="ts">
import type { AlertDialogTriggerProps } from "reka-ui"
import { AlertDialogTrigger } from "reka-ui"
import { useModalClickPosition } from "@/composables/useModalClickPosition"

const props = defineProps<AlertDialogTriggerProps>()

const { captureClickPosition } = useModalClickPosition()

const handleClick = (event: MouseEvent) => {
  captureClickPosition(event)
}
</script>

<template>
  <AlertDialogTrigger v-bind="props" @click="handleClick">
    <slot />
  </AlertDialogTrigger>
</template>

