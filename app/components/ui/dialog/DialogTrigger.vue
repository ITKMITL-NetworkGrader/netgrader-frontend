<script setup lang="ts">
import type { DialogTriggerProps } from "reka-ui"
import { DialogTrigger } from "reka-ui"
import { useModalClickPosition } from "@/composables/useModalClickPosition"

const props = defineProps<DialogTriggerProps>()

const { captureClickPosition } = useModalClickPosition()

const handleClick = (event: MouseEvent) => {
  captureClickPosition(event)
}
</script>

<template>
  <DialogTrigger v-bind="props" @click="handleClick">
    <slot />
  </DialogTrigger>
</template>

