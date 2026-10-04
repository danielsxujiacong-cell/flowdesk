export type HandoffHealth = 'On track' | 'Needs attention' | 'At risk'
export type HandoffState = 'active' | 'completed'
export type ActionStatus = 'TODO' | 'IN PROGRESS' | 'DONE' | 'BLOCKED'
export type Page = 'overview' | 'handoffs' | 'actions' | 'sop'

export interface Handoff {
  id: string
  project: string
  summary: string
  health: HandoffHealth
  completedWork: string[]
  blockers: string[]
  assignee: string
  dueDate: string
  links: string[]
  state: HandoffState
  createdAt: string
}

export interface ActionItem {
  id: string
  title: string
  assignee: string
  dueDate: string
  handoffId: string
  status: ActionStatus
}

export interface AppState {
  handoffs: Handoff[]
  actions: ActionItem[]
  sopProgress: Record<string, boolean>
  theme: 'light' | 'dark'
}

export interface HandoffDraft {
  project: string
  summary: string
  health: HandoffHealth
  completedWork: string
  nextSteps: string
  blockers: string
  assignee: string
  dueDate: string
  links: string
}

export const SOP_ITEMS = [
  { id: 'mobile', label: 'Mobile responsive check', note: 'Check the latest iOS and Android breakpoints' },
  { id: 'links', label: 'Broken links check', note: 'Test navigation, footer, and campaign links' },
  { id: 'environment', label: 'Production environment variables', note: 'Confirm keys and production values are current' },
  { id: 'build', label: 'Build test', note: 'Create a clean production build' },
  { id: 'deploy', label: 'Deploy', note: 'Publish the approved release' },
  { id: 'verify', label: 'Production verification', note: 'Smoke test the live site after deploy' },
] as const
