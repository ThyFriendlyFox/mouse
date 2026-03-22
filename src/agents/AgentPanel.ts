import { Agent } from './Agent.ts'

export class AgentPanel {
  el: HTMLElement
  private agents: Agent[] = []
  private expandedId: string | null = null
  private rowEls = new Map<string, HTMLElement>()

  constructor() {
    this.el = document.createElement('div')
    this.el.className = 'agents-panel'
  }

  addAgent(agent: Agent) {
    this.agents.push(agent)
    const row = this.makeRow(agent)
    this.rowEls.set(agent.id, row)
    this.el.appendChild(row)
    agent.onChange(() => this.updateRow(agent))
  }

  get count() { return this.agents.length }

  private makeRow(agent: Agent): HTMLElement {
    const row = document.createElement('div')
    row.className = 'agent-row'
    row.dataset.id = agent.id

    row.innerHTML = this.rowHTML(agent)

    row.addEventListener('click', () => {
      const isExpanded = row.classList.contains('expanded')
      this.el.querySelectorAll('.agent-row').forEach(r => r.classList.remove('expanded'))
      if (!isExpanded) {
        row.classList.add('expanded')
        this.expandedId = agent.id
      } else {
        this.expandedId = null
      }
    })

    return row
  }

  private rowHTML(agent: Agent): string {
    const iconClass = this.iconClass(agent)
    const subtitle  = this.subtitle(agent)
    const elapsed   = this.elapsedLabel(agent)
    const body      = this.bodyHTML(agent)
    const task      = agent.task || agent.name

    return `
      <div class="agent-row-main">
        <div class="agent-icon ${iconClass}"></div>
        <div class="agent-row-text">
          <div class="agent-task-title">${escHtml(task)}</div>
          <div class="agent-subtitle">${escHtml(subtitle)}</div>
        </div>
        <div class="agent-elapsed">${elapsed}</div>
      </div>
      <div class="agent-detail">${body}</div>
    `
  }

  private updateRow(agent: Agent) {
    const row = this.rowEls.get(agent.id)
    if (!row) return

    const wasExpanded = row.classList.contains('expanded')

    row.innerHTML = this.rowHTML(agent)
    if (wasExpanded) row.classList.add('expanded')

    // Re-attach click
    row.addEventListener('click', () => {
      const isExpanded = row.classList.contains('expanded')
      this.el.querySelectorAll('.agent-row').forEach(r => r.classList.remove('expanded'))
      if (!isExpanded) {
        row.classList.add('expanded')
        this.expandedId = agent.id
      } else {
        this.expandedId = null
      }
    })

    // Wire answer buttons
    if (agent.status === 'waiting') {
      row.querySelector('.agent-answer-btn.yes')?.addEventListener('click', (e) => {
        e.stopPropagation()
        agent.answer('y')
      })
      row.querySelector('.agent-answer-btn.no')?.addEventListener('click', (e) => {
        e.stopPropagation()
        agent.answer('n')
      })
    }

    // Auto-expand newly-active agent
    if ((agent.status === 'running' || agent.status === 'thinking' || agent.status === 'waiting')
        && this.expandedId === null) {
      row.classList.add('expanded')
      this.expandedId = agent.id
    }

    // Scroll detail to bottom
    const detail = row.querySelector<HTMLElement>('.agent-detail')
    if (detail) detail.scrollTop = detail.scrollHeight
  }

  private bodyHTML(agent: Agent): string {
    return agent.messages.map(m => {
      switch (m.type) {
        case 'prompt':
          return `<div class="agent-prompt">${escHtml(m.text)}</div>`
        case 'thinking':
          return `<div class="agent-msg thinking"><span class="agent-think-dot"></span>${escHtml(m.text)}</div>`
        case 'action':
          return `<div class="agent-action">${escHtml(m.text)}</div>`
        case 'output':
          return `<div class="agent-msg">${escHtml(m.text)}</div>`
        case 'question':
          return `
            <div class="agent-question">
              <p>${escHtml(m.text)}</p>
              ${agent.status === 'waiting' ? `
                <div class="agent-answer-btns">
                  <button class="agent-answer-btn yes">Yes</button>
                  <button class="agent-answer-btn no">No</button>
                </div>
              ` : ''}
            </div>
          `
        default:
          return ''
      }
    }).join('')
  }

  private iconClass(agent: Agent): string {
    switch (agent.status) {
      case 'running':
      case 'thinking': return 'spinning'
      case 'waiting':  return 'waiting'
      case 'done':     return 'done'
      case 'error':    return 'error'
      default:         return 'idle'
    }
  }

  private subtitle(agent: Agent): string {
    const last = agent.messages.at(-1)
    if (last && (last.type === 'thinking' || last.type === 'action' || last.type === 'output')) {
      return last.text.slice(0, 80)
    }
    switch (agent.status) {
      case 'running':  return 'Running...'
      case 'thinking': return 'Thinking...'
      case 'waiting':  return 'Waiting for input'
      case 'done':     return 'Done'
      case 'error':    return 'Error'
      default:         return 'Starting...'
    }
  }

  private elapsedLabel(agent: Agent): string {
    const secs = Math.floor((Date.now() - agent.startedAt.getTime()) / 1000)
    if (secs < 10) return 'Now'
    if (secs < 60) return `${secs}s`
    return `${Math.floor(secs / 60)}m`
  }
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
