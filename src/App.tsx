import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  Circle,
  CircleHelp,
  ClipboardCheck,
  Command,
  FileCheck2,
  FilePlus2,
  Flag,
  FolderKanban,
  Layers3,
  LayoutDashboard,
  Link2,
  ListChecks,
  LockKeyhole,
  Moon,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  Sun,
  UserRound,
  X,
  Zap,
} from 'lucide-react'
import type { ActionItem, ActionStatus, AppState, Handoff, HandoffDraft, HandoffHealth, Page } from './model'
import { SOP_ITEMS } from './model'
import { createDemoState, lines, loadState, nextActionId, nextHandoffId, saveState } from './storage'

const emptyDraft = (): HandoffDraft => ({
  project: '',
  summary: '',
  health: 'On track',
  completedWork: '',
  nextSteps: '',
  blockers: '',
  assignee: '',
  dueDate: '',
  links: '',
})

const statusOrder: ActionStatus[] = ['TODO', 'IN PROGRESS', 'DONE', 'BLOCKED']

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

function localDate(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

function formatDate(value: string, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) {
  if (!value) return 'No date set'
  const [year, month, date] = value.split('-').map(Number)
  return new Date(year, month - 1, date, 12).toLocaleDateString('en-US', options)
}

function dueLabel(value: string) {
  if (!value) return 'No due date'
  const today = localDate()
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const nextDay = localDate(tomorrow)
  if (value === today) return 'Due today'
  if (value === nextDay) return 'Tomorrow'
  return formatDate(value)
}

function Avatar({ name, size = 'normal' }: { name: string; size?: 'normal' | 'small' }) {
  const classes = `avatar avatar-${size} avatar-${name.split(' ')[0].toLowerCase()}`
  return <span className={classes} aria-label={name} title={name}>{initials(name)}</span>
}

function HealthBadge({ value }: { value: HandoffHealth }) {
  return <span className={`health-badge health-${value.toLowerCase().replaceAll(' ', '-')}`}><span className="health-dot" />{value}</span>
}

function ActionStatusButton({ action, onCycle, compact = false }: { action: ActionItem; onCycle: (id: string) => void; compact?: boolean }) {
  const readable = action.status === 'TODO' ? 'To do' : action.status.toLowerCase().replace(/^./, (letter) => letter.toUpperCase())
  return (
    <button
      className={`action-status status-${action.status.toLowerCase().replaceAll(' ', '-')} ${compact ? 'status-compact' : ''}`}
      type="button"
      onClick={() => onCycle(action.id)}
      title={`Change status. Current status: ${readable}`}
      aria-label={`${action.title}: ${readable}. Click to change status`}
    >
      {action.status === 'DONE' ? <Check size={12} strokeWidth={2.5} /> : action.status === 'BLOCKED' ? <LockKeyhole size={11} /> : action.status === 'IN PROGRESS' ? <span className="status-spinner" /> : <Circle size={11} />}
      <span>{compact && action.status === 'IN PROGRESS' ? 'In progress' : readable}</span>
      {!compact && <ChevronDown size={12} className="status-chevron" />}
    </button>
  )
}

function App() {
  const [data, setData] = useState<AppState>(loadState)
  const [page, setPage] = useState<Page>('overview')
  const [selectedHandoffId, setSelectedHandoffId] = useState<string | null>(null)
  const [showHandoffForm, setShowHandoffForm] = useState(false)
  const [actionFilter, setActionFilter] = useState<'ALL' | ActionStatus>('ALL')
  const selectedHandoff = data.handoffs.find((handoff) => handoff.id === selectedHandoffId) ?? null

  useEffect(() => saveState(data), [data])
  useEffect(() => {
    document.documentElement.dataset.theme = data.theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', data.theme === 'dark' ? '#171a1c' : '#f6f7f8')
  }, [data.theme])

  const counts = useMemo(() => ({
    activeHandoffs: data.handoffs.filter((handoff) => handoff.state === 'active').length,
    openActions: data.actions.filter((action) => action.status === 'TODO' || action.status === 'IN PROGRESS').length,
    blocked: data.actions.filter((action) => action.status === 'BLOCKED').length,
    completed: data.actions.filter((action) => action.status === 'DONE').length,
  }), [data.handoffs, data.actions])

  const sopDone = SOP_ITEMS.filter((item) => data.sopProgress[item.id]).length
  const sopPercent = Math.round((sopDone / SOP_ITEMS.length) * 100)
  const activeActions = data.actions.filter((action) => action.status !== 'DONE')
  const filteredActions = actionFilter === 'ALL' ? data.actions : data.actions.filter((action) => action.status === actionFilter)
  const currentHandoff = selectedHandoff

  function navigate(nextPage: Page) {
    setSelectedHandoffId(null)
    setPage(nextPage)
  }

  function openHandoff(id: string) {
    setSelectedHandoffId(id)
    setPage('handoffs')
  }

  function cycleAction(id: string) {
    setData((current) => ({
      ...current,
      actions: current.actions.map((action) => {
        if (action.id !== id) return action
        const next = (statusOrder.indexOf(action.status) + 1) % statusOrder.length
        return { ...action, status: statusOrder[next] }
      }),
    }))
  }

  function toggleSop(id: string) {
    setData((current) => ({ ...current, sopProgress: { ...current.sopProgress, [id]: !current.sopProgress[id] } }))
  }

  function toggleTheme() {
    setData((current) => ({ ...current, theme: current.theme === 'light' ? 'dark' : 'light' }))
  }

  function resetDemo() {
    if (window.confirm('Reset FlowDesk to the original demo data? Your local changes will be removed.')) {
      setData(createDemoState())
      navigate('overview')
    }
  }

  function createHandoff(draft: HandoffDraft) {
    const id = nextHandoffId()
    const tasks = lines(draft.nextSteps)
    const newHandoff: Handoff = {
      id,
      project: draft.project.trim(),
      summary: draft.summary.trim(),
      health: draft.health,
      completedWork: lines(draft.completedWork),
      blockers: lines(draft.blockers),
      assignee: draft.assignee.trim(),
      dueDate: draft.dueDate,
      links: lines(draft.links),
      state: 'active',
      createdAt: localDate(),
    }
    const newActions = tasks.map((title) => ({
      id: nextActionId(),
      title,
      assignee: newHandoff.assignee,
      dueDate: newHandoff.dueDate,
      handoffId: id,
      status: 'TODO' as const,
    }))
    setData((current) => ({ ...current, handoffs: [newHandoff, ...current.handoffs], actions: [...newActions, ...current.actions] }))
    setShowHandoffForm(false)
    openHandoff(id)
  }

  const pageLabel = currentHandoff ? 'Handoff details' : {
    overview: 'Overview',
    handoffs: 'Handoffs',
    actions: 'Action items',
    sop: 'SOP checklist',
  }[page]

  return (
    <div className={`app-shell theme-${data.theme}`}>
      <aside className="sidebar">
        <button className="brand" type="button" onClick={() => navigate('overview')} aria-label="FlowDesk home">
          <span className="brand-mark"><span /></span>
          <span className="brand-word">Flow<span>Desk</span></span>
        </button>

        <div className="workspace-switcher">
          <div className="workspace-avatar"><Layers3 size={15} /></div>
          <div className="workspace-copy"><strong>Acme Studio</strong><span>Workspace</span></div>
          <ChevronDown size={14} className="muted-icon" />
        </div>

        <div className="nav-label">WORKSPACE</div>
        <nav className="primary-nav" aria-label="Main navigation">
          <NavItem active={page === 'overview' && !currentHandoff} icon={<LayoutDashboard size={17} />} label="Overview" onClick={() => navigate('overview')} />
          <NavItem active={page === 'handoffs'} icon={<FolderKanban size={17} />} label="Handoffs" count={data.handoffs.length} onClick={() => navigate('handoffs')} />
          <NavItem active={page === 'actions'} icon={<ListChecks size={17} />} label="Action items" count={counts.openActions} onClick={() => navigate('actions')} />
          <NavItem active={page === 'sop'} icon={<ClipboardCheck size={17} />} label="SOP checklist" onClick={() => navigate('sop')} />
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-tip"><span className="tip-icon"><Zap size={14} fill="currentColor" /></span><div><b>Clear work moves forward.</b><p>Good handoffs make room for great work.</p></div></div>
          <button type="button" className="reset-button" onClick={resetDemo}><RotateCcw size={14} />Reset demo data</button>
          <div className="profile-row">
            <Avatar name="Alex Morgan" />
            <span className="profile-copy"><strong>Alex Morgan</strong><small>Personal workspace</small></span>
            <button className="icon-button profile-more" type="button" aria-label="Toggle theme" onClick={toggleTheme}>{data.theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}</button>
          </div>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div className="breadcrumbs"><span>Acme Studio</span><span className="crumb-slash">/</span><strong>{pageLabel}</strong></div>
          <div className="topbar-actions">
            <button type="button" className="search-trigger" aria-label="Search" onClick={() => navigate('actions')}><Search size={15} /><span>Search</span><kbd><Command size={10} /> K</kbd></button>
            <span className="topbar-divider" />
            <button type="button" className="icon-button theme-toggle" aria-label={data.theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'} onClick={toggleTheme}>{data.theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}</button>
            <Avatar name="Alex Morgan" size="small" />
          </div>
        </header>

        <main className="content">
          {currentHandoff ? (
            <HandoffDetail handoff={currentHandoff} actions={data.actions.filter((action) => action.handoffId === currentHandoff.id)} onBack={() => { setSelectedHandoffId(null); setPage('handoffs') }} onCycle={cycleAction} />
          ) : page === 'overview' ? (
            <Dashboard data={data} counts={counts} sopDone={sopDone} sopPercent={sopPercent} activeActions={activeActions} onNew={() => setShowHandoffForm(true)} onNavigate={navigate} onOpenHandoff={openHandoff} onCycle={cycleAction} />
          ) : page === 'handoffs' ? (
            <HandoffsPage handoffs={data.handoffs} actions={data.actions} onNew={() => setShowHandoffForm(true)} onOpen={openHandoff} />
          ) : page === 'actions' ? (
            <ActionsPage actions={filteredActions} allCount={data.actions.length} handoffs={data.handoffs} filter={actionFilter} setFilter={setActionFilter} onCycle={cycleAction} onOpenHandoff={openHandoff} />
          ) : (
            <SopPage progress={data.sopProgress} done={sopDone} percent={sopPercent} onToggle={toggleSop} />
          )}
        </main>
      </div>

      <nav className="mobile-nav" aria-label="Main navigation">
        <MobileNavItem active={page === 'overview' && !currentHandoff} icon={<LayoutDashboard size={19} />} label="Home" onClick={() => navigate('overview')} />
        <MobileNavItem active={page === 'handoffs'} icon={<FolderKanban size={19} />} label="Handoffs" onClick={() => navigate('handoffs')} />
        <MobileNavItem active={page === 'actions'} icon={<ListChecks size={19} />} label="Actions" onClick={() => navigate('actions')} />
        <MobileNavItem active={page === 'sop'} icon={<ClipboardCheck size={19} />} label="Checklist" onClick={() => navigate('sop')} />
      </nav>

      {showHandoffForm && <HandoffForm onClose={() => setShowHandoffForm(false)} onCreate={createHandoff} />}
    </div>
  )
}

function NavItem({ active, icon, label, count, onClick }: { active: boolean; icon: React.ReactNode; label: string; count?: number; onClick: () => void }) {
  return <button type="button" className={`nav-item ${active ? 'nav-active' : ''}`} onClick={onClick}>{icon}<span>{label}</span>{count !== undefined && <small>{count}</small>}</button>
}

function MobileNavItem({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button type="button" className={`mobile-nav-item ${active ? 'mobile-nav-active' : ''}`} onClick={onClick}>{icon}<span>{label}</span></button>
}

function Dashboard({ data, counts, sopDone, sopPercent, activeActions, onNew, onNavigate, onOpenHandoff, onCycle }: {
  data: AppState
  counts: { activeHandoffs: number; openActions: number; blocked: number; completed: number }
  sopDone: number
  sopPercent: number
  activeActions: ActionItem[]
  onNew: () => void
  onNavigate: (page: Page) => void
  onOpenHandoff: (id: string) => void
  onCycle: (id: string) => void
}) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const dateText = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  return (
    <>
      <section className="page-intro dashboard-intro">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" />{dateText.toUpperCase()}</div>
          <h1>{greeting}, Alex<span className="heading-period">.</span></h1>
          <p>Turn messy work into clear next actions.</p>
        </div>
        <button className="primary-button new-handoff-button" onClick={onNew}><Plus size={17} strokeWidth={2.5} />New handoff</button>
      </section>

      <section className="stats-grid" aria-label="Workspace summary">
        <StatCard label="Active handoffs" value={counts.activeHandoffs} icon={<FolderKanban size={16} />} accent="sage" hint="In motion" />
        <StatCard label="Open actions" value={counts.openActions} icon={<ListChecks size={16} />} accent="blue" hint="To keep moving" />
        <StatCard label="Blocked" value={counts.blocked} icon={<CircleHelp size={16} />} accent="amber" hint="Need attention" />
        <StatCard label="Completed" value={counts.completed} icon={<CheckCheck size={16} />} accent="purple" hint="Nicely done" />
      </section>

      <div className="dashboard-grid">
        <section className="panel recent-panel">
          <div className="panel-heading">
            <div><h2>Recent handoffs</h2><p>Pick up right where work left off.</p></div>
            <button type="button" className="text-button" onClick={() => onNavigate('handoffs')}>View all <ArrowRight size={14} /></button>
          </div>
          <div className="handoff-list">
            {data.handoffs.slice(0, 4).map((handoff, index) => (
              <HandoffRow key={handoff.id} handoff={handoff} actionCount={data.actions.filter((action) => action.handoffId === handoff.id && action.status !== 'DONE').length} index={index} onClick={() => onOpenHandoff(handoff.id)} />
            ))}
            {data.handoffs.length === 0 && <EmptyState icon={<FilePlus2 size={20} />} title="A fresh start" copy="Create your first handoff and give the next person a clear place to begin." action={<button className="secondary-button" onClick={onNew}><Plus size={15} />New handoff</button>} />}
          </div>
        </section>

        <aside className="dashboard-side">
          <section className="panel next-actions-panel">
            <div className="panel-heading compact-heading">
              <div><h2>Up next</h2><p>Your next few actions</p></div>
              <button className="round-arrow" aria-label="See all actions" onClick={() => onNavigate('actions')}><ArrowUpRight size={15} /></button>
            </div>
            <div className="up-next-list">
              {activeActions.slice(0, 3).map((action) => {
                const handoff = data.handoffs.find((entry) => entry.id === action.handoffId)
                return (
                  <div className="up-next-item" key={action.id}>
                    <button className="task-check" aria-label={`Change ${action.title} status`} onClick={() => onCycle(action.id)}>{action.status === 'IN PROGRESS' ? <span className="task-in-progress" /> : <Circle size={15} />}</button>
                    <div className="up-next-copy"><strong>{action.title}</strong><span>{handoff?.project ?? 'Unlinked handoff'}</span></div>
                    <span className={`mini-due ${action.dueDate < localDate() ? 'mini-overdue' : ''}`}>{dueLabel(action.dueDate)}</span>
                  </div>
                )
              })}
              {activeActions.length === 0 && <p className="empty-inline">Nothing waiting. Enjoy the breathing room.</p>}
            </div>
            <button className="panel-foot-link" onClick={() => onNavigate('actions')}>Open action list <ArrowRight size={13} /></button>
          </section>

          <button type="button" className="sop-card" onClick={() => onNavigate('sop')}>
            <div className="sop-card-top"><span className="sop-icon"><FileCheck2 size={16} /></span><span className="sop-kicker">PLAYBOOK</span><ArrowUpRight size={15} className="sop-arrow" /></div>
            <strong>Website release checklist</strong>
            <span className="sop-card-desc">A confident launch, every time.</span>
            <div className="sop-progress-meta"><span>{sopDone} / {SOP_ITEMS.length} completed</span><b>{sopPercent}%</b></div>
            <div className="progress-track"><span style={{ width: `${sopPercent}%` }} /></div>
          </button>
        </aside>
      </div>
      <div className="dashboard-footer-note"><span className="tiny-orbit"><span /></span> Keep the context. Pass the work forward.</div>
    </>
  )
}

function StatCard({ label, value, icon, accent, hint }: { label: string; value: number; icon: React.ReactNode; accent: string; hint: string }) {
  return <article className="stat-card"><div className={`stat-icon stat-${accent}`}>{icon}</div><div className="stat-copy"><span>{label}</span><div><strong>{value.toString().padStart(2, '0')}</strong><small>{hint}</small></div></div></article>
}

function HandoffRow({ handoff, actionCount, index, onClick }: { handoff: Handoff; actionCount: number; index: number; onClick: () => void }) {
  const marks = ['W', 'B', 'O', 'P']
  return (
    <button type="button" className="handoff-row" onClick={onClick} style={{ animationDelay: `${index * 45}ms` }}>
      <span className={`project-mark project-mark-${index % 4}`}>{marks[index % 4]}</span>
      <span className="handoff-main"><span className="handoff-title">{handoff.project}</span><span className="handoff-subtitle">{handoff.summary}</span></span>
      <span className="handoff-row-meta"><HealthBadge value={handoff.state === 'completed' ? 'On track' : handoff.health} /><span className="row-action-count"><ListChecks size={12} />{actionCount} open</span></span>
      <span className="handoff-assignee"><Avatar name={handoff.assignee} size="small" /><span>{handoff.assignee.split(' ')[0]}</span></span>
      <span className="row-date"><CalendarDays size={13} />{dueLabel(handoff.dueDate)}</span>
      <ArrowRight size={15} className="row-arrow" />
    </button>
  )
}

function HandoffsPage({ handoffs, actions, onNew, onOpen }: { handoffs: Handoff[]; actions: ActionItem[]; onNew: () => void; onOpen: (id: string) => void }) {
  const active = handoffs.filter((handoff) => handoff.state === 'active')
  const completed = handoffs.filter((handoff) => handoff.state === 'completed')
  return (
    <>
      <section className="page-intro inner-intro">
        <div><div className="eyebrow"><span className="eyebrow-line" />KEEP THE CONTEXT</div><h1>Handoffs<span className="heading-period">.</span></h1><p>Everything the next person needs to keep things moving.</p></div>
        <button className="primary-button" onClick={onNew}><Plus size={17} strokeWidth={2.5} />New handoff</button>
      </section>
      <section className="panel handoffs-page-panel">
        <div className="panel-heading"><div><h2>In progress <span className="heading-count">{active.length.toString().padStart(2, '0')}</span></h2><p>Work that has a next step waiting.</p></div></div>
        <div className="handoff-list">{active.map((handoff, index) => <HandoffRow key={handoff.id} handoff={handoff} actionCount={actions.filter((action) => action.handoffId === handoff.id && action.status !== 'DONE').length} index={index} onClick={() => onOpen(handoff.id)} />)}</div>
        {active.length === 0 && <EmptyState icon={<FolderKanban size={20} />} title="No active handoffs" copy="Everything is in a good place. Start a new handoff when the next one is ready." action={<button className="secondary-button" onClick={onNew}><Plus size={15} />Create handoff</button>} />}
      </section>
      <section className="completed-section">
        <div className="section-title-row"><div><h2>Completed</h2><p>Closed loops and work handed over.</p></div><span className="quiet-count">{completed.length.toString().padStart(2, '0')}</span></div>
        <div className="completed-cards">{completed.map((handoff) => <button className="completed-card" key={handoff.id} onClick={() => onOpen(handoff.id)}><span className="completed-check"><Check size={14} /></span><span className="completed-card-copy"><strong>{handoff.project}</strong><small>{handoff.assignee} · Completed {formatDate(handoff.dueDate)}</small></span><ArrowUpRight size={15} /></button>)}</div>
      </section>
    </>
  )
}

function ActionsPage({ actions, allCount, handoffs, filter, setFilter, onCycle, onOpenHandoff }: { actions: ActionItem[]; allCount: number; handoffs: Handoff[]; filter: 'ALL' | ActionStatus; setFilter: (value: 'ALL' | ActionStatus) => void; onCycle: (id: string) => void; onOpenHandoff: (id: string) => void }) {
  const filters: Array<'ALL' | ActionStatus> = ['ALL', ...statusOrder]
  const labels: Record<string, string> = { ALL: 'All tasks', TODO: 'To do', 'IN PROGRESS': 'In progress', DONE: 'Done', BLOCKED: 'Blocked' }
  return (
    <>
      <section className="page-intro inner-intro">
        <div><div className="eyebrow"><span className="eyebrow-line" />SMALL STEPS, REAL PROGRESS</div><h1>Action items<span className="heading-period">.</span></h1><p>The next clear step is usually the most important one.</p></div>
        <div className="action-head-summary"><strong>{allCount.toString().padStart(2, '0')}</strong><span>total actions</span></div>
      </section>
      <div className="filter-row" role="tablist" aria-label="Filter actions by status">{filters.map((item) => <button key={item} type="button" role="tab" aria-selected={filter === item} className={`filter-chip ${filter === item ? 'filter-active' : ''}`} onClick={() => setFilter(item)}>{labels[item]}{item === 'ALL' && <span>{allCount}</span>}</button>)}</div>
      <section className="panel action-list-panel">
        <div className="action-table-head"><span>Task</span><span>Status</span><span>Owner</span><span>Due date</span><span>Handoff</span></div>
        {actions.length ? actions.map((action, index) => {
          const handoff = handoffs.find((entry) => entry.id === action.handoffId)
          return <ActionCard key={action.id} action={action} handoff={handoff} index={index} onCycle={onCycle} onOpenHandoff={onOpenHandoff} />
        }) : <EmptyState icon={<CheckCircle2 size={21} />} title="No tasks in this view" copy="Try another status filter to see more of your work." />}
      </section>
      <p className="page-footnote"><CircleHelp size={13} />Click any status to move a task through its next state.</p>
    </>
  )
}

function ActionCard({ action, handoff, index, onCycle, onOpenHandoff }: { action: ActionItem; handoff?: Handoff; index: number; onCycle: (id: string) => void; onOpenHandoff: (id: string) => void }) {
  return (
    <article className="action-row-card" style={{ animationDelay: `${index * 35}ms` }}>
      <div className="action-task-cell"><button type="button" className={`task-check action-large-check task-${action.status.toLowerCase().replaceAll(' ', '-')}`} onClick={() => onCycle(action.id)} aria-label={`Change status for ${action.title}`}>{action.status === 'DONE' ? <Check size={14} /> : action.status === 'IN PROGRESS' ? <span className="task-in-progress" /> : <Circle size={16} />}</button><strong>{action.title}</strong></div>
      <div className="action-status-cell"><ActionStatusButton action={action} onCycle={onCycle} compact /></div>
      <div className="action-owner-cell"><Avatar name={action.assignee} size="small" /><span>{action.assignee}</span></div>
      <div className={`action-date-cell ${action.dueDate < localDate() && action.status !== 'DONE' ? 'date-overdue' : ''}`}><CalendarDays size={13} />{dueLabel(action.dueDate)}</div>
      <button type="button" className="action-project-cell" onClick={() => handoff && onOpenHandoff(handoff.id)} disabled={!handoff}><span className="small-project-mark">{handoff?.project.charAt(0) ?? '—'}</span><span>{handoff?.project ?? 'No handoff'}</span><ArrowUpRight size={12} /></button>
    </article>
  )
}

function HandoffDetail({ handoff, actions, onBack, onCycle }: { handoff: Handoff; actions: ActionItem[]; onBack: () => void; onCycle: (id: string) => void }) {
  const doneActions = actions.filter((action) => action.status === 'DONE').length
  return (
    <>
      <button type="button" className="back-link" onClick={onBack}><ArrowLeft size={15} />All handoffs</button>
      <section className="detail-heading">
        <div className="detail-heading-main"><div className="eyebrow"><span className="eyebrow-line" />HANDOFF · {formatDate(handoff.createdAt, { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}</div><div className="detail-title-row"><h1>{handoff.project}<span className="heading-period">.</span></h1><HealthBadge value={handoff.health} /></div><p>{handoff.summary}</p></div>
        <button type="button" className="icon-button more-button" aria-label="More handoff actions"><MoreHorizontal size={19} /></button>
      </section>
      <div className="detail-progress-panel"><div className="detail-progress-copy"><span className="detail-progress-icon"><CheckCheck size={16} /></span><div><strong>{doneActions} of {actions.length} actions complete</strong><small>{actions.length - doneActions === 0 ? 'This handoff is all wrapped up.' : `${actions.length - doneActions} next ${actions.length - doneActions === 1 ? 'step' : 'steps'} still to go`}</small></div></div><div className="detail-progress-track"><span style={{ width: `${actions.length ? Math.round((doneActions / actions.length) * 100) : 0}%` }} /></div><span className="detail-progress-value">{actions.length ? Math.round((doneActions / actions.length) * 100) : 0}%</span></div>

      <div className="detail-layout">
        <div className="detail-main-column">
          <section className="detail-section overview-section"><div className="detail-section-title"><span className="section-icon icon-overview"><Layers3 size={16} /></span><div><h2>Overview</h2><p>Where things stand right now</p></div></div><p className="overview-copy">{handoff.summary}</p></section>
          <section className="detail-section"><div className="detail-section-title"><span className="section-icon icon-actions"><ListChecks size={16} /></span><div><h2>Next actions</h2><p>{actions.length} things left to move forward</p></div><span className="section-counter">{actions.filter((action) => action.status !== 'DONE').length.toString().padStart(2, '0')}</span></div><div className="detail-actions-list">{actions.length ? actions.map((action) => <div className="detail-action" key={action.id}><button type="button" className="task-check" onClick={() => onCycle(action.id)} aria-label={`Change status for ${action.title}`}>{action.status === 'DONE' ? <Check size={14} /> : action.status === 'IN PROGRESS' ? <span className="task-in-progress" /> : <Circle size={15} />}</button><span className={`detail-action-name ${action.status === 'DONE' ? 'task-is-done' : ''}`}>{action.title}</span><Avatar name={action.assignee} size="small" /><span className="detail-action-date">{dueLabel(action.dueDate)}</span><ActionStatusButton action={action} onCycle={onCycle} compact /></div>) : <p className="empty-detail">No next actions were added to this handoff.</p>}</div></section>
          <section className="detail-section"><div className="detail-section-title"><span className="section-icon icon-completed"><CheckCircle2 size={16} /></span><div><h2>Completed</h2><p>Work that is already in good hands</p></div><span className="section-counter">{handoff.completedWork.length.toString().padStart(2, '0')}</span></div><ul className="completed-list">{handoff.completedWork.map((item) => <li key={item}><span className="completed-bullet"><Check size={12} /></span>{item}</li>)}{!handoff.completedWork.length && <li className="empty-detail">No completed work added yet.</li>}</ul></section>
          <section className="detail-section blockers-section"><div className="detail-section-title"><span className="section-icon icon-blocker"><Flag size={15} /></span><div><h2>Blockers</h2><p>Things that could slow the work down</p></div>{handoff.blockers.length > 0 && <span className="blocker-count">{handoff.blockers.length}</span>}</div>{handoff.blockers.length ? <div className="blocker-list">{handoff.blockers.map((blocker) => <p key={blocker}><span className="blocker-dot" />{blocker}</p>)}</div> : <div className="no-blockers"><CheckCircle2 size={15} />Nothing blocking this handoff right now.</div>}</section>
        </div>
        <aside className="detail-aside">
          <section className="detail-meta-card"><h3>Handoff details</h3><div className="detail-meta-row"><span className="meta-icon"><UserRound size={15} /></span><div><small>Owner</small><span className="owner-meta"><Avatar name={handoff.assignee} size="small" />{handoff.assignee}</span></div></div><div className="detail-meta-row"><span className="meta-icon"><CalendarDays size={15} /></span><div><small>Deadline</small><strong>{formatDate(handoff.dueDate, { month: 'long', day: 'numeric', year: 'numeric' })}</strong><span className={`deadline-caption ${handoff.dueDate < localDate() && handoff.state !== 'completed' ? 'date-overdue' : ''}`}>{dueLabel(handoff.dueDate)}</span></div></div><div className="meta-divider" /><div className="links-heading"><span className="meta-icon"><Link2 size={15} /></span><div><small>Links</small><strong>Useful context</strong></div></div><div className="related-links">{handoff.links.map((link) => <a key={link} href={link} target="_blank" rel="noreferrer"><span className="link-symbol"><ArrowUpRight size={12} /></span><span>{link.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span></a>)}{!handoff.links.length && <span className="no-links">No links attached.</span>}</div></section>
          <div className="handoff-quote"><span>“</span><p>A good handoff doesn't just pass a task. It passes the context to do it well.</p><small>THE FLOWDESK WAY</small></div>
        </aside>
      </div>
    </>
  )
}

function SopPage({ progress, done, percent, onToggle }: { progress: Record<string, boolean>; done: number; percent: number; onToggle: (id: string) => void }) {
  return (
    <>
      <section className="page-intro inner-intro sop-intro">
        <div><div className="eyebrow"><span className="eyebrow-line" />A LITTLE LESS TO REMEMBER</div><h1>Release, with confidence<span className="heading-period">.</span></h1><p>The small details that make launch day feel easy.</p></div>
        <div className="sop-round-progress" style={{ '--progress': `${percent}%` } as React.CSSProperties}><div><strong>{percent}%</strong><span>ready</span></div></div>
      </section>
      <section className="sop-checklist-layout">
        <div className="panel sop-checklist-panel">
          <div className="sop-checklist-header"><div className="sop-large-icon"><FileCheck2 size={18} /></div><div><span>WEBSITE RELEASE</span><h2>Launch checklist</h2></div><button type="button" className="icon-button sop-more" aria-label="Checklist info"><MoreHorizontal size={18} /></button></div>
          <div className="sop-progress-line"><span style={{ width: `${percent}%` }} /></div>
          <div className="sop-progress-summary"><strong>{done} / {SOP_ITEMS.length} completed</strong><span>{SOP_ITEMS.length - done ? `${SOP_ITEMS.length - done} steps left` : 'All clear for launch'}</span></div>
          <div className="checklist-items">{SOP_ITEMS.map((item, index) => {
            const checked = Boolean(progress[item.id])
            return <button type="button" key={item.id} className={`checklist-item ${checked ? 'checklist-item-done' : ''}`} onClick={() => onToggle(item.id)} aria-pressed={checked}>
              <span className={`checklist-box ${checked ? 'checklist-box-done' : ''}`}>{checked && <Check size={14} strokeWidth={2.5} />}</span><span className="checklist-step-number">{String(index + 1).padStart(2, '0')}</span><span className="checklist-item-copy"><strong>{item.label}</strong><small>{item.note}</small></span><span className={`checklist-item-state ${checked ? 'state-complete' : ''}`}>{checked ? 'Complete' : 'To do'}</span>
            </button>
          })}</div>
          <div className="checklist-foot"><LockKeyhole size={13} />Your progress is saved automatically on this device.</div>
        </div>
        <aside className="sop-side-note"><span className="note-icon"><Zap size={16} /></span><span className="note-label">A SMALL REMINDER</span><h2>Release day is a team sport.</h2><p>Work through the list together, check off each step, and leave the next person with a launch they can feel good about.</p><div className="note-people"><Avatar name="Maya Chen" size="small" /><Avatar name="Theo James" size="small" /><Avatar name="Jordan Lee" size="small" /><span>Made for sharing</span></div></aside>
      </section>
    </>
  )
}

function HandoffForm({ onClose, onCreate }: { onClose: () => void; onCreate: (draft: HandoffDraft) => void }) {
  const [draft, setDraft] = useState<HandoffDraft>(emptyDraft)
  const [error, setError] = useState('')
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    document.body.classList.add('modal-open')
    return () => { window.removeEventListener('keydown', onKey); document.body.classList.remove('modal-open') }
  }, [onClose])

  function update<K extends keyof HandoffDraft>(key: K, value: HandoffDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!lines(draft.nextSteps).length) {
      setError('Add at least one next action so the handoff has a clear starting point.')
      document.getElementById('next-steps')?.focus()
      return
    }
    setError('')
    onCreate(draft)
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="handoff-modal" role="dialog" aria-modal="true" aria-labelledby="handoff-modal-title">
        <div className="modal-header"><div><span className="modal-kicker"><span className="modal-kicker-mark" />A BETTER HANDOFF STARTS HERE</span><h2 id="handoff-modal-title">New handoff</h2><p>Capture the context. Make the next step obvious.</p></div><button className="icon-button modal-close" type="button" onClick={onClose} aria-label="Close form"><X size={18} /></button></div>
        <form className="handoff-form" onSubmit={submit}>
          <div className="form-section-label"><span>01</span>THE WORK</div>
          <label className="form-field"><span>Project / work name <b>*</b></span><input autoFocus required maxLength={100} value={draft.project} onChange={(event) => update('project', event.target.value)} placeholder="e.g. Website release" /></label>
          <div className="form-field-grid"><label className="form-field"><span>Current status</span><select value={draft.health} onChange={(event) => update('health', event.target.value as HandoffHealth)}><option>On track</option><option>Needs attention</option><option>At risk</option></select></label><label className="form-field"><span>Assignee <b>*</b></span><input required maxLength={80} value={draft.assignee} onChange={(event) => update('assignee', event.target.value)} placeholder="Who is taking this over?" /></label></div>
          <label className="form-field"><span>Where things stand <b>*</b></span><textarea required rows={3} maxLength={800} value={draft.summary} onChange={(event) => update('summary', event.target.value)} placeholder="A few sentences to bring the next person up to speed..." /></label>

          <div className="form-section-label form-section-spaced"><span>02</span>THE HANDOFF</div>
          <div className="form-field-grid"><ListField label="Completed work" value={draft.completedWork} placeholder={'Shipped the new homepage\nFinished the mobile pass'} onChange={(value) => update('completedWork', value)} rows={3} /><ListField id="next-steps" label="Next steps" required value={draft.nextSteps} placeholder={'Run the production smoke test\nGet final sign-off'} onChange={(value) => update('nextSteps', value)} rows={3} /></div>
          <div className="form-field-grid"><ListField label="Blockers" value={draft.blockers} placeholder={'Waiting on final legal approval'} onChange={(value) => update('blockers', value)} rows={2} /><label className="form-field"><span>Deadline</span><input type="date" value={draft.dueDate} onChange={(event) => update('dueDate', event.target.value)} min={localDate()} /><small className="field-helper"><CalendarDays size={12} />One date for the handoff and new actions.</small></label></div>
          <ListField label="Related links" value={draft.links} placeholder={'https://...'} onChange={(value) => update('links', value)} rows={2} />
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="form-footer"><span><LockKeyhole size={12} />Saved to this device</span><div><button className="secondary-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit"><FilePlus2 size={15} />Generate handoff</button></div></div>
        </form>
      </section>
    </div>
  )
}

function ListField({ id, label, value, placeholder, onChange, rows = 3, required = false }: { id?: string; label: string; value: string; placeholder: string; onChange: (value: string) => void; rows?: number; required?: boolean }) {
  return <label className="form-field"><span>{label}{required && <b> *</b>}</span><textarea id={id} rows={rows} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /><small className="field-helper"><span className="bullet-hint">↵</span>One item per line</small></label>
}

function EmptyState({ icon, title, copy, action }: { icon: React.ReactNode; title: string; copy: string; action?: React.ReactNode }) {
  return <div className="empty-state"><span className="empty-state-icon">{icon}</span><strong>{title}</strong><p>{copy}</p>{action}</div>
}

export default App
