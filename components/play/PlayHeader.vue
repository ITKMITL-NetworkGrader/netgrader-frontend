<template>
  <div class="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-4">
    <div class="flex items-center space-x-3 mb-3">
      <Icon name="lucide:layers" class="w-5 h-5 text-primary" />
      <h4 class="font-semibold text-primary">Context</h4>
    </div>
    
    <div class="space-y-2 text-sm">
      <!-- Breadcrumb-style context -->
      <div class="flex items-center space-x-2 text-muted-foreground">
        <Icon name="lucide:graduation-cap" class="w-4 h-4" />
        <span class="font-medium">{{ contextInfo.course }}</span>
        <Icon name="lucide:chevron-right" class="w-3 h-3" />
        <Icon :name="labExamIcon" class="w-4 h-4" />
        <span class="font-medium">{{ contextInfo.labOrExam }}</span>
        <Icon name="lucide:chevron-right" class="w-3 h-3" />
        <Icon name="lucide:file-text" class="w-4 h-4" />
        <span class="font-medium">{{ contextInfo.part }}</span>
      </div>
      
      <!-- Additional context info -->
      <div class="mt-3 pt-3 border-t border-primary/20">
        <p class="text-xs text-muted-foreground">
          Creating a play for <strong>{{ contextInfo.part }}</strong> in <strong>{{ contextInfo.labOrExam }}</strong>
        </p>
        <p class="text-xs text-muted-foreground mt-1">
          This play will define automated tasks that students' work will be graded against.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Props
interface Props {
  contextInfo: {
    course: string
    labOrExam: string
    part: string
  }
}

const props = defineProps<Props>()

// Computed
const labExamIcon = computed(() => {
  const type = props.contextInfo.labOrExam.toLowerCase()
  if (type.includes('lab')) return 'lucide:flask'
  if (type.includes('exam')) return 'lucide:clipboard-check'
  return 'lucide:book-open'
})
</script>