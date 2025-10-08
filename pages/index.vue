<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Globe } from '@/components/ui/globe'
import { TextReveal } from '@/components/ui/text-reveal';

const { $anime } = useNuxtApp()

// Get the primary color from CSS variables for globe customization
const primaryColor = computed(() => {
  if (process.client) {
    const styles = getComputedStyle(document.documentElement);
    const colorValue = styles.getPropertyValue('--color-primary').trim();
    // Convert OKLCH to RGB (approximate conversion for the globe)
    // Default to a blue-ish color based on the primary theme
    return [0.4, 0.5, 0.8]; // RGB values for globe
  }
  return [0.4, 0.5, 0.8];
})

const globeConfig = computed(() => ({
  baseColor: primaryColor.value,
  markerColor: [0.9, 0.4, 0.1],
  glowColor: primaryColor.value,
  dark: 0
}))

onMounted(() => {
    $anime({
        targets: '#hero-title',
        translateY: [-50, 0],
        opacity: [0, 1],
        duration: 1000,
        easing: 'easeOutExpo'
    });
    $anime({
        targets: '#hero-subtitle',
        translateY: [-50, 0],
        opacity: [0, 1],
        duration: 1750,
        easing: 'easeOutExpo'
    });
    $anime({
        targets: '#get-started',
        opacity: [0, 1],
        duration: 2000,
    });
});

</script>

<template>
    <div class="relative min-h-[calc(100vh-theme(spacing.28))] overflow-hidden">
        <!-- Globe Background -->
        <ClientOnly>
            <div class="w-full h-full top-30 absolute">
                <Globe
                    class="opacity-80"
                    :config="globeConfig"
                />
            </div>
        </ClientOnly>

        <!-- Content -->
        <div class="relative z-10 font-roboto-mono flex flex-col items-center justify-center min-h-[calc(100vh-theme(spacing.28))] text-center">
            <TextReveal class="text-center text-4xl font-bold" :delay=0.2>NetGrader</TextReveal>
            <TextReveal class="mt-2 text-xl" :delay=0.5>Your go-to platform for grading network configurations!</TextReveal>
            <div class="flex justify-center">
                <NuxtLink to="/courses" class="mt-6">
                    <Button id="get-started" class="scale-100 hover:cursor-pointer">
                        Get Started
                    </Button>
                </NuxtLink>
            </div>
        </div>
    </div>
</template>
