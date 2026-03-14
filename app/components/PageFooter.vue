<script setup lang="ts">
const currentYear = new Date().getFullYear()

const teamMembers = [
  {
    name: '@tarj.essada',
    role: 'Backend',
    url: 'https://instagram.com/tarj.essada'
  },
  {
    name: '@chinfair_',
    role: 'Frontend',
    url: 'https://instagram.com/chinfair_'
  },
  {
    name: '@oat_chayanont',
    role: 'AI Implementor',
    url: 'https://instagram.com/oat_chayanont'
  }
]
</script>

<template>
  <footer class="bg-card border-t border-border pt-12 pb-2">
    <div class="container mx-auto px-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
        <!-- Contact Information -->
        <div class="space-y-4">
          <h3 class="text-lg font-bold text-foreground">Contact Information</h3>
          <div class="text-muted-foreground leading-relaxed">
            <p class="font-medium text-foreground">School of Information Technology</p>
            <p>King Mongkut's Institute of Technology Ladkrabang</p>
            <p>1 Chalong Krung 1 Alley, Lat Krabang</p>
            <p>Bangkok 10520, Thailand</p>
          </div>
        </div>

        <!-- Contributors -->
        <div class="space-y-4">
          <h3 class="text-lg font-bold text-foreground">Made with 💦 by</h3>
          <div class="grid gap-3">
            <a v-for="member in teamMembers" :key="member.name" :href="member.url" target="_blank"
              rel="noopener noreferrer"
              class="group flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors border border-transparent hover:border-border">
              <div
                class="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                  class="lucide lucide-instagram">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </div>
              <div>
                <p class="font-medium text-foreground group-hover:text-primary transition-colors">{{ member.name }}</p>
                <p class="text-xs text-muted-foreground">{{ member.role }}</p>
              </div>
            </a>
          </div>
        </div>
      </div>

      <!-- Copyright -->
      <div
        class="pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
        <div class="flex items-center gap-2">
          <div
            class="w-5 h-5 rounded bg-primary flex items-center justify-center text-primary-foreground text-[10px] font-mono font-bold">
            NG
          </div>
          <span class="font-medium text-foreground">NetGrader</span>
        </div>
        <div class="flex items-center gap-4">
          <span>&copy; {{ currentYear }} ITKMITL</span>
        </div>
      </div>
    </div>
  </footer>
</template>