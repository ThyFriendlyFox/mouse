import { SpeechRecognition } from '@capacitor-community/speech-recognition'

const isNative = () => !!(window as any).Capacitor?.isNativePlatform?.()

export class BottomBar {
  el: HTMLElement
  private inputEl!: HTMLTextAreaElement
  private micBtn!: HTMLButtonElement
  private onSubmitFn?: (text: string) => void
  private onSignOutFn?: () => void
  private webRecognition: any = null
  private listening = false
  private codespaceName: string

  constructor(codespaceName = '') {
    this.codespaceName = codespaceName
    this.el = document.createElement('div')
    this.el.className = 'bottom-bar'
    this.render()
    if (!isNative()) this.setupWebSpeech()
  }

  onSubmit(fn: (text: string) => void) { this.onSubmitFn = fn }
  onSignOut(fn: () => void) { this.onSignOutFn = fn }

  private render() {
    const composer = document.createElement('div')
    composer.className = 'composer-area'

    this.inputEl = document.createElement('textarea')
    this.inputEl.className = 'composer-input'
    this.inputEl.placeholder = 'Message opencode…'
    this.inputEl.rows = 1
    this.inputEl.addEventListener('input', () => {
      this.inputEl.style.height = 'auto'
      this.inputEl.style.height = this.inputEl.scrollHeight + 'px'
    })
    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.submit() }
    })

    const footer = document.createElement('div')
    footer.className = 'composer-footer'

    const agentSel = document.createElement('div')
    agentSel.className = 'composer-sel'
    agentSel.innerHTML = `<span class="composer-inf">∞</span><span>Agent</span><span class="composer-chev">▾</span>`

    const sep = document.createElement('div')
    sep.className = 'composer-sep'

    const csSel = document.createElement('div')
    csSel.className = 'composer-sel'
    csSel.innerHTML = `<span>opencode</span><span class="composer-chev">▾</span>`
    if (this.codespaceName) {
      csSel.title = this.codespaceName
      let pressTimer: ReturnType<typeof setTimeout> | null = null
      csSel.addEventListener('touchstart', () => { pressTimer = setTimeout(() => this.onSignOutFn?.(), 800) })
      csSel.addEventListener('touchend', () => { if (pressTimer) clearTimeout(pressTimer) })
    }

    footer.appendChild(agentSel)
    footer.appendChild(sep)
    footer.appendChild(csSel)

    composer.appendChild(this.inputEl)
    composer.appendChild(footer)

    this.micBtn = document.createElement('button')
    this.micBtn.className = 'mic-btn'
    this.micBtn.innerHTML = '🎙'
    this.micBtn.title = 'Voice input'
    this.micBtn.addEventListener('click', () => this.toggleMic())

    this.el.appendChild(composer)
    this.el.appendChild(this.micBtn)
  }

  private submit() {
    const text = this.inputEl.value.trim()
    if (!text) return
    this.onSubmitFn?.(text)
    this.inputEl.value = ''
    this.inputEl.style.height = 'auto'
  }

  // ── Native (iOS / Android) ──────────────────────────

  private async startNative() {
    const { available } = await SpeechRecognition.available()
    if (!available) { alert('Speech recognition not available on this device.'); return }

    await SpeechRecognition.requestPermissions()

    this.setListening(true)
    await SpeechRecognition.start({
      language: 'en-US',
      maxResults: 1,
      popup: false,
    })

    SpeechRecognition.addListener('partialResults', (data: { matches: string[] }) => {
      if (data.matches?.[0]) this.inputEl.value = data.matches[0]
    })
  }

  private async stopNative() {
    await SpeechRecognition.stop()
    SpeechRecognition.removeAllListeners()
    const text = this.inputEl.value.trim()
    this.setListening(false)
    if (text) this.submit()
  }

  // ── Web Speech API (Electron / desktop) ────────────

  private setupWebSpeech() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    this.webRecognition = new SR()
    this.webRecognition.continuous = false
    this.webRecognition.interimResults = true
    this.webRecognition.lang = 'en-US'
    this.webRecognition.onresult = (e: any) => {
      const transcript = Array.from(e.results as any[])
        .map((r: any) => r[0].transcript)
        .join('')
      this.inputEl.value = transcript
      if (e.results[e.results.length - 1].isFinal) {
        this.setListening(false)
        this.submit()
      }
    }
    this.webRecognition.onend = () => this.setListening(false)
  }

  // ── Toggle ──────────────────────────────────────────

  private async toggleMic() {
    if (this.listening) {
      isNative() ? await this.stopNative() : this.webRecognition?.stop()
      return
    }
    if (isNative()) {
      await this.startNative()
    } else if (this.webRecognition) {
      this.setListening(true)
      this.webRecognition.start()
    } else {
      alert('Speech recognition not available in this environment.')
    }
  }

  private setListening(on: boolean) {
    this.listening = on
    this.micBtn.classList.toggle('listening', on)
  }

  focusInput() { this.inputEl.focus() }
}
