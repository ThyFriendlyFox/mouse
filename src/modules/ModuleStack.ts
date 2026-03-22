import { Module } from './Module.ts'
import type { ViewType } from './Module.ts'
import type { RelaySocket } from '../terminal/RelaySocket.ts'
import { onDragY, onPinchSpread } from '../gestures/index.ts'

const INITIAL_VIEWS: ViewType[] = ['code', 'changes']
const MIN_FLEX = 0.5
const ADD_ANIM_MS = 300

export class ModuleStack {
  el: HTMLElement
  private modules: Module[] = []
  private flexes: number[] = []
  private cleanups: (() => void)[] = []

  constructor() {
    this.el = document.createElement('div')
    this.el.className = 'module-stack'
    INITIAL_VIEWS.forEach(v => this.addModule(v, false))
    this.bindPinchSpread()
  }

  private addModule(view: ViewType, animate = true) {
    const mod = new Module(view)
    if (animate) {
      mod.el.style.transition = `flex ${ADD_ANIM_MS}ms cubic-bezier(0.34,1.56,0.64,1), opacity ${ADD_ANIM_MS}ms`
      mod.el.style.opacity = '0'
      mod.el.style.flex = '0'
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          mod.el.style.opacity = '1'
          mod.el.style.flex = '1'
          setTimeout(() => { mod.el.style.transition = '' }, ADD_ANIM_MS)
        })
      })
    }

    this.modules.push(mod)
    this.flexes.push(1)

    if (this.modules.length > 1) {
      const divider = this.makeDivider(this.modules.length - 2)
      this.el.appendChild(divider)
    }
    this.el.appendChild(mod.el)
    this.applyFlex()
  }

  private removeModule(index: number, animate = true) {
    if (this.modules.length <= 1) return
    const mod = this.modules[index]
    const doRemove = () => {
      mod.destroy()
      this.modules.splice(index, 1)
      this.flexes.splice(index, 1)
      this.rebuildDOM()
    }
    if (animate) {
      mod.el.style.transition = `flex ${ADD_ANIM_MS}ms ease, opacity ${ADD_ANIM_MS}ms ease`
      mod.el.style.opacity = '0'
      mod.el.style.flex = '0'
      mod.el.style.minHeight = '0'
      setTimeout(doRemove, ADD_ANIM_MS)
    } else {
      doRemove()
    }
  }

  private rebuildDOM() {
    // Cleanup existing divider listeners
    this.cleanups.forEach(c => c())
    this.cleanups = []
    this.el.innerHTML = ''
    this.modules.forEach((mod, i) => {
      if (i > 0) {
        const div = this.makeDivider(i - 1)
        this.el.appendChild(div)
      }
      this.el.appendChild(mod.el)
    })
    this.applyFlex()
  }

  private makeDivider(aboveIndex: number): HTMLElement {
    const d = document.createElement('div')
    d.className = 'module-divider'

    const cleanup = onDragY(d, (dy) => {
      d.classList.add('dragging')
      const total = this.flexes[aboveIndex] + this.flexes[aboveIndex + 1]
      const stackH = this.el.offsetHeight
      const perFlex = stackH / this.flexes.reduce((a, b) => a + b, 0)
      const delta = dy / perFlex
      const newA = Math.max(MIN_FLEX, this.flexes[aboveIndex] + delta)
      const newB = Math.max(MIN_FLEX, this.flexes[aboveIndex + 1] - delta)
      if (newA + newB <= total + 0.01) {
        this.flexes[aboveIndex] = newA
        this.flexes[aboveIndex + 1] = newB
        this.applyFlex()
      }
    })

    d.addEventListener('mouseup', () => d.classList.remove('dragging'))
    d.addEventListener('touchend', () => d.classList.remove('dragging'))
    this.cleanups.push(cleanup)
    return d
  }

  private applyFlex() {
    this.modules.forEach((mod, i) => {
      mod.el.style.flex = String(this.flexes[i])
    })
  }

  setRelay(relay: RelaySocket) {
    this.modules.forEach(m => m.setRelay(relay))
  }

  fitTerminals() {
    this.modules.forEach(m => m.fitTerminal())
  }

  private bindPinchSpread() {
    onPinchSpread(this.el, (type) => {
      if (type === 'spread') {
        const views: ViewType[] = ['graph', 'terminal', 'files', 'changes', 'code']
        const v = views[this.modules.length % views.length]
        this.addModule(v, true)
      } else {
        // Remove the last module
        if (this.modules.length > 1) this.removeModule(this.modules.length - 1, true)
      }
    })
  }
}
