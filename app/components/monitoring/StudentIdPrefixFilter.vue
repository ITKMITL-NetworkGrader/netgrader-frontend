<script setup lang="ts">
import { ref, computed } from 'vue'
import { X, Plus } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export interface PrefixOption {
  prefix: string
  count: number
}

const props = defineProps<{
  modelValue: string[]
  availablePrefixes: PrefixOption[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const customInput = ref('')

const selectedSet = computed(() => new Set(props.modelValue))

const togglePrefix = (prefix: string) => {
  const current = new Set(props.modelValue)
  if (current.has(prefix)) {
    current.delete(prefix)
  } else {
    current.add(prefix)
  }
  emit('update:modelValue', Array.from(current))
}

const addCustomPrefix = () => {
  const val = customInput.value.trim()
  if (!val) return
  // Don't add duplicates
  if (!props.modelValue.includes(val)) {
    emit('update:modelValue', [...props.modelValue, val])
  }
  customInput.value = ''
}

const removePrefix = (prefix: string) => {
  emit('update:modelValue', props.modelValue.filter(p => p !== prefix))
}

const selectAll = () => {
  const allPrefixes = props.availablePrefixes.map(p => p.prefix)
  // Merge with any existing custom prefixes
  const merged = new Set([...props.modelValue, ...allPrefixes])
  emit('update:modelValue', Array.from(merged))
}

const clearAll = () => {
  emit('update:modelValue', [])
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    addCustomPrefix()
  }
}
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Student ID Prefixes
      </span>
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-muted"
          @click="selectAll"
        >
          All
        </button>
        <span class="text-muted-foreground/40">|</span>
        <button
          type="button"
          class="text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-muted"
          @click="clearAll"
        >
          None
        </button>
      </div>
    </div>

    <!-- Detected prefixes as togglable chips -->
    <div v-if="availablePrefixes.length > 0" class="flex flex-wrap gap-1.5">
      <button
        v-for="option in availablePrefixes"
        :key="option.prefix"
        type="button"
        class="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-md border transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50"
        :class="selectedSet.has(option.prefix)
          ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
          : 'bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground'"
        @click="togglePrefix(option.prefix)"
      >
        <span class="font-mono font-medium">{{ option.prefix }}</span>
        <span class="opacity-70">({{ option.count }})</span>
      </button>
    </div>

    <!-- Selected custom prefixes (ones not in availablePrefixes) -->
    <div v-if="modelValue.some(p => !availablePrefixes.find(a => a.prefix === p))" class="flex flex-wrap gap-1.5">
      <Badge
        v-for="prefix in modelValue.filter(p => !availablePrefixes.find(a => a.prefix === p))"
        :key="`custom-${prefix}`"
        variant="secondary"
        class="inline-flex items-center gap-1 pl-2 pr-1 font-mono text-xs"
      >
        {{ prefix }}
        <button
          type="button"
          class="ml-0.5 hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
          @click="removePrefix(prefix)"
        >
          <X class="w-2.5 h-2.5" />
        </button>
      </Badge>
    </div>

    <!-- Custom prefix input -->
    <div class="flex items-center gap-1.5">
      <Input
        v-model="customInput"
        placeholder="Add custom prefix…"
        class="h-7 text-xs flex-1 font-mono"
        @keydown="handleKeydown"
      />
      <Button
        variant="outline"
        size="sm"
        class="h-7 px-2 text-xs"
        :disabled="!customInput.trim()"
        @click="addCustomPrefix"
      >
        <Plus class="w-3 h-3" />
      </Button>
    </div>
  </div>
</template>
