<template>
  <div v-if="agent" class="space-y-6">
    <!-- Header -->
    <div class="card flex items-center gap-5">
      <div class="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl" :style="`background-color: ${agent.color}22; border: 2px solid ${agent.color}`">
        {{ agent.emoji }}
      </div>
      <div>
        <h1 class="text-2xl font-bold text-white">{{ agent.name }}</h1>
        <p class="text-slate-400">{{ agent.role }}</p>
      </div>
    </div>

    <!-- Stat cards -->
    <div class="grid grid-cols-3 gap-4">
      <div class="card text-center">
        <div class="text-3xl font-bold text-white">{{ agentTasks.length }}</div>
        <div class="text-xs text-slate-400 mt-1">Total Tasks</div>
      </div>
      <div class="card text-center">
        <div class="text-3xl font-bold text-indigo-400">{{ activeTasks }}</div>
        <div class="text-xs text-slate-400 mt-1">Active</div>
      </div>
      <div class="card text-center">
        <div class="text-3xl font-bold text-green-400">{{ doneTasks }}</div>
        <div class="text-xs text-slate-400 mt-1">Done</div>
      </div>
    </div>

    <!-- Personal Kanban -->
    <div>
      <h2 class="text-sm font-semibold text-slate-300 mb-3">Tasks</h2>
      <div class="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <div v-for="col in columns" :key="col.status" class="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <div class="flex items-center gap-2 mb-2">
            <span>{{ col.icon }}</span>
            <span class="text-xs font-semibold text-slate-400">{{ col.label }}</span>
            <span class="ml-auto text-xs text-slate-500">{{ colTasks(col.status).length }}</span>
          </div>
          <div class="space-y-2">
            <div v-for="task in colTasks(col.status)" :key="task.id" class="bg-slate-800 rounded-lg p-2.5">
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs text-slate-500 font-mono">{{ task.task_id }}</span>
                <span class="badge" :class="priorityClass(task.priority)">{{ task.priority }}</span>
              </div>
              <div class="text-xs text-white leading-snug">{{ task.title }}</div>
              <div v-if="task.repo" class="text-xs text-slate-500 mt-1 font-mono truncate">{{ task.repo }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Mistakes -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-sm font-semibold text-slate-300">⚠️ Mistakes Log</h2>
        <button @click="showMistakeForm = true" class="btn-primary text-xs px-3 py-1.5">+ Log Mistake</button>
      </div>
      <div v-if="mistakes.length === 0" class="text-slate-500 text-sm py-4 text-center">No mistakes logged yet 🎯</div>
      <table v-else class="w-full text-sm">
        <thead>
          <tr class="text-xs text-slate-500 border-b border-slate-800">
            <th class="text-left pb-2 font-medium">Title</th>
            <th class="text-left pb-2 font-medium">Severity</th>
            <th class="text-left pb-2 font-medium">Lesson</th>
            <th class="text-left pb-2 font-medium">Date</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in mistakes" :key="m.id" class="border-b border-slate-800/50">
            <td class="py-2 text-white">{{ m.title }}</td>
            <td class="py-2"><span class="badge" :class="severityClass(m.severity)">{{ m.severity }}</span></td>
            <td class="py-2 text-slate-400 text-xs max-w-xs truncate">{{ m.lesson || '–' }}</td>
            <td class="py-2 text-slate-500 text-xs">{{ formatDate(m.created_at) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Log Mistake Modal -->
    <div v-if="showMistakeForm" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div class="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-semibold text-white">Log Mistake</h2>
          <button @click="showMistakeForm = false" class="text-slate-500 hover:text-slate-300 text-xl">&times;</button>
        </div>
        <div class="space-y-3">
          <div>
            <label class="text-xs text-slate-400 block mb-1">Title *</label>
            <input v-model="mistakeForm.title" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label class="text-xs text-slate-400 block mb-1">Description</label>
            <textarea v-model="mistakeForm.description" rows="2" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white resize-none"></textarea>
          </div>
          <div>
            <label class="text-xs text-slate-400 block mb-1">Severity</label>
            <select v-model="mistakeForm.severity" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div>
            <label class="text-xs text-slate-400 block mb-1">Lesson Learned</label>
            <textarea v-model="mistakeForm.lesson" rows="2" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white resize-none"></textarea>
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-5">
          <button @click="showMistakeForm = false" class="btn-secondary">Cancel</button>
          <button @click="logMistake" class="btn-primary">Log Mistake</button>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="text-slate-400 text-center py-20">Loading agent...</div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useMainStore } from '../stores/main'

const route = useRoute()
const store = useMainStore()
const agent = ref(null)
const agentTasks = ref([])
const mistakes = ref([])
const showMistakeForm = ref(false)
const mistakeForm = ref({ title: '', description: '', severity: 'medium', lesson: '' })

const activeTasks = computed(() => agentTasks.value.filter(t => t.status === 'active').length)
const doneTasks = computed(() => agentTasks.value.filter(t => t.status === 'done').length)

const columns = [
  { status: 'backlog', label: 'Backlog', icon: '📥' },
  { status: 'active', label: 'Active', icon: '⚡' },
  { status: 'review', label: 'In Review', icon: '🔍' },
  { status: 'done', label: 'Done', icon: '✅' },
]

function colTasks(status) {
  return agentTasks.value.filter(t => t.status === status)
}

function priorityClass(p) {
  return {
    critical: 'bg-red-900 text-red-300',
    high: 'bg-orange-900 text-orange-300',
    medium: 'bg-yellow-900 text-yellow-300',
    low: 'bg-slate-700 text-slate-300',
  }[p] || 'bg-slate-700 text-slate-300'
}

function severityClass(s) {
  return {
    critical: 'bg-red-900 text-red-300',
    high: 'bg-orange-900 text-orange-300',
    medium: 'bg-yellow-900 text-yellow-300',
    low: 'bg-slate-700 text-slate-300',
  }[s] || 'bg-slate-700 text-slate-300'
}

function formatDate(d) {
  return new Date(d).toLocaleDateString()
}

async function loadAgent() {
  const id = route.params.id
  const found = store.agents.find(a => a.id == id)
  agent.value = found || null

  const tasks = await store.fetchTasks({ agent_id: id })
  agentTasks.value = tasks

  const m = await store.fetchMistakes({ agent_id: id })
  mistakes.value = m
}

async function logMistake() {
  if (!mistakeForm.value.title) return
  await store.createMistake({ ...mistakeForm.value, agent_id: route.params.id })
  mistakes.value = await store.fetchMistakes({ agent_id: route.params.id })
  showMistakeForm.value = false
  mistakeForm.value = { title: '', description: '', severity: 'medium', lesson: '' }
}

onMounted(loadAgent)
watch(() => route.params.id, loadAgent)
</script>
