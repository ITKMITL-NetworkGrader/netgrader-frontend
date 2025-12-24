import { defineConfig } from 'jsrepo';

export default defineConfig({
    // configure where stuff comes from here
    registries: ['https://vue-bits.dev/r'],
    // configure were stuff goes here
    paths: {
        component: 'app/components/bits',
    },
});