import type { ActionItem, AppState, Handoff, HandoffHealth, HandoffState } from './model'

const KEYS = {
  handoffs: 'flowdesk:handoffs:v1',
  actions: 'flowdesk:actions:v1',
  sop: 'flowdesk:sop-progress:v1',
  theme: 'flowdesk:theme:v1',
}

const day = (offset: number) => {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + offset)
  return date.toISOString().slice(0, 10)
}

export function createDemoState(): AppState {
  const handoffs: Handoff[] = [
    {
      id: 'handoff-website',
      project: 'Website release',
      summary: 'The new marketing site is in staging and ready for the final production checks. The responsive pass is complete; the remaining work is release sign-off and verification.',
      health: 'On track',
      completedWork: ['Merged the new homepage and pricing pages', 'Finished mobile layout and accessibility pass', 'Shared the release candidate with Growth'],
      blockers: ['Waiting on final legal approval for the customer quote on the homepage.'],
      assignee: 'Maya Chen',
      dueDate: day(2),
      links: ['https://example.com/preview/website-release', 'https://example.com/docs/release-notes'],
      state: 'active',
      createdAt: day(-1),
    },
    {
      id: 'handoff-billing',
      project: 'Billing migration',
      summary: 'The account migration is complete for the first customer cohort. Support has the updated response guide and the remaining batch is queued for review.',
      health: 'Needs attention',
      completedWork: ['Migrated 42 pilot accounts', 'Reconciled invoices against the legacy export'],
      blockers: ['Finance needs to confirm the revised credit note before the next cohort starts.'],
      assignee: 'Theo James',
      dueDate: day(1),
      links: ['https://example.com/docs/billing-migration'],
      state: 'active',
      createdAt: day(-2),
    },
    {
      id: 'handoff-onboarding',
      project: 'Customer onboarding',
      summary: 'The onboarding playbook is ready for the Customer Success team. The new welcome flow and support macros are documented and shared.',
      health: 'On track',
      completedWork: ['Published the first-week onboarding guide', 'Added support macros for common setup questions', 'Walked the team through the new welcome flow'],
      blockers: [],
      assignee: 'Jordan Lee',
      dueDate: day(-1),
      links: ['https://example.com/docs/onboarding-playbook'],
      state: 'completed',
      createdAt: day(-4),
    },
  ]

  const actions: ActionItem[] = [
    { id: 'action-website-vars', title: 'Confirm production environment variables', assignee: 'Maya Chen', dueDate: day(2), handoffId: 'handoff-website', status: 'TODO' },
    { id: 'action-website-smoke', title: 'Run the final mobile smoke test', assignee: 'Theo James', dueDate: day(1), handoffId: 'handoff-website', status: 'IN PROGRESS' },
    { id: 'action-billing-credit', title: 'Get approval on the revised credit note', assignee: 'Maya Chen', dueDate: day(1), handoffId: 'handoff-billing', status: 'BLOCKED' },
    { id: 'action-onboarding-macros', title: 'Share the updated support macros', assignee: 'Jordan Lee', dueDate: day(-1), handoffId: 'handoff-onboarding', status: 'DONE' },
    { id: 'action-billing-qa', title: 'Review the next migration cohort', assignee: 'Theo James', dueDate: day(3), handoffId: 'handoff-billing', status: 'TODO' },
  ]

  return {
    handoffs,
    actions,
    sopProgress: { mobile: true, links: true, environment: true, build: true, deploy: false, verify: false },
    theme: 'light',
  }
}

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw === null ? fallback : JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function loadState(): AppState {
  const demo = createDemoState()
  return {
    handoffs: safeRead<Handoff[]>(KEYS.handoffs, demo.handoffs),
    actions: safeRead<ActionItem[]>(KEYS.actions, demo.actions),
    sopProgress: safeRead<Record<string, boolean>>(KEYS.sop, demo.sopProgress),
    theme: safeRead<'light' | 'dark'>(KEYS.theme, demo.theme) === 'dark' ? 'dark' : 'light',
  }
}

export function saveState(state: AppState) {
  try {
    window.localStorage.setItem(KEYS.handoffs, JSON.stringify(state.handoffs))
    window.localStorage.setItem(KEYS.actions, JSON.stringify(state.actions))
    window.localStorage.setItem(KEYS.sop, JSON.stringify(state.sopProgress))
    window.localStorage.setItem(KEYS.theme, JSON.stringify(state.theme))
  } catch {
    // The app remains usable if browser storage is disabled or full.
  }
}

export function lines(value: string) {
  return value.split('\n').map((line) => line.replace(/^\s*[-•]\s*/, '').trim()).filter(Boolean)
}

export function nextHandoffId() {
  return `handoff-${Date.now().toString(36)}`
}

export function nextActionId() {
  return `action-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function isHandoffHealth(value: unknown): value is HandoffHealth {
  return value === 'On track' || value === 'Needs attention' || value === 'At risk'
}

export function isHandoffState(value: unknown): value is HandoffState {
  return value === 'active' || value === 'completed'
}
