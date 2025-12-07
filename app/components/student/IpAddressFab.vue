<template>
  <!-- Floating Action Button (appears only after IP questionnaire completion) -->
  <Transition name="fab">
    <Button
      v-if="visible"
      @click="$emit('open-modal')"
      class="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg transition-all hover:scale-110 z-50"
      size="icon"
    >
      <Network class="w-6 h-6" />
      <span class="sr-only">View IP Addresses</span>
    </Button>
  </Transition>
</template>

<script setup lang="ts">
import { Network } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

interface Props {
  visible: boolean
}

defineProps<Props>()

defineEmits<{
  'open-modal': []
}>()
</script>

<style scoped>
/* FAB Animation */
.fab-enter-active,
.fab-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fab-enter-from {
  transform: scale(0) rotate(-180deg);
  opacity: 0;
}

.fab-leave-to {
  transform: scale(0) rotate(180deg);
  opacity: 0;
}

.fab-enter-to,
.fab-leave-from {
  transform: scale(1) rotate(0deg);
  opacity: 1;
}
</style>
