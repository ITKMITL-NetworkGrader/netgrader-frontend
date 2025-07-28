import { defineNuxtPlugin } from '#app'
import 'preline'

// @ts-ignore
export default defineNuxtPlugin((nuxtApp) => {
    nuxtApp.hook('app:mounted', () => {
        const { HSStaticMethods } = window as any
        if (HSStaticMethods) {
            HSStaticMethods.autoInit()
        }
    })
})
