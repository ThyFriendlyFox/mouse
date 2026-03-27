const RING_KEY = 'mouse_auth_debug_ring'
const MAX_LINES = 80

function formatLine(level: string, message: string, extra?: Record<string, unknown>): string {
  const suffix = extra && Object.keys(extra).length > 0 ? ` ${JSON.stringify(extra)}` : ''
  return `[${new Date().toISOString()}] [mouse:auth:${level}] ${message}${suffix}`
}

export function authLog(level: 'info' | 'warn' | 'error', message: string, extra?: Record<string, unknown>): void {
  const line = formatLine(level, message, extra)
  if (level === 'info') console.info(line)
  else if (level === 'warn') console.warn(line)
  else console.error(line)

  try {
    const raw = sessionStorage.getItem(RING_KEY)
    const arr: string[] = raw ? JSON.parse(raw) : []
    arr.push(line)
    while (arr.length > MAX_LINES) arr.shift()
    sessionStorage.setItem(RING_KEY, JSON.stringify(arr))
  } catch {
    /* ignore quota / private mode */
  }
}

export function getAuthDebugLog(): string {
  try {
    const raw = sessionStorage.getItem(RING_KEY)
    if (!raw) return ''
    const arr = JSON.parse(raw) as string[]
    return Array.isArray(arr) ? arr.join('\n') : ''
  } catch {
    return ''
  }
}

export function clearAuthDebugLog(): void {
  try {
    sessionStorage.removeItem(RING_KEY)
  } catch {
    /* ignore */
  }
}
