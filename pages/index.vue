<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { NavigationBar } from '#components';

const { $anime } = useNuxtApp()

const vantaEffect = ref(null)

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
    // Load Three.js
    const threeScript = document.createElement('script')
    threeScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js'
    document.head.appendChild(threeScript)

    threeScript.onload = () => {
        // Load Vanta.js after Three.js is loaded
        const vantaScript = document.createElement('script')
        vantaScript.src = 'https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.net.min.js'
        document.head.appendChild(vantaScript)

        vantaScript.onload = () => {
            // Initialize Vanta effect
            vantaEffect.value = window.VANTA.NET({
                el: "body",
                mouseControls: true,
                touchControls: true,
                gyroControls: false,
                minHeight: 200.00,
                minWidth: 200.00,
                scale: 1.00,
                scaleMobile: 1.00,
                color: 0xe4c090,
                backgroundColor: 0xfdfbf7
            })
        }
    }   
});

onBeforeUnmount(() => {
    if (vantaEffect.value) {
        vantaEffect.value.destroy()
    }
})

</script>

<template>
    <div>
        <div class="font-roboto-mono flex flex-col items-center justify-center min-h-screen text-center">
            <h1 id="hero-title" class="text-5xl font-semibold">NetGrader</h1>
            <p id="hero-subtitle" class="mt-2 text-xl">Your go-to platform for grading network configurations!</p>
            <div class="flex justify-center">
                <NuxtLink to="/login" class="mt-2">
                    <Button id="get-started" class="mt-4 scale-100">
                        Get Started
                    </Button>
                </NuxtLink>   
            </div>
        </div>
    </div>
</template>
