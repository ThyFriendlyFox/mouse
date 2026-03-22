import { ModuleStack } from './modules/ModuleStack.ts'
import { AgentPanel } from './agents/AgentPanel.ts'
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

  constructor(container: HTMLElement) {
    this.el = document.createElement('div')
    this.el.className = 'app'
    container.appendChild(this.el)
    this.boot()
  }

  private async boot() {
    const token = getStoredToken()
    if (!token) {
      this.showAuth()
      return
    }
    // Validate existing token
    const valid = await validateToken(token)
    if (!valid) {
      clearAuth()
      this.showAuth()
      return
    }
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

    const stack = new ModuleStack()
    const agentPanel = new AgentPanel()
    const bottomBar = new BottomBar(codespace.display_name ?? codespace.name)

    // Connect relay
    this.relay = new RelaySocket(relayUrl, token)
    stack.setRelay(this.relay)

    // Wire composer → relay (types message into opencode running in PTY)
    bottomBar.onSubmit(text => {
      if (this.relay?.status === 'connected') {
        this.relay.sendMessage(text)
      } else {
        // Relay not connected: run as local agent simulation
        const agent = new Agent(`Agent ${Date.now()}`)
        agentPanel.addAgent(agent)
        agent.simulate(text)
      }
    })

    // Sign-out option (long-press bottom bar logo)
    bottomBar.onSignOut(() => {
      this.relay?.disconnect()
      clearAuth()
      this.el.innerHTML = ''
      this.boot()
    })

    this.el.appendChild(stack.el)
    this.el.appendChild(agentPanel.el)
    this.el.appendChild(bottomBar.el)

    // Show connection status in a transient toast
    this.relay.onStatus(status => {
      if (status === 'connected') this.toast(`Connected to ${codespace.display_name ?? codespace.name}`)
      if (status === 'disconnected') this.toast('Terminal disconnected')
    })
  }

  private toast(msg: string) {
    const t = document.createElement('div')
    t.className = 'toast'
    t.textContent = msg
    this.el.appendChild(t)
    setTimeout(() => t.classList.add('toast-show'), 10)
    setTimeout(() => { t.classList.remove('toast-show'); setTimeout(() => t.remove(), 300) }, 2500)
  }
}
