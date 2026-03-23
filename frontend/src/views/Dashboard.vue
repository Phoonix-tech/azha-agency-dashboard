<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold text-white">Dashboard</h1>

    <!-- Stat cards -->
    <div class="grid grid-cols-2 xl:grid-cols-4 gap-4">
      <div class="card">
        <div class="text-slate-400 text-xs uppercase tracking-wider mb-1">Total Tasks</div>
        <div class="text-3xl font-bold text-white">{{ stats?.tasks.total ?? '–' }}</div>
        <div class="text-xs text-slate-500 mt-1">across all statuses</div>
      </div>
      <div class="card">
        <div class="text-slate-400 text-xs uppercase tracking-wider mb-1">Active</div>
        <div class="text-3xl font-bold text-indigo-400">{{ stats?.tasks.active ?? '–' }}</div>
        <div class="text-xs text-slate-500 mt-1">in progress now</div>
      </div>
      <div class="card">
        <div class="text-slate-400 text-xs uppercase tracking-wider mb-1">Blockers</div>
        <div class="text-3xl font-bold" :class="stats?.blockers.unresolved > 0 ? 'text-red-400' : 'text-green-400'">
          {{ stats?.blockers.unresolved ?? '–' }}
        </div>
        <div class="text-xs text-slate-500 mt-1">unresolved</div>
      </div>
      <div class="card">
        <div class="text-slate-400 text-xs uppercase tracking-wider mb-1">Done %</div>
        <div class="text-3xl font-bold text-green-400">{{ donePercent }}%</div>
        <div class="text-xs text-slate-500 mt-1">{{ stats?.tasks.done ?? 0 }} of {{ stats?.tasks.total ?? 0 }} tasks</div>
      </div>
    </div>

    <!-- Charts row -->
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <div class="card">
        <h2 class="text-sm font-semibold text-slate-300 mb-4">Tasks by Status</h2>
        <div style="height:220px">
          <canvas ref="barCanvas"></canvas>
        </div>
      </div>
      <div class="card">
        <h2 class="text-sm font-semibold text-slate-300 mb-4">Tasks by Agent</h2>
        <div class="flex items-center justify-center" style="height:220px">
          <canvas ref="doughnutCanvas" style="max-width:220px;max-height:220px"></canvas>
        </div>
      </div>
    </div>

    <!-- Blockers + Activity -->
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <!-- Unresolved blockers -->
      <div class="card">
        <h2 class="text-sm font-semibold text-slate-300 mb-3">🚧 Unresolved Blockers</h2>
        <div v-if="unresolvedBlockers.length === 0" class="text-slate-500 text-sm py-4 text-center">No blockers 🎉</div>
        <div class="space-y-2">
          <div v-for="b in unresolvedBlockers" :key="b.id" class="bg-slate-800 rounded-lg px-3 py-2.5">
            <div class="flex items-start gap-2">
              <span class="text-base mt-0.5">{{ b.agent_emoji }}</span>
              <div class="flex-1 min-w-0">
                <div class="text-sm text-white font-medium">{{ b.agent_name }}</div>
                <div class="text-xs text-slate-400 mt-0.5">{{ b.description }}</div>
              </div>
              <button @click="resolveBlocker(b.id)" class="text-xs text-green-400 hover:text-green-300 whitespace-nowrap">Resolve</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent activity -->
      <div class="card">
        <h2 class="text-sm font-semibold text-slate-300 mb-3">⚡ Recent Activity</h2>
        <div v-if="activityFeed.length === 0" class="text-slate-500 text-sm py-4 text-center">No activity yet</div>
        <div class="space-y-2">
          <div v-for="item in activityFeed.slice(0,8)" :key="item.id" class="flex items-start gap-2.5">
            <span class="text-base">{{ item.agent_emoji || '🤖' }}</span>
            <div class="flex-1 min-w-0">
              <div class="text-xs text-white">
                <span class="font-medium">{{ item.agent_name || 'System' }}</span>
                <span class="text-slate-400 ml-1">{{ formatAction(item.action) }}</span>
              </div>
              <div class="text-xs text-slate-500 mt-0.5 truncate">{{ item.detail }}</div>
            </div>
            <div class="text-xs text-slate-600 whitespace-nowrap">{{ timeAgo(item.created_at) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Chart, registerables } from 'chart.js'
import { useMainStore } from '../stores/main'

Chart.register(...registerables)

const store = useMainStore()
const barCanvas = ref(null)
const doughnutCanvas = ref(null)
let barChart = null
let doughnutChart = null

const stats = computed(() => store.stats)
const donePercent = computed(() => {
  if (!stats.value?.tasks.total) return 0
  return Math.round((stats.value.tasks.done / stats.value.tasks.total) * 100)
})
const unresolvedBlockers = computed(() => store.blockers.filter(b => !b.resolved))
const activityFeed = computed(() => store.activity)

function formatAction(action) {
  const map = {
    task_created: 'created a task',
    task_updated: 'updated a task',
    blocker_added: 'reported a blocker',
    blocker_resolved: 'resolved a blocker',
    mistake_logged: 'logged a mistake',
  }
  return map[action] || action
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

async function resolveBlocker(id) {
  await store.resolveBlocker(id)
  await Promise.all([store.fetchBlockers(), store.fetchStats()])
}

function renderCharts() {
  if (!stats.value) return

  const statusData = [
    stats.value.tasks.backlog,
    stats.value.tasks.active,
    stats.value.tasks.review,
    stats.value.tasks.done,
  ]

  if (barChart) barChart.destroy()
  barChart = new Chart(barCanvas.value, {
    type: 'bar',
    data: {
      labels: ['Backlog', 'Active', 'In Review', 'Done'],
      datasets: [{
        label: 'Tasks',
        data: statusData,
        backgroundColor: ['#64748b', '#6366f1', '#f59e0b', '#10b981'],
        borderRadius: 6,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8' } },
        y: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8', stepSize: 1 }, beginAtZero: true },
      }
    }
  })

  const agentColors = store.agents.map(a => a.color || '#6366f1')
  const agentLabels = store.agents.map(a => `${a.emoji} ${a.name}`)
  const agentData = store.agents.map(a => a.task_count || 0)

  if (doughnutChart) doughnutChart.destroy()
  doughnutChart = new Chart(doughnutCanvas.value, {
    type: 'doughnut',
    data: {
      labels: agentLabels,
      datasets: [{
        data: agentData,
        backgroundColor: agentColors,
        borderColor: '#0f172a',
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#94a3b8', boxWidth: 12, font: { size: 11 } }
        }
      }
    }
  })
}

onMounted(async () => {
  await Promise.all([
    store.fetchStats(),
    store.fetchBlockers(),
    store.fetchActivity(),
    store.fetchAgents(),
  ])
  renderCharts()
})

watch(() => store.stats, () => renderCharts())
</script>
