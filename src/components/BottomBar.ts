export class BottomBar {
  el: HTMLElement
  private inputEl!: HTMLTextAreaElement
  private micBtn!: HTMLButtonElement
  private onSubmitFn?: (text: string) => void
  private onSignOutFn?: () => void
  private recognition: any = null
  private codespaceName: string

  constructor(codespaceName = '') {
    this.codespaceName = codespaceName
    this.el = document.createElement('div')
    this.el.className = 'bottom-bar'
    this.render()
    this.setupSpeech()
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
      // Long-press → sign out
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
    this.micBtn.title = 'Voice input (hold)'
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

  private setupSpeech() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    this.recognition = new SR()
    this.recognition.continuous = false
    this.recognition.interimResults = false
    this.recognition.lang = 'en-US'
    this.recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript
      this.inputEl.value = transcript
      this.micBtn.classList.remove('listening')
      this.submit()
    }
    this.recognition.onend = () => this.micBtn.classList.remove('listening')
  }

  private toggleMic() {
    if (!this.recognition) {
      alert('Speech recognition not available in this environment.')
      return
    }
    if (this.micBtn.classList.contains('listening')) {
      this.recognition.stop()
      this.micBtn.classList.remove('listening')
    } else {
      this.recognition.start()
      this.micBtn.classList.add('listening')
    }
  }

  focusInput() { this.inputEl.focus() }
}
