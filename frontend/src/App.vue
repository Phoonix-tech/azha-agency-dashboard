<template>
  <div class="flex h-screen overflow-hidden">
    <!-- Sidebar -->
    <aside class="w-64 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0">
      <!-- Logo -->
      <div class="p-5 border-b border-slate-800">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-lg">🦅</div>
          <div>
            <div class="font-bold text-white text-sm">Phoonix Agency</div>
            <div class="text-xs text-slate-400">AI Dev Dashboard</div>
          </div>
        </div>
      </div>

      <!-- Nav -->
      <nav class="flex-1 p-3 overflow-y-auto">
        <div class="space-y-1">
          <RouterLink to="/" class="nav-link" :class="{ active: $route.path === '/' }">
            <span class="text-lg">📊</span> Dashboard
          </RouterLink>
          <RouterLink to="/board" class="nav-link" :class="{ active: $route.path === '/board' }">
            <span class="text-lg">🗂️</span> Board
          </RouterLink>
        </div>

        <div class="mt-4 mb-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Agents</div>
        <div class="space-y-0.5">
          <RouterLink
            v-for="agent in store.agents"
            :key="agent.id"
            :to="`/agents/${agent.id}`"
            class="nav-link text-sm"
            :class="{ active: $route.path === `/agents/${agent.id}` }"
          >
            <span class="text-base">{{ agent.emoji }}</span>
            <span class="truncate">{{ agent.name }}</span>
            <span v-if="agent.active_tasks > 0" class="ml-auto text-xs bg-indigo-900 text-indigo-300 px-1.5 py-0.5 rounded-full">{{ agent.active_tasks }}</span>
          </RouterLink>
        </div>

        <div class="mt-4 space-y-1">
          <RouterLink to="/standups" class="nav-link" :class="{ active: $route.path === '/standups' }">
            <span class="text-lg">📋</span> Standups
          </RouterLink>
          <RouterLink to="/mistakes" class="nav-link" :class="{ active: $route.path === '/mistakes' }">
            <span class="text-lg">⚠️</span> Mistakes
          </RouterLink>
          <RouterLink to="/reports" class="nav-link" :class="{ active: $route.path === '/reports' }">
            <span class="text-lg">📄</span> Reports
          </RouterLink>
        </div>
      </nav>

      <!-- Current sprint badge -->
      <div class="p-3 border-t border-slate-800">
        <div class="bg-slate-800 rounded-lg px-3 py-2 text-xs">
          <div class="text-slate-400">Active Sprint</div>
          <div class="font-semibold text-indigo-400 mt-0.5">{{ store.currentSprint?.name || 'None' }}</div>
        </div>
      </div>
    </aside>

    <!-- Main content -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Top bar -->
      <header class="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div class="text-slate-300 text-sm">
          <span class="text-slate-500">Sprint:</span>
          <span class="ml-2 font-medium text-white">{{ store.currentSprint?.name || 'No active sprint' }}</span>
          <span v-if="store.currentSprint?.goal" class="ml-3 text-slate-400 text-xs hidden md:inline">— {{ store.currentSprint.goal }}</span>
        </div>
        <div class="flex items-center gap-3 text-xs text-slate-400">
          <span v-if="store.stats">
            <span class="text-green-400 font-semibold">{{ store.stats.tasks.active }}</span> active
            &nbsp;·&nbsp;
            <span class="text-red-400 font-semibold">{{ store.stats.blockers.unresolved }}</span> blockers
          </span>
        </div>
      </header>

      <!-- Page -->
      <main class="flex-1 overflow-y-auto p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useMainStore } from './stores/main'

const store = useMainStore()
const $route = useRoute()

onMounted(async () => {
  await Promise.all([
    store.fetchAgents(),
    store.fetchSprints(),
    store.fetchStats(),
  ])
})
</script>

<style>
.nav-link {
  @apply flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm cursor-pointer no-underline;
}
.nav-link.active {
  @apply text-white bg-slate-800;
}
</style>
