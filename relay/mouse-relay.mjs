#!/usr/bin/env node
/**
 * Mouse Relay — WebSocket PTY bridge for GitHub Codespaces
 *
 * Runs inside your Codespace. Exposes a WebSocket server on PORT (default 2222).
 * GitHub Codespaces automatically forwards this port to:
 *   wss://{codespace-name}-2222.app.github.dev
 *
 * Protocol:
 *   Client → Server (first message):  { "type": "auth", "token": "<github_token>" }
 *   Server → Client (on auth ok):     { "type": "auth_ok" }
 *   Server → Client (on auth fail):   { "type": "auth_fail" }
 *   After auth:
 *     Client → Server: raw binary PTY input (keyboard data)
 *     Server → Client: raw binary PTY output (terminal data)
 *     Client → Server (text): { "type": "resize", "cols": N, "rows": N }
 */

import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import pty from 'node-pty'

const PORT = parseInt(process.env.MOUSE_RELAY_PORT ?? '2222', 10)
const SHELL = process.env.SHELL ?? '/bin/bash'
const AUTO_START_OPENCODE = process.env.MOUSE_AUTO_OPENCODE !== '0'

const server = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, version: '0.1.0' }))
    return
  }
  res.writeHead(404)
  res.end()
})

const wss = new WebSocketServer({ server })

wss.on('connection', (ws) => {
  let authenticated = false
  let ptyProcess = null

  // --- Auth handshake ---
  ws.once('message', async (raw) => {
    let msg
    try { msg = JSON.parse(raw.toString()) } catch { ws.close(); return }

    if (msg.type !== 'auth' || !msg.token) {
      ws.send(JSON.stringify({ type: 'auth_fail', reason: 'missing token' }))
      ws.close()
      return
    }

    // Validate token against GitHub API
    try {
      const resp = await fetch('https://api.github.com/user', {
        headers: { 'Authorization': `Bearer ${msg.token}`, 'Accept': 'application/vnd.github+json' },
      })
      if (!resp.ok) throw new Error('invalid')
      const user = await resp.json()
      console.log(`[mouse-relay] Authenticated: ${user.login}`)
    } catch {
      ws.send(JSON.stringify({ type: 'auth_fail', reason: 'invalid token' }))
      ws.close()
      return
    }

    authenticated = true
    ws.send(JSON.stringify({ type: 'auth_ok' }))

    // Spawn PTY
    ptyProcess = pty.spawn(SHELL, ['-l'], {
      name: 'xterm-256color',
      cols: 220,
      rows: 50,
      cwd: process.env.HOME ?? '/workspaces',
      env: { ...process.env, TERM: 'xterm-256color' },
    })

    ptyProcess.onData((data) => {
      if (ws.readyState === ws.OPEN) ws.send(data)
    })

    ptyProcess.onExit(() => {
      console.log('[mouse-relay] PTY exited')
      ws.close()
    })

    // Auto-start opencode if available
    if (AUTO_START_OPENCODE) {
      setTimeout(() => {
        try {
          ptyProcess?.write('opencode\r')
        } catch {}
      }, 500)
    }

    // Wire subsequent messages to PTY
    ws.on('message', (data) => {
      if (!authenticated || !ptyProcess) return
      if (typeof data === 'string') {
        // Control messages (resize)
        try {
          const ctrl = JSON.parse(data)
          if (ctrl.type === 'resize' && ctrl.cols && ctrl.rows) {
            ptyProcess.resize(Math.max(10, ctrl.cols), Math.max(2, ctrl.rows))
          }
        } catch {
          ptyProcess.write(data)
        }
      } else {
        // Binary keyboard input
        ptyProcess.write(data.toString())
      }
    })
  })

  ws.on('close', () => {
    if (ptyProcess) {
      try { ptyProcess.kill() } catch {}
      ptyProcess = null
    }
    console.log('[mouse-relay] Client disconnected')
  })

  ws.on('error', (err) => {
    console.error('[mouse-relay] WebSocket error:', err.message)
  })
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[mouse-relay] Listening on port ${PORT}`)
  console.log(`[mouse-relay] GitHub will forward this as:`)
  console.log(`[mouse-relay]   wss://{codespace-name}-${PORT}.app.github.dev`)
  if (AUTO_START_OPENCODE) {
    console.log(`[mouse-relay] Will auto-start opencode in each session`)
    console.log(`[mouse-relay] Set MOUSE_AUTO_OPENCODE=0 to disable`)
  }
})
