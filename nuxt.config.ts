import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  future: {
    compatibilityVersion: 4,
  },
  srcDir: 'app',
  css: ['@/assets/css/tailwind.css'],
  ssr: false,
  components: {
    extensions: ['.vue'], // avoid treating barrel index.ts files as components
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
  hooks: {
    'components:dirs': (dirs) => {
      for (let index = dirs.length - 1; index >= 0; index -= 1) {
        const normalizedPath = dirs[index].path?.toString().replace(/\\/g, '/');
      }
    },
    'components:extend': (components) => {
      for (let index = components.length - 1; index >= 0; index -= 1) {
        const filePath = components[index].filePath?.toString().replace(/\\/g, '/');
        if (!filePath) continue;
        // Drop all shadcn UI components (both barrels and .vue files) from auto-registration;
        // they are meant to be imported explicitly from their barrels
        if (filePath.includes('/app/components/ui/')) {
          components.splice(index, 1);
        }
      }
    },
  }
})
