<script setup lang="ts">
import { Button } from '@/components/ui/button'

</script>

<template>
    <div class="font-roboto-mono">
        <nav class="fixed top-0 w-full h-16 z-[5] bg-secondary/5 backdrop-blur-sm border-b border-gray-200/20">
            <div class="container mx-auto px-4 py-3 flex items-center justify-between">
                <NuxtLink to="/" class="text-2xl font-bold">
                    NetGrader
                </NuxtLink>
                <div class="flex items-center">
                    <NuxtLink to="/" class="ml-4 text-gray-600 hover:text-gray-800">
                        Home
                    </NuxtLink>
                    <NuxtLink to="/login" class="ml-4 text-gray-600 hover:text-gray-800">
                        <Button class="">
                            Login
                        </Button>
                    </NuxtLink>
                </div>
            </div>
        </nav>
    </div>
</template>