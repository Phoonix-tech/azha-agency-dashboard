<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-white">Standups</h1>
      <button @click="showForm = true" class="btn-primary">+ Log Standup</button>
    </div>

    <div v-if="standups.length === 0" class="card text-center py-12 text-slate-500">No standups logged yet.</div>

    <!-- Timeline -->
    <div class="relative space-y-4 pl-6">
      <div class="absolute left-2 top-0 bottom-0 w-0.5 bg-slate-800"></div>
      <div v-for="s in standups" :key="s.id" class="relative">
        <div class="absolute -left-4 top-4 w-3 h-3 rounded-full bg-indigo-500 border-2 border-slate-950"></div>
        <div class="card ml-2">
          <div class="flex items-start justify-between mb-2">
            <div class="text-xs text-slate-400">{{ formatDate(s.created_at) }}</div>
            <div class="flex gap-3 text-xs">
              <span class="text-slate-400">📋 <span class="text-white">{{ s.tasks_reviewed }}</span> tasks</span>
              <span class="text-slate-400">🚧 <span class="text-white">{{ s.blockers_count }}</span> blockers</span>
            </div>
          </div>
          <p class="text-sm text-slate-300 leading-relaxed">{{ s.summary }}</p>
        </div>
      </div>
    </div>

    <!-- Log standup modal -->
    <div v-if="showForm" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div class="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-semibold text-white">Log Standup</h2>
          <button @click="showForm = false" class="text-slate-500 hover:text-slate-300 text-xl">&times;</button>
        </div>
        <div class="space-y-3">
          <div>
            <label class="text-xs text-slate-400 block mb-1">Summary *</label>
            <textarea v-model="form.summary" rows="4" placeholder="What was discussed? What's everyone working on?" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white resize-none"></textarea>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-slate-400 block mb-1">Tasks Reviewed</label>
              <input v-model.number="form.tasks_reviewed" type="number" min="0" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label class="text-xs text-slate-400 block mb-1">Blockers Raised</label>
              <input v-model.number="form.blockers_count" type="number" min="0" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-5">
          <button @click="showForm = false" class="btn-secondary">Cancel</button>
          <button @click="submit" class="btn-primary">Log Standup</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useMainStore } from '../stores/main'

const store = useMainStore()
const showForm = ref(false)
const form = ref({ summary: '', tasks_reviewed: 0, blockers_count: 0 })
const standups = computed(() => store.standups)

function formatDate(d) {
  return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

async function submit() {
  if (!form.value.summary.trim()) return
  await store.createStandup(form.value)
  await store.fetchStandups()
  showForm.value = false
  form.value = { summary: '', tasks_reviewed: 0, blockers_count: 0 }
}

onMounted(() => store.fetchStandups())
</script>
