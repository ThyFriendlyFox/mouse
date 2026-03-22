type DataHandler = (data: string) => void
type StatusHandler = (status: RelayStatus) => void

export type RelayStatus = 'connecting' | 'authenticating' | 'connected' | 'disconnected' | 'error'

export class RelaySocket {
  private ws: WebSocket | null = null
  private token: string
  private url: string
  private dataHandlers: DataHandler[] = []
  private statusHandlers: StatusHandler[] = []
  private _status: RelayStatus = 'disconnected'

  constructor(url: string, token: string) {
    this.url = url
    this.token = token
  }

  get status(): RelayStatus { return this._status }

  onData(fn: DataHandler) { this.dataHandlers.push(fn) }
  onStatus(fn: StatusHandler) { this.statusHandlers.push(fn) }

  connect() {
    if (this.ws) this.ws.close()
    this.setStatus('connecting')

    this.ws = new WebSocket(this.url)
    this.ws.binaryType = 'arraybuffer'

    this.ws.onopen = () => {
      this.setStatus('authenticating')
      // First message: authenticate with GitHub token
      this.ws!.send(JSON.stringify({ type: 'auth', token: this.token }))
    }

    this.ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'auth_ok') {
            this.setStatus('connected')
          } else if (msg.type === 'auth_fail') {
            this.setStatus('error')
            this.ws?.close()
          }
        } catch {
          // Plain text from PTY — pass through
          this.dataHandlers.forEach(fn => fn(event.data))
        }
      } else {
        // Binary PTY data
        const text = new TextDecoder().decode(event.data as ArrayBuffer)
        this.dataHandlers.forEach(fn => fn(text))
      }
    }

    this.ws.onerror = () => this.setStatus('error')
    this.ws.onclose = () => {
      if (this._status !== 'error') this.setStatus('disconnected')
    }
  }

  /** Send keyboard input to the PTY */
  sendInput(data: string) {
    if (this.ws?.readyState === WebSocket.OPEN && this._status === 'connected') {
      this.ws.send(data)
    }
  }

  /** Send a message to opencode (types it + presses Enter) */
  sendMessage(text: string) {
    this.sendInput(text + '\r')
  }

  /** Notify the relay of terminal resize */
  resize(cols: number, rows: number) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'resize', cols, rows }))
    }
  }

  disconnect() {
    this.ws?.close()
    this.ws = null
    this.setStatus('disconnected')
  }

  private setStatus(s: RelayStatus) {
    this._status = s
    this.statusHandlers.forEach(fn => fn(s))
  }
}
