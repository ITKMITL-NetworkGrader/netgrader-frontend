<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { FlickeringGrid } from '@/components/ui/flickering-grid'
import { TextReveal } from '@/components/ui/text-reveal';

const { $anime } = useNuxtApp()

// Get the primary color from CSS variables
const gridColor = computed(() => {
  if (process.client) {
    const styles = getComputedStyle(document.documentElement);
    return styles.getPropertyValue('--color-primary').trim();
  }
  return 'oklch(0.6698 0.0882 196.2136)'; // Default primary color
})

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
        <!-- FlickeringGrid Background -->
        <ClientOnly>
            <div class="absolute inset-0 w-full h-full">
                <FlickeringGrid
                    class="relative inset-0 z-0 [mask-image:radial-gradient(350px_circle_at_center,white,transparent)]"
                    :square-size="4"
                    :grid-gap="6"
                    :color="gridColor"
                    :max-opacity="0.5"
                    :flicker-chance="0.1"
                    :width="800"
                    :height="800"
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
