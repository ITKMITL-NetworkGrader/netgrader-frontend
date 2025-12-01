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
  <footer class="bg-white border-t border-gray-200 pt-12 pb-2">
    <div class="container mx-auto px-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
        <!-- Contact Information -->
        <div class="space-y-4">
          <h3 class="text-lg font-bold text-gray-900">Contact Information</h3>
          <div class="text-gray-600 leading-relaxed">
            <p class="font-medium text-gray-800">School of Information Technology</p>
            <p>King Mongkut's Institute of Technology Ladkrabang</p>
            <p>1 Chalong Krung 1 Alley, Lat Krabang</p>
            <p>Bangkok 10520, Thailand</p>
          </div>
        </div>

        <!-- Contributors -->
        <div class="space-y-4">
          <h3 class="text-lg font-bold text-gray-900">Made with 💦 by</h3>
          <div class="grid gap-3">
            <a v-for="member in teamMembers" :key="member.name" :href="member.url" target="_blank"
              rel="noopener noreferrer"
              class="group flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
              <div
                class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-blue-50 group-hover:text-primary transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                  class="lucide lucide-instagram">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </div>
              <div>
                <p class="font-medium text-gray-900 group-hover:text-primary transition-colors">{{ member.name }}</p>
                <p class="text-xs text-gray-500">{{ member.role }}</p>
              </div>
            </a>
          </div>
        </div>
      </div>

      <!-- Copyright -->
      <div
        class="pt-8 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-500">
        <div class="flex items-center gap-2">
          <div
            class="w-5 h-5 rounded bg-gray-900 flex items-center justify-center text-white text-[10px] font-mono font-bold">
            NG
          </div>
          <span class="font-medium text-gray-900">NetGrader</span>
        </div>
        <div class="flex items-center gap-4">
          <span>&copy; {{ currentYear }} ITKMITL</span>
        </div>
      </div>
    </div>
  </footer>
</template>