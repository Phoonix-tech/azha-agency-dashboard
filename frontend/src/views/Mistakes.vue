<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-white">Mistakes Log</h1>
      <div class="flex gap-3">
        <select v-model="filterAgent" class="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300">
          <option value="">All Agents</option>
          <option v-for="a in store.agents" :key="a.id" :value="a.id">{{ a.emoji }} {{ a.name }}</option>
        </select>
        <button @click="showForm = true" class="btn-primary">+ Log Mistake</button>
      </div>
    </div>

    <div v-if="filteredMistakes.length === 0" class="card text-center py-12 text-slate-500">No mistakes found 🎯</div>
    
    <div class="grid gap-3">
      <div v-for="m in filteredMistakes" :key="m.id" class="card">
        <div class="flex items-start justify-between">
          <div class="flex items-start gap-3">
            <span class="text-xl">{{ m.agent_emoji }}</span>
            <div>
              <div class="text-white font-medium">{{ m.title }}</div>
              <div class="text-xs text-slate-400 mt-0.5">{{ m.agent_name }} · {{ formatDate(m.created_at) }}</div>
            </div>
          </div>
          <span class="badge" :class="severityClass(m.severity)">{{ m.severity }}</span>
        </div>
        <div v-if="m.description" class="mt-3 text-sm text-slate-400">{{ m.description }}</div>
        <div v-if="m.lesson" class="mt-2 flex items-start gap-2 bg-indigo-950/50 rounded-lg px-3 py-2">
          <span class="text-indigo-400">💡</span>
          <div class="text-sm text-indigo-300">{{ m.lesson }}</div>
        </div>
      </div>
    </div>

    <!-- Log mistake modal -->
    <div v-if="showForm" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div class="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-semibold text-white">Log Mistake</h2>
          <button @click="showForm = false" class="text-slate-500 hover:text-slate-300 text-xl">&times;</button>
        </div>
        <div class="space-y-3">
          <div>
            <label class="text-xs text-slate-400 block mb-1">Agent</label>
            <select v-model="form.agent_id" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
              <option value="">Select agent</option>
              <option v-for="a in store.agents" :key="a.id" :value="a.id">{{ a.emoji }} {{ a.name }}</option>
            </select>
          </div>
          <div>
            <label class="text-xs text-slate-400 block mb-1">Title *</label>
            <input v-model="form.title" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label class="text-xs text-slate-400 block mb-1">Description</label>
            <textarea v-model="form.description" rows="2" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white resize-none"></textarea>
          </div>
          <div>
            <label class="text-xs text-slate-400 block mb-1">Severity</label>
            <select v-model="form.severity" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div>
            <label class="text-xs text-slate-400 block mb-1">Lesson Learned</label>
            <textarea v-model="form.lesson" rows="2" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white resize-none"></textarea>
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-5">
          <button @click="showForm = false" class="btn-secondary">Cancel</button>
          <button @click="submit" class="btn-primary">Log Mistake</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useMainStore } from '../stores/main'

const store = useMainStore()
const filterAgent = ref('')
const showForm = ref(false)
const form = ref({ agent_id: '', title: '', description: '', severity: 'medium', lesson: '' })

const filteredMistakes = computed(() => {
  if (!filterAgent.value) return store.mistakes
  return store.mistakes.filter(m => m.agent_id == filterAgent.value)
})

function severityClass(s) {
  return {
    critical: 'bg-red-900 text-red-300',
    high: 'bg-orange-900 text-orange-300',
    medium: 'bg-yellow-900 text-yellow-300',
    low: 'bg-slate-700 text-slate-300',
  }[s] || 'bg-slate-700 text-slate-300'
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

async function submit() {
  if (!form.value.title) return
  await store.createMistake({ ...form.value, agent_id: form.value.agent_id || null })
  await store.fetchMistakes()
  showForm.value = false
  form.value = { agent_id: '', title: '', description: '', severity: 'medium', lesson: '' }
}

onMounted(() => store.fetchMistakes())
</script>
