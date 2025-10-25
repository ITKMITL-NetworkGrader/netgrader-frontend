<!-- components/ui/sonner/Sonner.vue -->
<template>
  <Toaster
    class="toaster group"
    :toast-options="{
      classes: {
          toast: 'group toast rounded-xl border bg-card/95 text-card-foreground shadow-xl shadow-black/5 backdrop-blur supports-[backdrop-filter]:backdrop-blur-lg',
          description: 'text-muted-foreground/90',
          actionButton: 'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors',
          cancelButton: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors',
          error: 'toast-error',
          success: 'toast-success',
          warning: 'toast-warning',
          info: 'toast-info'
        }
    }"
    v-bind="$attrs"
  />
</template>

<script setup lang="ts">
import { Toaster } from 'vue-sonner'

defineOptions({
  inheritAttrs: false
})
</script>

<style>
/* Custom styling to match vue-sonner appearance */
[data-sonner-toast] {
  font-family: var(--font-sans, 'Bai Jamjuree'), ui-sans-serif, system-ui !important;
  padding: 16px !important;
  border-radius: 0.85rem !important;
  font-size: 0.875rem !important;
  line-height: 1.5 !important;
  min-height: 52px !important;
  border: 1px solid color-mix(in srgb, var(--border) 78%, transparent 22%) !important;
  background: color-mix(in srgb, var(--card) 92%, transparent 8%) !important;
  color: var(--card-foreground) !important;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08), 0 2px 10px rgba(15, 23, 42, 0.05) !important;
  backdrop-filter: blur(18px) !important;
  transition: transform 0.18s ease, box-shadow 0.18s ease !important;
}

[data-sonner-toast]:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 22px 55px rgba(15, 23, 42, 0.12), 0 4px 18px rgba(15, 23, 42, 0.08) !important;
}

[data-sonner-toast] [data-title] {
  font-weight: 600 !important;
  margin-bottom: 2px !important;
  letter-spacing: -0.01em !important;
}

[data-sonner-toast] [data-description] {
  font-size: 0.8125rem !important;
  color: color-mix(in srgb, var(--muted-foreground) 92%, transparent 8%) !important;
}

[data-sonner-toast].toast-success {
  background: color-mix(in srgb, var(--card) 88%, var(--secondary) 12%) !important;
  border-color: color-mix(in srgb, var(--border) 60%, var(--secondary) 40%) !important;
  color: color-mix(in srgb, var(--card-foreground) 35%, var(--secondary-foreground) 65%) !important;
}

[data-sonner-toast].toast-success [data-icon] {
  color: color-mix(in srgb, var(--secondary-foreground) 80%, var(--card-foreground) 20%) !important;
}

[data-sonner-toast].toast-error {
  background: color-mix(in srgb, var(--card) 84%, var(--destructive) 16%) !important;
  border-color: color-mix(in srgb, var(--border) 55%, var(--destructive) 45%) !important;
  color: color-mix(in srgb, var(--card-foreground) 30%, var(--destructive-foreground) 70%) !important;
}

[data-sonner-toast].toast-error [data-icon] {
  color: color-mix(in srgb, var(--destructive-foreground) 85%, var(--card-foreground) 15%) !important;
}

[data-sonner-toast].toast-warning {
  background: color-mix(in srgb, var(--card) 88%, var(--accent) 12%) !important;
  border-color: color-mix(in srgb, var(--border) 60%, var(--accent) 40%) !important;
  color: color-mix(in srgb, var(--card-foreground) 38%, var(--accent-foreground) 62%) !important;
}

[data-sonner-toast].toast-warning [data-icon] {
  color: color-mix(in srgb, var(--accent-foreground) 84%, var(--card-foreground) 16%) !important;
}

[data-sonner-toast].toast-info {
  background: color-mix(in srgb, var(--card) 88%, var(--primary) 12%) !important;
  border-color: color-mix(in srgb, var(--border) 58%, var(--primary) 42%) !important;
  color: color-mix(in srgb, var(--card-foreground) 35%, var(--primary-foreground) 65%) !important;
}

[data-sonner-toast].toast-info [data-icon] {
  color: color-mix(in srgb, var(--primary-foreground) 85%, var(--card-foreground) 15%) !important;
}

[data-sonner-toast] [data-close-button] {
  position: absolute !important;
  right: 8px !important;
  top: 8px !important;
  width: 20px !important;
  height: 20px !important;
  border-radius: 4px !important;
  border: none !important;
  background: transparent !important;
  color: inherit !important;
  cursor: pointer !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  opacity: 0.6 !important;
  transition: opacity 0.2s ease !important;
}

[data-sonner-toast] [data-close-button]:hover {
  opacity: 1 !important;
  background: color-mix(in srgb, currentColor 12%, transparent 88%) !important;
}

[data-sonner-toast] [data-icon] {
  width: 20px !important;
  height: 20px !important;
  margin-right: 12px !important;
  flex-shrink: 0 !important;
}

[data-sonner-toast] [data-loading-icon] {
  width: 16px !important;
  height: 16px !important;
  margin-right: 12px !important;
  flex-shrink: 0 !important;
}

[data-sonner-toast] [data-button] {
  margin-left: 12px !important;
  padding: 4px 8px !important;
  border-radius: 4px !important;
  border: 1px solid !important;
  border-color: color-mix(in srgb, currentColor 40%, transparent 60%) !important;
  background: color-mix(in srgb, currentColor 6%, transparent 94%) !important;
  cursor: pointer !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  transition: all 0.2s ease !important;
}

[data-sonner-toast] [data-button]:hover {
  background: color-mix(in srgb, currentColor 12%, transparent 88%) !important;
}

</style>
