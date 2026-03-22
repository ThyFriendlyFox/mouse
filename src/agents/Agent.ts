export type AgentStatus = 'idle' | 'running' | 'thinking' | 'done'

export interface AgentMsg {
  type: 'thinking' | 'action' | 'output' | 'question'
  text: string
}

export class Agent {
  id: string
  name: string
  status: AgentStatus
  messages: AgentMsg[]
  private listeners: (() => void)[] = []

  constructor(name: string) {
    this.id = Math.random().toString(36).slice(2)
    this.name = name
    this.status = 'idle'
    this.messages = []
  }

  onChange(fn: () => void) { this.listeners.push(fn) }
  private notify() { this.listeners.forEach(f => f()) }

  push(msg: AgentMsg) { this.messages.push(msg); this.notify() }

  async simulate(task: string) {
    this.status = 'running'; this.messages = []; this.notify()
    await delay(600)
    this.status = 'thinking'
    this.push({ type: 'thinking', text: 'Thinking...' })
    await delay(900)
    this.push({ type: 'action', text: `> Grepped codebase for "${task.split(' ').slice(-1)[0]}"` })
    await delay(700)
    this.push({ type: 'action', text: '> Reading src/modules/Module.ts' })
    await delay(500)
    this.status = 'running'
    this.push({ type: 'output', text: `Found 3 matches. Analyzing context...` })
    await delay(1000)
    this.push({
      type: 'question',
      text: `I've searched the codebase and found relevant code. Would you like me to apply the changes automatically?`
    })
    this.status = 'done'; this.notify()
  }
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)) }
