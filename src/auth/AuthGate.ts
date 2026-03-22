import { requestDeviceCode, pollForToken } from './GitHubAuth.ts'

type DoneCallback = (token: string) => void

export class AuthGate {
  el: HTMLElement
  private onDone: DoneCallback

  constructor(onDone: DoneCallback) {
    this.onDone = onDone
    this.el = document.createElement('div')
    this.el.className = 'auth-gate'
    this.renderLanding()
  }

  private renderLanding() {
    this.el.innerHTML = `
      <div class="auth-card glass">
        <div class="auth-logo">⬡</div>
        <h1 class="auth-title">Mouse</h1>
        <p class="auth-subtitle">Code with AI agents from your phone.<br>Your Codespace. Your code.</p>
        <button class="auth-btn" id="sign-in-btn">
          <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
          </svg>
          Sign in with GitHub
        </button>
        <p class="auth-note">Requires a GitHub account with Codespaces access</p>
      </div>
    `
    this.el.querySelector('#sign-in-btn')!.addEventListener('click', () => this.startFlow())
  }

  private async startFlow() {
    this.renderLoading('Requesting authorization…')
    try {
      const { device_code, user_code, verification_uri, interval } = await requestDeviceCode()
      this.renderDeviceCode(user_code, verification_uri, device_code, interval)
    } catch (err: any) {
      this.renderError(err.message)
    }
  }

  private renderDeviceCode(code: string, uri: string, deviceCode: string, interval: number) {
    this.el.innerHTML = `
      <div class="auth-card glass">
        <div class="auth-logo">⬡</div>
        <h2 class="auth-step-title">Authorize Mouse</h2>
        <p class="auth-step-hint">Open GitHub in your browser and enter this code:</p>
        <div class="auth-code-display" id="copy-code">${code}</div>
        <p class="auth-copy-hint" id="copy-hint">Tap to copy</p>
        <a class="auth-btn auth-btn-outline" href="${uri}" target="_blank" rel="noopener">
          Open GitHub →
        </a>
        <div class="auth-polling">
          <span class="auth-spinner"></span>
          Waiting for authorization…
        </div>
      </div>
    `
    this.el.querySelector('#copy-code')!.addEventListener('click', () => {
      navigator.clipboard?.writeText(code)
      const hint = this.el.querySelector('#copy-hint') as HTMLElement
      hint.textContent = 'Copied!'
      setTimeout(() => { hint.textContent = 'Tap to copy' }, 2000)
    })

    // Open the URL on desktop via Electron
    const link = this.el.querySelector('a')!
    link.addEventListener('click', (e) => {
      if ((window as any).__electron__) {
        e.preventDefault()
        ;(window as any).__electron__.openExternal(uri)
      }
    })

    pollForToken(deviceCode, interval)
      .then(token => this.onDone(token))
      .catch(err => this.renderError(err.message))
  }

  private renderLoading(msg: string) {
    this.el.innerHTML = `
      <div class="auth-card glass">
        <div class="auth-logo">⬡</div>
        <div class="auth-polling">
          <span class="auth-spinner"></span>
          ${msg}
        </div>
      </div>
    `
  }

  private renderError(msg: string) {
    this.el.innerHTML = `
      <div class="auth-card glass">
        <div class="auth-logo">⬡</div>
        <p class="auth-error">${msg}</p>
        <button class="auth-btn" id="retry-btn">Try Again</button>
      </div>
    `
    this.el.querySelector('#retry-btn')!.addEventListener('click', () => this.renderLanding())
  }
}
