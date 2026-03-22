import type { Codespace } from './CodespacesApi.ts'
import { listCodespaces, waitUntilAvailable, isRelayRunning, relayWssUrl } from './CodespacesApi.ts'

export interface PickResult {
  codespace: Codespace
  relayUrl: string
  token: string
}

type DoneCallback = (result: PickResult) => void

export class CodespacePicker {
  el: HTMLElement
  private token: string
  private onDone: DoneCallback

  constructor(token: string, onDone: DoneCallback) {
    this.token = token
    this.onDone = onDone
    this.el = document.createElement('div')
    this.el.className = 'picker-screen'
    this.load()
  }

  private async load() {
    this.renderLoading()
    try {
      const list = await listCodespaces(this.token)
      if (list.length === 0) this.renderEmpty()
      else this.renderList(list)
    } catch (err: any) {
      this.renderError(err.message)
    }
  }

  private renderLoading() {
    this.el.innerHTML = `
      <div class="picker-header">
        <span class="picker-title">Your Codespaces</span>
      </div>
      <div class="picker-loading">
        <span class="auth-spinner"></span>
        Loading…
      </div>
    `
  }

  private renderEmpty() {
    this.el.innerHTML = `
      <div class="picker-header">
        <span class="picker-title">Your Codespaces</span>
      </div>
      <div class="picker-empty">
        <div class="picker-empty-icon">⬡</div>
        <p>No Codespaces found.</p>
        <p style="color:var(--text-faint);font-size:12px;margin-top:6px">
          Create one at github.com/codespaces
        </p>
        <button class="auth-btn" style="margin-top:20px" id="refresh-btn">Refresh</button>
      </div>
    `
    this.el.querySelector('#refresh-btn')!.addEventListener('click', () => this.load())
  }

  private renderList(spaces: Codespace[]) {
    this.el.innerHTML = `
      <div class="picker-header">
        <span class="picker-title">Your Codespaces</span>
        <button class="picker-refresh" id="refresh-btn">↺</button>
      </div>
      <div class="picker-list" id="picker-list"></div>
      <div class="picker-footer">
        <p class="picker-footer-note">
          First time? Run the Mouse relay in your Codespace:
        </p>
        <div class="picker-setup-cmd">npx @mouse-app/relay</div>
      </div>
    `
    this.el.querySelector('#refresh-btn')!.addEventListener('click', () => this.load())
    const list = this.el.querySelector('#picker-list')!
    spaces.forEach(cs => list.appendChild(this.makeCard(cs)))
  }

  private makeCard(cs: Codespace): HTMLElement {
    const card = document.createElement('div')
    card.className = 'cs-card glass'

    const stateClass = cs.state === 'Available' ? 'state-available'
      : cs.state === 'Shutdown' ? 'state-stopped'
      : 'state-starting'

    const ram = cs.machine
      ? `${Math.round(cs.machine.memory_in_bytes / 1e9)}GB · ${cs.machine.cpus} CPU`
      : ''

    card.innerHTML = `
      <div class="cs-card-top">
        <div class="cs-dot ${stateClass}"></div>
        <div class="cs-info">
          <div class="cs-name">${cs.display_name ?? cs.name}</div>
          <div class="cs-repo">${cs.repository.full_name}</div>
        </div>
        <div class="cs-state-label">${cs.state}</div>
      </div>
      ${ram ? `<div class="cs-meta">${ram}</div>` : ''}
    `
    card.addEventListener('click', () => this.connect(cs))
    return card
  }

  private async connect(cs: Codespace) {
    this.renderConnecting(cs)
    try {
      // 1. Make sure it's running
      const live = await waitUntilAvailable(this.token, cs.name, (state) => {
        const el = this.el.querySelector('.connect-state')
        if (el) el.textContent = state === 'Shutdown' ? 'Starting Codespace…' : state + '…'
      })

      // 2. Check if relay is up
      const statusEl = this.el.querySelector('.connect-state')
      if (statusEl) statusEl.textContent = 'Checking relay…'

      const up = await isRelayRunning(live.name, this.token)
      if (!up) {
        this.renderRelaySetup(live, live)
        return
      }

      // 3. Done — relay is up
      this.onDone({
        codespace: live,
        relayUrl: relayWssUrl(live.name),
        token: this.token,
      })
    } catch (err: any) {
      this.renderError(err.message)
    }
  }

  private renderConnecting(_cs: Codespace) {
    this.el.innerHTML = `
      <div class="picker-header">
        <button class="picker-back" id="back-btn">‹ Back</button>
      </div>
      <div class="picker-loading">
        <span class="auth-spinner"></span>
        <span class="connect-state">Connecting…</span>
      </div>
    `
    this.el.querySelector('#back-btn')!.addEventListener('click', () => this.load())
  }

  private renderRelaySetup(cs: Codespace, live = cs) {
    this.el.innerHTML = `
      <div class="picker-header">
        <button class="picker-back" id="back-btn">‹ Back</button>
        <span class="picker-title">Setup Required</span>
      </div>
      <div class="relay-setup glass">
        <div class="relay-setup-icon">🔌</div>
        <h3 class="relay-setup-title">Start the Mouse relay</h3>
        <p class="relay-setup-desc">
          Open your Codespace terminal and run this once:
        </p>
        <div class="picker-setup-cmd" id="copy-cmd">npx @mouse-app/relay</div>
        <p class="relay-copy-hint" id="copy-hint">Tap to copy</p>
        <p class="relay-setup-desc" style="margin-top:12px;color:var(--text-faint)">
          The relay starts a terminal bridge on port ${2222} inside your Codespace.
          After running it, tap Connect.
        </p>
        <button class="auth-btn" id="connect-btn" style="margin-top:16px">
          Connect
        </button>
      </div>
    `
    this.el.querySelector('#back-btn')!.addEventListener('click', () => this.load())
    this.el.querySelector('#copy-cmd')!.addEventListener('click', () => {
      navigator.clipboard?.writeText('npx @mouse-app/relay')
      const hint = this.el.querySelector('#copy-hint') as HTMLElement
      hint.textContent = 'Copied!'
      setTimeout(() => { hint.textContent = 'Tap to copy' }, 2000)
    })
    this.el.querySelector('#connect-btn')!.addEventListener('click', () => this.connect(live))
  }

  private renderError(msg: string) {
    this.el.innerHTML = `
      <div class="picker-header">
        <button class="picker-back" id="back-btn">‹ Back</button>
      </div>
      <div class="picker-loading">
        <p class="auth-error">${msg}</p>
        <button class="auth-btn" id="back-btn2" style="margin-top:16px">Back</button>
      </div>
    `
    this.el.querySelector('#back-btn')!.addEventListener('click', () => this.load())
    this.el.querySelector('#back-btn2')!.addEventListener('click', () => this.load())
  }
}
