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
    extensions: ['vue'], // avoid treating barrel index.ts files as components
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
      dirs.forEach((dir) => {
        // Only register Vue single-file components from the shadcn ui directory
        if (dir.path && dir.path.toString().replace(/\\\\/g, '/').includes('/app/components/ui')) {
          dir.extensions = ['vue'];
          dir.ignore = Array.isArray(dir.ignore) ? [...dir.ignore, '**/index.ts'] : ['**/index.ts'];
        }
      });
    },
    'components:extend': (components) => {
      return components.filter((component) => {
        const filePath = component.filePath?.toString().replace(/\\\\/g, '/');
        if (!filePath) return true;
        // Drop shadcn barrel index.ts files from auto-registration
        if (filePath.includes('/app/components/ui/') && filePath.endsWith('/index.ts')) {
          return false;
        }
        return true;
      });
    },
  }
})
