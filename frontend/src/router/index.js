import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import Board from '../views/Board.vue'
import AgentPage from '../views/AgentPage.vue'
import Standups from '../views/Standups.vue'
import Mistakes from '../views/Mistakes.vue'

const routes = [
  { path: '/', component: Dashboard },
  { path: '/board', component: Board },
  { path: '/agents/:id', component: AgentPage },
  { path: '/standups', component: Standups },
  { path: '/mistakes', component: Mistakes },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
