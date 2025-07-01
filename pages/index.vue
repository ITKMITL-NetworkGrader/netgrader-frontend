<script setup lang="ts">
import { Button } from '@/components/ui/button'

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
                color: 0x46f7de,
                backgroundColor: 0xffffff
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
        <div class="">
            <header class="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/20">
                <div class="container mx-auto px-4 py-3">
                    <nav class="flex items-center justify-between">
                        <div class="text-xl font-semibold">NetGrader</div>
                        <div class="flex items-center space-x-4">
                            <a href="/" class="text-gray-700 hover:text-gray-900">Home</a>
                            <Button class=" text-white ">
                                Login
                            </Button>
                        </div>
                    </nav>
                </div>
            </header>
        </div>
        <div class="flex flex-col items-center justify-center min-h-screen text-center">
            <h1 id="hero-title" class="text-5xl font-semibold">NetGrader</h1>
            <p id="hero-subtitle" class="mt-2 text-xl">Your go-to platform for grading network configurations!</p>
            <div class="flex justify-center">
                <Button id="get-started" class="mt-4">
                    Get Started
                </Button>
            </div>
        </div>
    </div>
</template>
