<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { FlickeringGrid } from '@/components/ui/flickering-grid'

const { $anime } = useNuxtApp()

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
                    color="#60A5FA"
                    :max-opacity="0.5"
                    :flicker-chance="0.1"
                    :width="800"
                    :height="800"
                />
            </div>
        </ClientOnly>
        
        <!-- Content -->
        <div class="relative z-10 font-roboto-mono flex flex-col items-center justify-center min-h-[calc(100vh-theme(spacing.28))] text-center">
            <h1 id="hero-title" class="text-5xl font-semibold">NetGrader</h1>
            <p id="hero-subtitle" class="mt-2 text-xl">Your go-to platform for grading network configurations!</p>
            <div class="flex justify-center">
                <NuxtLink to="/courses" class="mt-2">
                    <Button id="get-started" class="mt-4 scale-100">
                        Get Started
                    </Button>
                </NuxtLink>   
            </div>
        </div>
    </div>
</template>
