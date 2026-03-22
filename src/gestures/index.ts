export function onLiveSwipe(
  el: HTMLElement,
  onDrag: (dx: number) => void,
  onRelease: (dx: number) => void,
): () => void {
  let sx = 0, sy = 0
  let locked: 'h' | 'v' | null = null
  let active = false

  const ts = (e: TouchEvent) => {
    sx = e.touches[0].clientX; sy = e.touches[0].clientY
    locked = null; active = true
  }
  const tm = (e: TouchEvent) => {
    if (!active) return
    const dx = e.touches[0].clientX - sx
    const dy = e.touches[0].clientY - sy
    if (!locked) {
      if (Math.abs(dx) > 8) locked = 'h'
      else if (Math.abs(dy) > 8) locked = 'v'
    }
    if (locked === 'h') { e.preventDefault(); onDrag(dx) }
  }
  const te = (e: TouchEvent) => {
    if (!active) return
    if (locked === 'h') onRelease(e.changedTouches[0].clientX - sx)
    active = false
  }

  el.addEventListener('touchstart', ts, { passive: true })
  el.addEventListener('touchmove', tm, { passive: false })
  el.addEventListener('touchend', te, { passive: true })
  return () => {
    el.removeEventListener('touchstart', ts)
    el.removeEventListener('touchmove', tm)
    el.removeEventListener('touchend', te)
  }
}

export function onDragY(
  el: HTMLElement,
  cb: (dy: number) => void,
): () => void {
  let lastY = 0, dragging = false

  const start = (y: number) => { lastY = y; dragging = true }
  const move = (y: number) => { if (!dragging) return; cb(y - lastY); lastY = y }
  const end = () => { dragging = false }

  const ts = (e: TouchEvent) => { e.preventDefault(); start(e.touches[0].clientY) }
  const tm = (e: TouchEvent) => { e.preventDefault(); move(e.touches[0].clientY) }
  const ms = (e: MouseEvent) => { e.preventDefault(); start(e.clientY) }
  const mm = (e: MouseEvent) => { if (dragging) move(e.clientY) }

  el.addEventListener('touchstart', ts, { passive: false })
  el.addEventListener('touchmove', tm, { passive: false })
  el.addEventListener('touchend', end)
  el.addEventListener('mousedown', ms)
  window.addEventListener('mousemove', mm)
  window.addEventListener('mouseup', end)
  return () => {
    el.removeEventListener('touchstart', ts)
    el.removeEventListener('touchmove', tm)
    el.removeEventListener('touchend', end)
    el.removeEventListener('mousedown', ms)
    window.removeEventListener('mousemove', mm)
    window.removeEventListener('mouseup', end)
  }
}

export function onPinchSpread(
  el: HTMLElement,
  cb: (type: 'pinch' | 'spread') => void,
  threshold = 50,
): () => void {
  let startDist = 0, fired = false
  const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
  const ts = (e: TouchEvent) => { if (e.touches.length === 2) { startDist = dist(e.touches); fired = false } }
  const tm = (e: TouchEvent) => {
    if (e.touches.length !== 2 || fired) return
    const delta = dist(e.touches) - startDist
    if (Math.abs(delta) > threshold) { cb(delta > 0 ? 'spread' : 'pinch'); fired = true }
  }
  const te = () => { startDist = 0; fired = false }
  el.addEventListener('touchstart', ts, { passive: true })
  el.addEventListener('touchmove', tm, { passive: true })
  el.addEventListener('touchend', te, { passive: true })
  return () => {
    el.removeEventListener('touchstart', ts)
    el.removeEventListener('touchmove', tm)
    el.removeEventListener('touchend', te)
  }
}
