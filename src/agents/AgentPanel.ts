import { Agent } from './Agent.ts'

export class AgentPanel {
  el: HTMLElement
  private agents: Agent[] = []
  private expandedId: string | null = null
  private barEls = new Map<string, HTMLElement>()

  constructor() {
    this.el = document.createElement('div')
    this.el.className = 'agents-panel'
  }

  addAgent(agent: Agent) {
    this.agents.push(agent)
    const bar = this.makeBar(agent)
    this.barEls.set(agent.id, bar)
    this.el.appendChild(bar)
    agent.onChange(() => this.updateBar(agent))
  }

  private makeBar(agent: Agent): HTMLElement {
    const bar = document.createElement('div')
    bar.className = 'agent-bar'
    bar.dataset.id = agent.id

    const hdr = document.createElement('div')
    hdr.className = 'agent-bar-hdr'

    const dot = document.createElement('div')
    dot.className = `agent-dot ${agent.status}`

    const name = document.createElement('span')
    name.className = 'agent-name'
    name.textContent = agent.name

    const statusText = document.createElement('span')
    statusText.className = 'agent-status-text'
    statusText.textContent = this.statusLabel(agent)

    const body = document.createElement('div')
    body.className = 'agent-body'

    hdr.appendChild(dot)
    hdr.appendChild(name)
    hdr.appendChild(statusText)
    bar.appendChild(hdr)
    bar.appendChild(body)

    bar.addEventListener('click', () => {
      const isExpanded = bar.classList.contains('expanded')
      this.el.querySelectorAll('.agent-bar').forEach(b => b.classList.remove('expanded'))
      if (!isExpanded) bar.classList.add('expanded')
      this.expandedId = isExpanded ? null : agent.id
    })

    return bar
  }

  private updateBar(agent: Agent) {
    const bar = this.barEls.get(agent.id)
    if (!bar) return

    const dot = bar.querySelector<HTMLElement>('.agent-dot')!
    dot.className = `agent-dot ${agent.status}`

    const statusText = bar.querySelector<HTMLElement>('.agent-status-text')!
    statusText.textContent = this.statusLabel(agent)

    const body = bar.querySelector<HTMLElement>('.agent-body')!
    body.innerHTML = agent.messages.map(m => {
      if (m.type === 'thinking') return `<div class="agent-msg thinking">${m.text}</div>`
      if (m.type === 'action') return `<div class="agent-action">${m.text}</div>`
      if (m.type === 'output') return `<div class="agent-msg">${m.text}</div>`
      if (m.type === 'question') return `<div class="agent-question">${m.text}</div>`
      return ''
    }).join('')

    // Auto-expand while running
    if (agent.status === 'running' || agent.status === 'thinking') {
      if (this.expandedId === null) {
        bar.classList.add('expanded')
        this.expandedId = agent.id
      }
    }
  }

  private statusLabel(agent: Agent): string {
    switch (agent.status) {
      case 'running': return 'Running...'
      case 'thinking': return 'Thinking...'
      case 'done': return 'Done'
      default: return 'Idle'
    }
  }
}
