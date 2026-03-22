type Line = { type: 'prompt' | 'out' | 'think' | 'err'; text: string }

const SESSIONS: Line[][] = [
  [
    { type: 'prompt', text: '(base) user@codespace:~/mouse %' },
    { type: 'out', text: 'npm install' },
    { type: 'out', text: '' },
    { type: 'out', text: 'added 312 packages in 4.2s' },
    { type: 'out', text: '' },
    { type: 'prompt', text: '(base) user@codespace:~/mouse %' },
    { type: 'out', text: 'npm run dev' },
    { type: 'out', text: '' },
    { type: 'out', text: '  VITE v8.0.1  ready in 312ms' },
    { type: 'out', text: '' },
    { type: 'out', text: '  ➜  Local:   http://localhost:5173/' },
    { type: 'out', text: '  ➜  Network: use --host to expose' },
    { type: 'out', text: '' },
    { type: 'prompt', text: '(base) user@codespace:~/mouse %' },
    { type: 'think', text: 'Thinking...' },
  ],
  [
    { type: 'prompt', text: '(base) user@codespace:~/mouse %' },
    { type: 'out', text: 'git log --oneline -5' },
    { type: 'out', text: '' },
    { type: 'out', text: 'a3f9c12 feat: add modular swipe panel system' },
    { type: 'out', text: 'b8e1d04 fix: auto-resolve touch event conflicts' },
    { type: 'out', text: 'c2a7f88 fix: remove legacy counter component' },
    { type: 'out', text: 'd9b3e51 feat: add GitHub Codespaces terminal' },
    { type: 'out', text: 'e4f2a19 init: vite + electron + capacitor' },
    { type: 'out', text: '' },
    { type: 'prompt', text: '(base) user@codespace:~/mouse %' },
  ],
]

export class TerminalView {
  el: HTMLElement
  private sessionIndex = 0
  private outputEl!: HTMLElement
  private inputEl!: HTMLInputElement
  private history: string[] = []
  private histIdx = -1

  constructor() {
    this.el = document.createElement('div')
    this.el.className = 'view-terminal'
    this.render()
  }

  private render() {
    // Tabs
    const tabs = document.createElement('div')
    tabs.className = 'terminal-tabs'
    ;[1, 2].forEach((n, i) => {
      const t = document.createElement('div')
      t.className = `terminal-tab${i === 0 ? ' active' : ''}`
      t.textContent = `Terminal ${n}`
      t.addEventListener('click', () => {
        tabs.querySelectorAll('.terminal-tab').forEach(el => el.classList.remove('active'))
        t.classList.add('active')
        this.sessionIndex = i
        this.outputEl.innerHTML = ''
        this.renderLines()
      })
      tabs.appendChild(t)
    })

    this.outputEl = document.createElement('div')
    this.outputEl.className = 'terminal-output'

    const inputRow = document.createElement('div')
    inputRow.className = 'terminal-input-row'

    const label = document.createElement('span')
    label.className = 't-prompt-label'
    label.textContent = '❯'

    this.inputEl = document.createElement('input')
    this.inputEl.type = 'text'
    this.inputEl.className = 'terminal-input'
    this.inputEl.placeholder = 'enter command…'
    this.inputEl.addEventListener('keydown', e => this.onKey(e))

    inputRow.appendChild(label)
    inputRow.appendChild(this.inputEl)

    this.el.appendChild(tabs)
    this.el.appendChild(this.outputEl)
    this.el.appendChild(inputRow)

    this.renderLines()
  }

  private renderLines() {
    const lines = SESSIONS[this.sessionIndex] ?? []
    lines.forEach(l => this.appendLine(l))
    this.outputEl.scrollTop = this.outputEl.scrollHeight
  }

  private appendLine(l: Line) {
    const div = document.createElement('div')
    if (l.type === 'prompt') {
      div.innerHTML = `<span class="t-prompt">${l.text}</span>`
    } else if (l.type === 'think') {
      div.innerHTML = `<span class="t-think">${l.text}</span>`
    } else if (l.type === 'err') {
      div.innerHTML = `<span class="t-err">${l.text}</span>`
    } else {
      div.innerHTML = `<span class="t-out">${l.text}</span>`
    }
    this.outputEl.appendChild(div)
  }

  private onKey(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      const cmd = this.inputEl.value.trim()
      if (!cmd) return
      this.history.unshift(cmd)
      this.histIdx = -1
      this.appendLine({ type: 'prompt', text: `(base) user@codespace:~/mouse % ${cmd}` })
      this.runCommand(cmd)
      this.inputEl.value = ''
      this.outputEl.scrollTop = this.outputEl.scrollHeight
    } else if (e.key === 'ArrowUp') {
      this.histIdx = Math.min(this.histIdx + 1, this.history.length - 1)
      this.inputEl.value = this.history[this.histIdx] ?? ''
      e.preventDefault()
    } else if (e.key === 'ArrowDown') {
      this.histIdx = Math.max(this.histIdx - 1, -1)
      this.inputEl.value = this.histIdx >= 0 ? this.history[this.histIdx] : ''
    }
  }

  private runCommand(cmd: string) {
    const c = cmd.toLowerCase().trim()
    if (c === 'clear' || c === 'cls') {
      this.outputEl.innerHTML = ''; return
    }
    if (c.startsWith('echo ')) {
      this.appendLine({ type: 'out', text: cmd.slice(5) }); return
    }
    if (c === 'ls' || c === 'ls -la') {
      ['src/', 'electron/', 'dist/', 'package.json', 'tsconfig.json', 'README.md'].forEach(f =>
        this.appendLine({ type: 'out', text: f }))
      return
    }
    if (c === 'pwd') {
      this.appendLine({ type: 'out', text: '/workspaces/mouse' }); return
    }
    if (c === 'whoami') {
      this.appendLine({ type: 'out', text: 'user' }); return
    }
    if (c === 'date') {
      this.appendLine({ type: 'out', text: new Date().toString() }); return
    }
    // Simulate thinking for unrecognised
    this.appendLine({ type: 'think', text: 'Thinking...' })
    setTimeout(() => {
      const parent = this.outputEl.lastElementChild
      if (parent) parent.innerHTML = `<span class="t-out">command not found: ${cmd.split(' ')[0]}</span>`
      this.outputEl.scrollTop = this.outputEl.scrollHeight
    }, 800)
  }

  focusInput() { this.inputEl.focus() }

  appendVoiceCommand(text: string) {
    this.inputEl.value = text
    this.inputEl.focus()
  }
}
