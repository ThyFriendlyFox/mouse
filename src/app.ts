import { ModuleStack } from './modules/ModuleStack.ts'
import { Agent } from './agents/Agent.ts'
import { BottomBar } from './components/BottomBar.ts'
import { AuthGate } from './auth/AuthGate.ts'
import { CodespacePicker } from './codespaces/CodespacePicker.ts'
import { RelaySocket } from './terminal/RelaySocket.ts'
import { getStoredToken, validateToken, clearAuth } from './auth/GitHubAuth.ts'
import type { PickResult } from './codespaces/CodespacePicker.ts'

export class App {
  el: HTMLElement
  private relay: RelaySocket | null = null
  private agentCount = 0

  constructor(container: HTMLElement) {
    this.el = document.createElement('div')
    this.el.className = 'app'
    container.appendChild(this.el)
    this.boot()
  }

  private async boot() {
    const token = getStoredToken()
    if (!token) { this.showAuth(); return }
    const valid = await validateToken(token)
    if (!valid) { clearAuth(); this.showAuth(); return }
    this.showCodespacePicker(token)
  }

  private showAuth() {
    this.el.innerHTML = ''
    const gate = new AuthGate((token) => {
      this.el.innerHTML = ''
      this.showCodespacePicker(token)
    })
    this.el.appendChild(gate.el)
  }

  private showCodespacePicker(token: string) {
    this.el.innerHTML = ''
    const picker = new CodespacePicker(token, (result) => {
      this.el.innerHTML = ''
      this.showMain(result)
    })
    this.el.appendChild(picker.el)
  }

  private showMain(result: PickResult) {
    const { token, relayUrl, codespace } = result
    const codespaceName = codespace.display_name ?? codespace.name

    const stack     = new ModuleStack()
    const bottomBar = new BottomBar(codespaceName)

    this.el.appendChild(stack.el)
    this.el.appendChild(bottomBar.el)

    // ── Connect relay ──────────────────────────────────
    this.relay = new RelaySocket(relayUrl, token)

    this.relay.onStatus(status => {
      if (status === 'connected') {
        this.relay!.startSession('terminal', 'bash')
        this.relay!.onSessionStarted('terminal', () => {
          stack.connectTerminal(this.relay!, 'terminal', 'Terminal')
        })
        this.toast(`Connected to ${codespaceName}`)
      }
      if (status === 'disconnected') this.toast('Terminal disconnected')
      if (status === 'error')        this.toast('Connection error — is the relay running?')
    })

    this.relay.connect()

    // ── Composer → new agent module in the stack ──────
    bottomBar.onSubmit(text => {
      if (!this.relay || this.relay.status !== 'connected') {
        this.toast('Not connected to a Codespace')
        return
      }
      this.agentCount++
      const agentId   = `agent-${this.agentCount}`
      const agentName = `Agent ${this.agentCount}`
      const agent     = new Agent(agentId, agentName, this.relay)

      stack.addAgent(agent, this.relay)
      agent.start(text)
    })

    bottomBar.onSignOut(() => {
      this.relay?.disconnect()
      clearAuth()
      this.el.innerHTML = ''
      this.boot()
    })
  }

  private toast(msg: string) {
    const t = document.createElement('div')
    t.className = 'toast'
    t.textContent = msg
    this.el.appendChild(t)
    setTimeout(() => t.classList.add('toast-show'), 10)
    setTimeout(() => {
      t.classList.remove('toast-show')
      setTimeout(() => t.remove(), 300)
    }, 2500)
  }
}
