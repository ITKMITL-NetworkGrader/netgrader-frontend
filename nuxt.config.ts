import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  css: ['@/assets/css/tailwind.css'],
  vite: {
    plugins: [
      tailwindcss()
    ]
  },
  runtimeConfig: {
    public: {
      backend1url: process.env.NUXT_BACKEND1_URL,
      env: process.env.NUXT_ENV,
    },
  },
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },

  modules: [
    '@nuxt/eslint',
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxt/image',
    'shadcn-nuxt',
    '@hypernym/nuxt-anime',
    '@nuxt/fonts',
    'vue-sonner/nuxt',
  ],
  shadcn: {
    /**
     * Prefix for all the imported component
     */
    prefix: '',
    /**
       * Directory that the component lives in.
       * @default "./components/ui"
       */
      componentDir: './components/ui'
  },
  vueSonner: {
    css: false,
  }
})