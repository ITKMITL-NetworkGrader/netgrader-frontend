import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  future: {
    compatibilityVersion: 4,
  },
  srcDir: 'app',
  css: ['@/assets/css/tailwind.css'],
  ssr: false,
  components: {
    dirs: [
      {
        path: '~/components',
        ignore: ['ui/**', 'editor/**', 'wizard/**']
      },
      '~/components/editor',
      '~/components/wizard'
    ]
  },
  vite: {
    plugins: [
      tailwindcss()
    ]
  },
  runtimeConfig: {
    public: {
      backendurl: process.env.NUXT_BACKENDURL,
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
    prefix: 'Ui',
    /**
       * Directory that the component lives in.
       * @default "./components/ui"
       */
      componentDir: './app/components/ui'
  },
  vueSonner: {
    css: false,
  },
})
