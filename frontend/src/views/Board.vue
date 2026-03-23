<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-white">Board</h1>
      <div class="flex items-center gap-3">
        <select v-model="filterAgent" class="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300">
          <option value="">All Agents</option>
          <option v-for="a in store.agents" :key="a.id" :value="a.id">{{ a.emoji }} {{ a.name }}</option>
        </select>
        <button @click="showNewTask = true" class="btn-primary">+ New Task</button>
      </div>
    </div>

    <!-- Kanban columns -->
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <div v-for="col in columns" :key="col.status" class="bg-slate-900 border border-slate-800 rounded-xl p-3">
        <!-- Column header -->
        <div class="flex items-center gap-2 mb-3">
          <span class="text-base">{{ col.icon }}</span>
          <span class="font-semibold text-sm text-slate-300">{{ col.label }}</span>
          <span class="ml-auto bg-slate-800 text-slate-400 text-xs px-2 py-0.5 rounded-full">{{ colTasks(col.status).length }}</span>
        </div>
        <!-- Tasks -->
        <div class="space-y-2 min-h-16">
          <div
            v-for="task in colTasks(col.status)"
            :key="task.id"
            @click="openTask(task)"
            class="bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 rounded-lg p-3 cursor-pointer transition-colors"
          >
            <div class="flex items-start justify-between gap-1 mb-1.5">
              <span class="text-xs text-slate-500 font-mono">{{ task.task_id }}</span>
              <span class="badge" :class="priorityClass(task.priority)">{{ task.priority }}</span>
            </div>
            <div class="text-sm text-white font-medium leading-snug mb-2">{{ task.title }}</div>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5 text-xs text-slate-400">
                <span>{{ task.agent_emoji }}</span>
                <span>{{ task.agent_name }}</span>
              </div>
              <span v-if="task.effort" class="badge bg-slate-700 text-slate-300">{{ task.effort }}</span>
            </div>
            <div v-if="task.repo" class="mt-1.5 text-xs text-slate-500 font-mono truncate">{{ task.repo }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Task detail/edit modal -->
    <div v-if="selectedTask" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div class="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6">
        <div class="flex items-center justify-between mb-4">
          <span class="text-xs text-slate-500 font-mono">{{ selectedTask.task_id }}</span>
          <button @click="selectedTask = null" class="text-slate-500 hover:text-slate-300 text-xl leading-none">&times;</button>
        </div>
        <div class="space-y-3">
          <div>
            <label class="text-xs text-slate-400 block mb-1">Title</label>
            <input v-model="editForm.title" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label class="text-xs text-slate-400 block mb-1">Description</label>
            <textarea v-model="editForm.description" rows="2" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white resize-none"></textarea>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-slate-400 block mb-1">Status</label>
              <select v-model="editForm.status" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
                <option value="backlog">Backlog</option>
                <option value="active">Active</option>
                <option value="review">In Review</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div>
              <label class="text-xs text-slate-400 block mb-1">Priority</label>
              <select v-model="editForm.priority" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-slate-400 block mb-1">Agent</label>
              <select v-model="editForm.agent_id" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
                <option v-for="a in store.agents" :key="a.id" :value="a.id">{{ a.emoji }} {{ a.name }}</option>
              </select>
            </div>
            <div>
              <label class="text-xs text-slate-400 block mb-1">Effort</label>
              <select v-model="editForm.effort" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
                <option value="">–</option>
                <option value="XS">XS</option>
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
                <option value="XL">XL</option>
              </select>
            </div>
          </div>
          <div>
            <label class="text-xs text-slate-400 block mb-1">Repo</label>
            <input v-model="editForm.repo" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
          </div>
        </div>
        <div class="flex justify-between mt-5">
          <button @click="deleteTask" class="text-red-400 hover:text-red-300 text-sm">Delete</button>
          <div class="flex gap-2">
            <button @click="selectedTask = null" class="btn-secondary">Cancel</button>
            <button @click="saveTask" class="btn-primary">Save</button>
          </div>
        </div>
      </div>
    </div>

    <!-- New task modal -->
    <div v-if="showNewTask" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div class="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-semibold text-white">New Task</h2>
          <button @click="showNewTask = false" class="text-slate-500 hover:text-slate-300 text-xl leading-none">&times;</button>
        </div>
        <div class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-slate-400 block mb-1">Task ID *</label>
              <input v-model="newForm.task_id" placeholder="T-011" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label class="text-xs text-slate-400 block mb-1">Priority</label>
              <select v-model="newForm.priority" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div>
            <label class="text-xs text-slate-400 block mb-1">Title *</label>
            <input v-model="newForm.title" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label class="text-xs text-slate-400 block mb-1">Description</label>
            <textarea v-model="newForm.description" rows="2" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white resize-none"></textarea>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-slate-400 block mb-1">Agent</label>
              <select v-model="newForm.agent_id" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
                <option value="">Unassigned</option>
                <option v-for="a in store.agents" :key="a.id" :value="a.id">{{ a.emoji }} {{ a.name }}</option>
              </select>
            </div>
            <div>
              <label class="text-xs text-slate-400 block mb-1">Status</label>
              <select v-model="newForm.status" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
                <option value="backlog">Backlog</option>
                <option value="active">Active</option>
                <option value="review">In Review</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>
          <div>
            <label class="text-xs text-slate-400 block mb-1">Repo</label>
            <input v-model="newForm.repo" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-5">
          <button @click="showNewTask = false" class="btn-secondary">Cancel</button>
          <button @click="createTask" class="btn-primary">Create Task</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useMainStore } from '../stores/main'

const store = useMainStore()
const filterAgent = ref('')
const selectedTask = ref(null)
const showNewTask = ref(false)
const editForm = ref({})
const newForm = ref({ task_id: '', title: '', description: '', status: 'backlog', priority: 'medium', agent_id: '', repo: '' })

const columns = [
  { status: 'backlog', label: 'Backlog', icon: '📥' },
  { status: 'active', label: 'Active', icon: '⚡' },
  { status: 'review', label: 'In Review', icon: '🔍' },
  { status: 'done', label: 'Done', icon: '✅' },
]

const filteredTasks = computed(() => {
  if (!filterAgent.value) return store.tasks
  return store.tasks.filter(t => t.agent_id == filterAgent.value)
})

function colTasks(status) {
  return filteredTasks.value.filter(t => t.status === status)
}

function priorityClass(p) {
  return {
    critical: 'bg-red-900 text-red-300',
    high: 'bg-orange-900 text-orange-300',
    medium: 'bg-yellow-900 text-yellow-300',
    low: 'bg-slate-700 text-slate-300',
  }[p] || 'bg-slate-700 text-slate-300'
}

function openTask(task) {
  selectedTask.value = task
  editForm.value = { ...task }
}

async function saveTask() {
  await store.updateTask(selectedTask.value.id, editForm.value)
  await Promise.all([store.fetchTasks(), store.fetchStats()])
  selectedTask.value = null
}

async function deleteTask() {
  if (!confirm('Delete this task?')) return
  await store.deleteTask(selectedTask.value.id)
  await Promise.all([store.fetchTasks(), store.fetchStats()])
  selectedTask.value = null
}

async function createTask() {
  if (!newForm.value.task_id || !newForm.value.title) return alert('Task ID and title required')
  await store.createTask({
    ...newForm.value,
    sprint_id: store.currentSprint?.id,
    agent_id: newForm.value.agent_id || null,
  })
  await Promise.all([store.fetchTasks(), store.fetchStats()])
  showNewTask.value = false
  newForm.value = { task_id: '', title: '', description: '', status: 'backlog', priority: 'medium', agent_id: '', repo: '' }
}

onMounted(() => store.fetchTasks())
</script>
