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
    ],
    // DSEC-16: Strip console logs and debugger statements in production
    esbuild: {
      drop: process.env.NODE_ENV === 'production' ? ['debugger'] : [],
      pure: process.env.NODE_ENV === 'production' ? ['console.log', 'console.debug'] : []
    }
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
    '@vueuse/motion/nuxt',
    '@sentry/nuxt/module',
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

  sentry: {
    org: 'netgrader',
    project: 'javascript-nuxt',
  },

  sourcemap: {
    client: 'hidden',
  },
})