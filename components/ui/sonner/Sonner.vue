<!-- components/ui/sonner/Sonner.vue -->
<template>
  <Toaster
    class="toaster group"
    :toast-options="{
      classes: {
          toast: 'group toast group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground hover:group-[.toast]:bg-primary/90',
          cancelButton: 'group-[.toast]:bg-secondary group-[.toast]:text-secondary-foreground hover:group-[.toast]:bg-secondary/80',
          error: 'group-[.toaster]:bg-destructive/10 group-[.toaster]:text-destructive-foreground group-[.toaster]:border-destructive/20 group-[.toaster]:shadow-lg [&_.toast-icon]:text-destructive',
          success: 'group-[.toaster]:bg-green-900/10 group-[.toaster]:text-green-400 group-[.toaster]:border-green-900/20 group-[.toaster]:shadow-lg [&_.toast-icon]:text-green-400 dark:group-[.toaster]:bg-green-900/15 dark:group-[.toaster]:text-green-300 dark:group-[.toaster]:border-green-800/30',
          warning: 'group-[.toaster]:bg-yellow-900/10 group-[.toaster]:text-yellow-400 group-[.toaster]:border-yellow-900/20 group-[.toaster]:shadow-lg [&_.toast-icon]:text-yellow-400 dark:group-[.toaster]:bg-yellow-900/15 dark:group-[.toaster]:text-yellow-300 dark:group-[.toaster]:border-yellow-800/30',
          info: 'group-[.toaster]:bg-primary/10 group-[.toaster]:text-primary group-[.toaster]:border-primary/20 group-[.toaster]:shadow-lg [&_.toast-icon]:text-primary'
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
/* .toaster {
  font-family: 'Bai Jamjuree', sans-serif !important;
  --normal-bg: #ffffff;
  --normal-border: #e2e8f0;
  --normal-text: #0f172a;
  --normal-description: #64748b;
  
  --success-bg: #f0fdf4;
  --success-border: #bbf7d0;
  --success-text: #14532d;
  --success-description: #15803d;
  
  --error-bg: #fef2f2;
  --error-border: #fecaca;
  --error-text: #7f1d1d;
  --error-description: #dc2626;
  
  --warning-bg: #fffbeb;
  --warning-border: #fed7aa;
  --warning-text: #78350f;
  --warning-description: #d97706;
  
  --info-bg: #eff6ff;
  --info-border: #bfdbfe;
  --info-text: #1e3a8a;
  --info-description: #2563eb;
}

.dark .toaster {
  font-family: 'Bai Jamjuree', sans-serif !important;
  --normal-bg: #020617;
  --normal-border: #334155;
  --normal-text: #f8fafc;
  --normal-description: #94a3b8;
  
  --success-bg: rgba(20, 83, 45, 0.1);
  --success-border: rgba(20, 83, 45, 0.2);
  --success-text: #4ade80;
  --success-description: #86efac;
  
  --error-bg: rgba(127, 29, 29, 0.1);
  --error-border: rgba(127, 29, 29, 0.2);
  --error-text: #f87171;
  --error-description: #fca5a5;
  
  --warning-bg: rgba(120, 53, 15, 0.1);
  --warning-border: rgba(120, 53, 15, 0.2);
  --warning-text: #facc15;
  --warning-description: #fde047;
  
  --info-bg: rgba(30, 58, 138, 0.1);
  --info-border: rgba(30, 58, 138, 0.2);
  --info-text: #60a5fa;
  --info-description: #93c5fd;
} */

/* Enhanced styling for better vue-sonner appearance */
[data-sonner-toast] {
  font-family: 'Bai Jamjuree', sans-serif !important;
  padding: 16px !important;
  border-radius: 8px !important;
  font-size: 14px !important;
  line-height: 1.5 !important;
  min-height: 48px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
  border: 1px solid !important;
  transition: all 0.2s ease !important;
}

[data-sonner-toast]:hover {
  transform: translateY(-1px) !important;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12) !important;
}

[data-sonner-toast][data-type="error"] {
  background: var(--error-bg) !important;
  border-color: var(--error-border) !important;
  color: var(--error-text) !important;
}

[data-sonner-toast][data-type="error"] [data-title] {
  color: var(--error-text) !important;
  font-weight: 600 !important;
  margin-bottom: 4px !important;
}

[data-sonner-toast][data-type="error"] [data-description] {
  color: var(--error-description) !important;
  font-size: 13px !important;
  line-height: 1.4 !important;
}

[data-sonner-toast][data-type="success"] {
  background: var(--success-bg) !important;
  border-color: var(--success-border) !important;
  color: var(--success-text) !important;
}

[data-sonner-toast][data-type="success"] [data-title] {
  color: var(--success-text) !important;
  font-weight: 600 !important;
  margin-bottom: 4px !important;
}

[data-sonner-toast][data-type="success"] [data-description] {
  color: var(--success-description) !important;
  font-size: 13px !important;
  line-height: 1.4 !important;
}

[data-sonner-toast][data-type="warning"] {
  background: var(--bg) !important;
  border-color: var(--warning-border) !important;
  color: var(--warning-text) !important;
}

[data-sonner-toast][data-type="warning"] [data-title] {
  color: var(--warning-text) !important;
  font-weight: 600 !important;
  margin-bottom: 4px !important;
}

[data-sonner-toast][data-type="warning"] [data-description] {
  color: var(--warning-description) !important;
  font-size: 13px !important;
  line-height: 1.4 !important;
}

[data-sonner-toast][data-type="info"] {
  background: var(--bg) !important;
  border-color: var(--info-border) !important;
  color: var(--info-text) !important;
}

[data-sonner-toast][data-type="info"] [data-title] {
  color: var(--info-text) !important;
  font-weight: 600 !important;
  margin-bottom: 4px !important;
}

[data-sonner-toast][data-type="info"] [data-description] {
  color: var(--info-description) !important;
  font-size: 13px !important;
  line-height: 1.4 !important;
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
  background: rgba(0, 0, 0, 0.05) !important;
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
  background: transparent !important;
  cursor: pointer !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  transition: all 0.2s ease !important;
}

[data-sonner-toast] [data-button]:hover {
  background: rgba(0, 0, 0, 0.05) !important;
}

</style>