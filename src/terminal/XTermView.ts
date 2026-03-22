import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import type { RelaySocket } from './RelaySocket.ts'
import '@xterm/xterm/css/xterm.css'

export class XTermView {
  el: HTMLElement
  private term: Terminal
  private fitAddon: FitAddon
  private relay: RelaySocket | null = null
  private resizeObserver: ResizeObserver
  private mobileInput: HTMLInputElement

  constructor() {
    this.el = document.createElement('div')
    this.el.className = 'xterm-wrap'
    this.el.style.cssText = 'height:100%;width:100%;position:relative;background:#0c0c14;'

    this.term = new Terminal({
      theme: {
        background: '#0c0c14',
        foreground: '#d4d4d4',
        cursor: '#a855f7',
        cursorAccent: '#0c0c14',
        black: '#1e1e2e',
        red: '#f87171',
        green: '#4ade80',
        yellow: '#fbbf24',
        blue: '#60a5fa',
        magenta: '#a855f7',
        cyan: '#22d3ee',
        white: '#d4d4d4',
        brightBlack: '#4a4a5a',
        brightRed: '#ff8fa3',
        brightGreen: '#a3e635',
        brightYellow: '#fde68a',
        brightBlue: '#93c5fd',
        brightMagenta: '#c4b5fd',
        brightCyan: '#67e8f9',
        brightWhite: '#f8fafc',
      },
      fontFamily: '"SF Mono", "Fira Code", ui-monospace, monospace',
      fontSize: 12,
      lineHeight: 1.5,
      cursorBlink: true,
      cursorStyle: 'bar',
      scrollback: 2000,
      allowTransparency: true,
    })

    this.fitAddon = new FitAddon()
    this.term.loadAddon(this.fitAddon)
    this.term.loadAddon(new WebLinksAddon())

    // Mobile input overlay: hidden input that gets focused on tap
    this.mobileInput = document.createElement('input')
    this.mobileInput.type = 'text'
    this.mobileInput.autocomplete = 'off'
    this.mobileInput.autocapitalize = 'off'
    this.mobileInput.style.cssText = `
      position:absolute; bottom:0; left:0; width:1px; height:1px;
      opacity:0; pointer-events:none; z-index:100;
    `
    this.mobileInput.addEventListener('input', (e) => {
      const val = (e as InputEvent).data ?? ''
      if (val) {
        this.relay ? this.relay.sendInput(val) : this.term.input(val)
        this.mobileInput.value = ''
      }
    })
    this.mobileInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.relay ? this.relay.sendInput('\r') : this.term.input('\r')
        this.mobileInput.value = ''
        e.preventDefault()
      } else if (e.key === 'Backspace') {
        this.relay ? this.relay.sendInput('\x7f') : this.term.input('\x7f')
        e.preventDefault()
      }
    })

    this.el.appendChild(this.mobileInput)

    // Focus mobile input on tap
    this.el.addEventListener('click', () => {
      const isMobile = 'ontouchstart' in window
      if (isMobile) this.mobileInput.focus()
    })

    // Wire xterm keyboard input to relay
    this.term.onData(data => {
      this.relay?.sendInput(data)
    })

    // Watch for size changes and fit
    this.resizeObserver = new ResizeObserver(() => this.fit())

    this.showDisconnected()
  }

  mount() {
    // Defer to ensure the el is in the DOM before opening xterm
    requestAnimationFrame(() => {
      const container = document.createElement('div')
      container.style.cssText = 'height:100%;width:100%;padding:6px 4px;box-sizing:border-box;'
      this.el.insertBefore(container, this.mobileInput)
      this.term.open(container)
      this.fitAddon.fit()
      this.resizeObserver.observe(this.el)
    })
  }

  fit() {
    try {
      this.fitAddon.fit()
      this.relay?.resize(this.term.cols, this.term.rows)
    } catch {}
  }

  setRelay(relay: RelaySocket) {
    this.relay = relay

    relay.onStatus(status => {
      if (status === 'connecting' || status === 'authenticating') {
        this.term.clear()
        this.term.write('\r\n\x1b[35m  Connecting to Codespace…\x1b[0m\r\n\r\n')
      } else if (status === 'connected') {
        this.term.clear()
        this.fit()
      } else if (status === 'disconnected') {
        this.term.write('\r\n\x1b[33m  Disconnected. Reconnecting…\x1b[0m\r\n')
        setTimeout(() => relay.connect(), 3000)
      } else if (status === 'error') {
        this.term.write('\r\n\x1b[31m  Connection error. Check that the relay is running.\x1b[0m\r\n')
      }
    })

    relay.onData(data => {
      this.term.write(data)
    })

    relay.connect()
  }

  private showDisconnected() {
    // Written once xterm is open; replaced on connect
    setTimeout(() => {
      this.term.write('\x1b[2m  No Codespace connected.\x1b[0m\r\n')
    }, 300)
  }

  destroy() {
    this.resizeObserver.disconnect()
    this.term.dispose()
  }
}
