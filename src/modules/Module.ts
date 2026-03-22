import { onLiveSwipe } from '../gestures/index.ts'
import { CodeEditorView } from './views/CodeEditor.ts'
import { FileTreeView } from './views/FileTree.ts'
import { GitChangesView } from './views/GitChanges.ts'
import { GitGraphView } from './views/GitGraph.ts'
import { XTermView } from '../terminal/XTermView.ts'
import type { RelaySocket } from '../terminal/RelaySocket.ts'

export type ViewType = 'code' | 'files' | 'changes' | 'graph' | 'terminal'
const VIEWS: ViewType[] = ['code', 'files', 'changes', 'graph', 'terminal']

export class Module {
  el: HTMLElement
  private contentEl: HTMLElement
  private trackEl: HTMLElement
  private dotsEl: HTMLElement
  private viewIndex: number
  private instances: Partial<Record<ViewType, { el: HTMLElement }>> = {}
  private xtermView: XTermView | null = null
  private cleanup: (() => void) | null = null

  constructor(initialView: ViewType = 'code') {
    this.viewIndex = VIEWS.indexOf(initialView)

    this.el = document.createElement('div')
    this.el.className = 'module'

    this.contentEl = document.createElement('div')
    this.contentEl.className = 'module-content'

    this.trackEl = document.createElement('div')
    this.trackEl.className = 'view-track'
    this.trackEl.style.width = `${VIEWS.length * 100}%`
    this.trackEl.style.transition = 'transform 0.28s cubic-bezier(0.25,0.46,0.45,0.94)'
    this.trackEl.style.transform = `translateX(-${this.viewIndex * (100 / VIEWS.length)}%)`

    VIEWS.forEach((v) => {
      const slot = document.createElement('div')
      slot.className = 'view-slot'
      slot.style.width = `${100 / VIEWS.length}%`
      slot.dataset.view = v
      this.trackEl.appendChild(slot)
    })

    this.dotsEl = document.createElement('div')
    this.dotsEl.className = 'pager-dots'
    VIEWS.forEach((_, idx) => {
      const d = document.createElement('div')
      d.className = `pager-dot${idx === this.viewIndex ? ' active' : ''}`
      d.addEventListener('click', () => this.goTo(idx))
      this.dotsEl.appendChild(d)
    })

    this.contentEl.appendChild(this.trackEl)
    this.contentEl.appendChild(this.dotsEl)
    this.el.appendChild(this.contentEl)

    this.mountView(this.viewIndex)
    this.bindGestures()
  }

  private getSlot(i: number): HTMLElement {
    return this.trackEl.children[i] as HTMLElement
  }

  private mountView(i: number) {
    const v = VIEWS[i]
    if (this.instances[v]) return
    const view = this.createView(v)
    this.instances[v] = view
    this.getSlot(i).appendChild(view.el)
    // XTermView must be mounted after appended to DOM
    if (v === 'terminal' && view instanceof XTermView) {
      this.xtermView = view
      view.mount()
    }
  }

  private createView(v: ViewType) {
    switch (v) {
      case 'code':     return new CodeEditorView()
      case 'files':    return new FileTreeView()
      case 'changes':  return new GitChangesView()
      case 'graph':    return new GitGraphView()
      case 'terminal': return new XTermView()
    }
  }

  setRelay(relay: RelaySocket) {
    // Mount the terminal view if not yet mounted, then attach relay
    this.mountView(VIEWS.indexOf('terminal'))
    this.xtermView?.setRelay(relay)
  }

  fitTerminal() {
    this.xtermView?.fit()
  }

  private goTo(i: number) {
    if (i === this.viewIndex) return
    this.mountView(i)
    this.viewIndex = i
    this.trackEl.style.transform = `translateX(-${i * (100 / VIEWS.length)}%)`
    this.updateDots()
    // Fit terminal if switching to it
    if (VIEWS[i] === 'terminal') setTimeout(() => this.xtermView?.fit(), 30)
  }

  private updateDots() {
    Array.from(this.dotsEl.children).forEach((d, i) => {
      d.classList.toggle('active', i === this.viewIndex)
    })
  }

  private bindGestures() {
    const width = () => this.contentEl.offsetWidth || 300
    let startIndex = 0
    let dragging = false

    this.cleanup = onLiveSwipe(
      this.contentEl,
      (dx) => {
        if (!dragging) { startIndex = this.viewIndex; dragging = true }
        const pct = (100 / VIEWS.length)
        const offset = (startIndex * pct) - (dx / width() * 100 / VIEWS.length * VIEWS.length)
        const clamped = Math.max(0, Math.min((VIEWS.length - 1) * pct, offset))
        this.trackEl.style.transition = 'none'
        this.trackEl.style.transform = `translateX(-${clamped}%)`
        const projected = Math.round(startIndex - dx / width() * VIEWS.length)
        this.mountView(Math.max(0, Math.min(VIEWS.length - 1, projected)))
      },
      (dx) => {
        dragging = false
        this.trackEl.style.transition = 'transform 0.28s cubic-bezier(0.25,0.46,0.45,0.94)'
        const threshold = width() * 0.28
        if (dx < -threshold && this.viewIndex < VIEWS.length - 1) this.goTo(this.viewIndex + 1)
        else if (dx > threshold && this.viewIndex > 0) this.goTo(this.viewIndex - 1)
        else this.goTo(this.viewIndex)
      }
    )
  }

  destroy() {
    this.cleanup?.()
    this.xtermView?.destroy()
  }

  getView(): ViewType { return VIEWS[this.viewIndex] }
}
