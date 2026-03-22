const CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID as string
const SCOPE = 'codespace user:email'

export interface DeviceCodeResponse {
  device_code: string
  user_code: string
  verification_uri: string
  expires_in: number
  interval: number
}

export interface GitHubUser {
  login: string
  name: string
  avatar_url: string
}

const TOKEN_KEY = 'mouse_gh_token'
const USER_KEY = 'mouse_gh_user'

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser(): GitHubUser | null {
  const raw = localStorage.getItem(USER_KEY)
  return raw ? JSON.parse(raw) : null
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export async function requestDeviceCode(): Promise<DeviceCodeResponse> {
  const res = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CLIENT_ID, scope: SCOPE }),
  })
  if (!res.ok) throw new Error(`Device code request failed: ${res.status}`)
  return res.json()
}

export async function pollForToken(deviceCode: string, intervalSecs: number): Promise<string> {
  const delay = (ms: number) => new Promise(r => setTimeout(r, ms))
  // Minimum 5s poll interval per GitHub spec
  const ms = Math.max(intervalSecs, 5) * 1000

  for (let attempt = 0; attempt < 60; attempt++) {
    await delay(ms)
    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    })
    const data = await res.json()
    if (data.access_token) {
      localStorage.setItem(TOKEN_KEY, data.access_token)
      // Fetch and store user profile
      const user = await fetchUser(data.access_token)
      localStorage.setItem(USER_KEY, JSON.stringify(user))
      return data.access_token
    }
    if (data.error === 'expired_token') throw new Error('Device code expired. Please try again.')
    if (data.error === 'access_denied') throw new Error('Authorization was denied.')
    if (data.error === 'slow_down') await delay(5000)
    // authorization_pending → keep polling
  }
  throw new Error('Timed out waiting for authorization.')
}

export async function fetchUser(token: string): Promise<GitHubUser> {
  const res = await fetch('https://api.github.com/user', {
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json' },
  })
  if (!res.ok) throw new Error('Failed to fetch user profile')
  return res.json()
}

export async function validateToken(token: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    return res.ok
  } catch {
    return false
  }
}
