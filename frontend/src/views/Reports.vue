<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-white">Reports</h1>
        <p class="text-sm text-slate-400 mt-0.5">All agency reports with original ask and full output</p>
      </div>
      <button @click="openForm()" class="btn-primary">+ New Report</button>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-3">
      <input
        v-model="search"
        @input="doSearch"
        type="text"
        placeholder="Search reports, asks, content…"
        class="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 w-64 focus:outline-none focus:border-indigo-500"
      />
      <select v-model="filterType" @change="doSearch" class="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
        <option value="">All Types</option>
        <option v-for="t in reportTypes" :key="t" :value="t">{{ t }}</option>
      </select>
      <select v-model="filterProject" @change="doSearch" class="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
        <option value="">All Projects</option>
        <option v-for="p in projectList" :key="p" :value="p">{{ p }}</option>
      </select>
      <button v-if="search || filterType || filterProject" @click="clearFilters" class="text-xs text-slate-400 hover:text-white px-2">✕ Clear</button>
    </div>

    <!-- Empty state -->
    <div v-if="filtered.length === 0" class="card text-center py-16">
      <div class="text-4xl mb-3">📄</div>
      <div class="text-slate-400 text-sm">No reports yet. Create the first one.</div>
    </div>

    <!-- Reports list -->
    <div v-else class="space-y-3">
      <div
        v-for="r in filtered"
        :key="r.id"
        class="card hover:border-slate-600 cursor-pointer transition-colors group"
        @click="openDetail(r)"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <!-- Title + badges -->
            <div class="flex items-center gap-2 flex-wrap mb-1">
              <span class="text-white font-semibold text-sm">{{ r.title }}</span>
              <span class="text-xs px-2 py-0.5 rounded-full font-medium" :class="typeBadge(r.type)">{{ r.type }}</span>
              <span v-if="r.project" class="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">{{ r.project }}</span>
            </div>
            <!-- The Ask -->
            <div class="flex items-start gap-1.5 mb-2">
              <span class="text-xs text-indigo-400 font-medium shrink-0 mt-0.5">Ask:</span>
              <p class="text-xs text-slate-300 leading-relaxed line-clamp-2">{{ r.the_ask }}</p>
            </div>
            <!-- Meta -->
            <div class="flex items-center gap-3 text-xs text-slate-500">
              <span v-if="r.agent_emoji">{{ r.agent_emoji }} {{ r.agent_name || r.generated_by }}</span>
              <span v-else-if="r.generated_by">🤖 {{ r.generated_by }}</span>
              <span>{{ formatDate(r.created_at) }}</span>
            </div>
          </div>
          <!-- Arrow -->
          <div class="text-slate-600 group-hover:text-slate-300 transition-colors text-lg self-center">›</div>
        </div>
      </div>
    </div>

    <!-- Detail Modal -->
    <div v-if="detail" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" @click.self="detail = null">
      <div class="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <!-- Modal header -->
        <div class="flex items-start justify-between p-6 border-b border-slate-800">
          <div class="flex-1 min-w-0 pr-4">
            <div class="flex items-center gap-2 flex-wrap mb-1">
              <span class="text-xs px-2 py-0.5 rounded-full font-medium" :class="typeBadge(detail.type)">{{ detail.type }}</span>
              <span v-if="detail.project" class="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">{{ detail.project }}</span>
            </div>
            <h2 class="text-lg font-bold text-white">{{ detail.title }}</h2>
            <div class="flex items-start gap-1.5 mt-1">
              <span class="text-xs text-indigo-400 font-medium shrink-0 mt-0.5">Ask:</span>
              <p class="text-xs text-slate-300 leading-relaxed">{{ detail.the_ask }}</p>
            </div>
            <div class="flex items-center gap-3 text-xs text-slate-500 mt-2">
              <span v-if="detail.agent_emoji">{{ detail.agent_emoji }} {{ detail.agent_name || detail.generated_by }}</span>
              <span v-else-if="detail.generated_by">🤖 {{ detail.generated_by }}</span>
              <span>{{ formatDate(detail.created_at) }}</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button @click="confirmDelete(detail)" class="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-950 transition-colors">Delete</button>
            <button @click="detail = null" class="text-slate-500 hover:text-slate-300 text-2xl leading-none">&times;</button>
          </div>
        </div>
        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-6">
          <pre class="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">{{ detail.content }}</pre>
        </div>
      </div>
    </div>

    <!-- Create/Edit Form Modal -->
    <div v-if="showForm" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" @click.self="showForm = false">
      <div class="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div class="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 class="font-semibold text-white">New Report</h2>
          <button @click="showForm = false" class="text-slate-500 hover:text-slate-300 text-2xl leading-none">&times;</button>
        </div>
        <div class="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label class="text-xs text-slate-400 block mb-1">Title *</label>
            <input v-model="form.title" type="text" placeholder="e.g. Code Review — AzhaApi Feature-SubProducts" class="input-field" />
          </div>
          <div>
            <label class="text-xs text-slate-400 block mb-1">The Ask * <span class="text-slate-500">(your original request)</span></label>
            <textarea v-model="form.the_ask" rows="2" placeholder="e.g. Review the Feature-SubProducts branch for bugs and code quality issues" class="input-field resize-none"></textarea>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-xs text-slate-400 block mb-1">Type *</label>
              <select v-model="form.type" class="input-field">
                <option value="">Select type…</option>
                <option v-for="t in reportTypes" :key="t" :value="t">{{ t }}</option>
              </select>
            </div>
            <div>
              <label class="text-xs text-slate-400 block mb-1">Project</label>
              <input v-model="form.project" type="text" placeholder="e.g. AzhaApi" class="input-field" />
            </div>
          </div>
          <div>
            <label class="text-xs text-slate-400 block mb-1">Generated By</label>
            <select v-model="form.agent_id" class="input-field">
              <option value="">Select agent…</option>
              <option v-for="a in store.agents" :key="a.id" :value="a.id">{{ a.emoji }} {{ a.name }}</option>
            </select>
          </div>
          <div>
            <label class="text-xs text-slate-400 block mb-1">Report Content *</label>
            <textarea v-model="form.content" rows="10" placeholder="Paste the full report output here…" class="input-field resize-y font-mono text-xs"></textarea>
          </div>
        </div>
        <div class="flex justify-end gap-2 p-6 border-t border-slate-800">
          <button @click="showForm = false" class="btn-secondary">Cancel</button>
          <button @click="submit" :disabled="submitting" class="btn-primary">{{ submitting ? 'Saving…' : 'Save Report' }}</button>
        </div>
      </div>
    </div>

    <!-- Delete confirm -->
    <div v-if="deleteTarget" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div class="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm">
        <h3 class="font-semibold text-white mb-2">Delete Report?</h3>
        <p class="text-sm text-slate-400 mb-5">This will permanently delete <span class="text-white">{{ deleteTarget.title }}</span>. Cannot be undone.</p>
        <div class="flex justify-end gap-2">
          <button @click="deleteTarget = null" class="btn-secondary">Cancel</button>
          <button @click="doDelete" class="bg-red-600 hover:bg-red-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useMainStore } from '../stores/main'

const store = useMainStore()

const search = ref('')
const filterType = ref('')
const filterProject = ref('')
const detail = ref(null)
const showForm = ref(false)
const submitting = ref(false)
const deleteTarget = ref(null)

const reportTypes = ['Code Review', 'BRD', 'PRD', 'Sprint Summary', 'Task Breakdown', 'MR Report', 'Architecture', 'Security Audit', 'Bug Report', 'Other']

const form = ref({
  title: '',
  the_ask: '',
  type: '',
  project: '',
  agent_id: '',
  content: '',
})

const filtered = computed(() => {
  let list = store.reports
  if (filterType.value)    list = list.filter(r => r.type === filterType.value)
  if (filterProject.value) list = list.filter(r => r.project === filterProject.value)
  if (search.value) {
    const s = search.value.toLowerCase()
    list = list.filter(r =>
      r.title.toLowerCase().includes(s) ||
      r.the_ask.toLowerCase().includes(s) ||
      (r.content || '').toLowerCase().includes(s)
    )
  }
  return list
})

const projectList = computed(() => {
  const set = new Set(store.reports.map(r => r.project).filter(Boolean))
  return [...set].sort()
})

function typeBadge(type) {
  const map = {
    'Code Review':     'bg-blue-900/60 text-blue-300',
    'BRD':             'bg-purple-900/60 text-purple-300',
    'PRD':             'bg-violet-900/60 text-violet-300',
    'Sprint Summary':  'bg-green-900/60 text-green-300',
    'Task Breakdown':  'bg-yellow-900/60 text-yellow-300',
    'MR Report':       'bg-teal-900/60 text-teal-300',
    'Architecture':    'bg-cyan-900/60 text-cyan-300',
    'Security Audit':  'bg-red-900/60 text-red-300',
    'Bug Report':      'bg-orange-900/60 text-orange-300',
  }
  return map[type] || 'bg-slate-800 text-slate-300'
}

function formatDate(d) {
  return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function doSearch() {
  // filtering is handled by computed, but keep this for future debounce
}

function clearFilters() {
  search.value = ''
  filterType.value = ''
  filterProject.value = ''
}

function openDetail(r) {
  detail.value = r
}

function openForm() {
  form.value = { title: '', the_ask: '', type: '', project: '', agent_id: '', content: '' }
  showForm.value = true
}

async function submit() {
  if (!form.value.title || !form.value.the_ask || !form.value.type || !form.value.content) return
  submitting.value = true
  try {
    await store.createReport({
      ...form.value,
      agent_id: form.value.agent_id || null,
    })
    await store.fetchReports()
    showForm.value = false
  } finally {
    submitting.value = false
  }
}

function confirmDelete(r) {
  deleteTarget.value = r
  detail.value = null
}

async function doDelete() {
  await store.deleteReport(deleteTarget.value.id)
  await store.fetchReports()
  deleteTarget.value = null
}

onMounted(() => store.fetchReports())
</script>

<style scoped>
.input-field {
  @apply w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500;
}
.btn-primary {
  @apply bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors;
}
.btn-secondary {
  @apply bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium px-4 py-2 rounded-lg transition-colors;
}
</style>
