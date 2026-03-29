import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

const API = '/api'

export const useMainStore = defineStore('main', () => {
  const stats = ref(null)
  const agents = ref([])
  const tasks = ref([])
  const sprints = ref([])
  const blockers = ref([])
  const standups = ref([])
  const mistakes = ref([])
  const activity = ref([])
  const reports = ref([])
  const currentSprint = computed(() => sprints.value.find(s => s.status === 'active') || sprints.value[0])

  async function fetchStats() {
    const { data } = await axios.get(`${API}/stats`)
    stats.value = data
    return data
  }

  async function fetchAgents() {
    const { data } = await axios.get(`${API}/agents`)
    agents.value = data
    return data
  }

  async function fetchTasks(params = {}) {
    const { data } = await axios.get(`${API}/tasks`, { params })
    tasks.value = data
    return data
  }

  async function fetchSprints() {
    const { data } = await axios.get(`${API}/sprints`)
    sprints.value = data
    return data
  }

  async function fetchBlockers() {
    const { data } = await axios.get(`${API}/blockers`)
    blockers.value = data
    return data
  }

  async function fetchStandups() {
    const { data } = await axios.get(`${API}/standups`)
    standups.value = data
    return data
  }

  async function fetchMistakes(params = {}) {
    const { data } = await axios.get(`${API}/mistakes`, { params })
    mistakes.value = data
    return data
  }

  async function fetchActivity() {
    const { data } = await axios.get(`${API}/activity`)
    activity.value = data
    return data
  }

  async function createTask(payload) {
    const { data } = await axios.post(`${API}/tasks`, payload)
    return data
  }

  async function updateTask(id, payload) {
    const { data } = await axios.put(`${API}/tasks/${id}`, payload)
    return data
  }

  async function deleteTask(id) {
    await axios.delete(`${API}/tasks/${id}`)
  }

  async function createBlocker(payload) {
    const { data } = await axios.post(`${API}/blockers`, payload)
    return data
  }

  async function resolveBlocker(id) {
    const { data } = await axios.put(`${API}/blockers/${id}/resolve`)
    return data
  }

  async function createStandup(payload) {
    const { data } = await axios.post(`${API}/standups`, payload)
    return data
  }

  async function createMistake(payload) {
    const { data } = await axios.post(`${API}/mistakes`, payload)
    return data
  }

  async function fetchReports(params = {}) {
    const { data } = await axios.get(`${API}/reports`, { params })
    reports.value = data
    return data
  }

  async function fetchReport(id) {
    const { data } = await axios.get(`${API}/reports/${id}`)
    return data
  }

  async function createReport(payload) {
    const { data } = await axios.post(`${API}/reports`, payload)
    return data
  }

  async function deleteReport(id) {
    await axios.delete(`${API}/reports/${id}`)
  }

  return {
    stats, agents, tasks, sprints, blockers, standups, mistakes, activity, reports, currentSprint,
    fetchStats, fetchAgents, fetchTasks, fetchSprints, fetchBlockers,
    fetchStandups, fetchMistakes, fetchActivity,
    fetchReports, fetchReport, createReport, deleteReport,
    createTask, updateTask, deleteTask,
    createBlocker, resolveBlocker, createStandup, createMistake,
  }
})
