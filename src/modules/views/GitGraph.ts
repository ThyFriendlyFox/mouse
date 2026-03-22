const COMMITS = [
  { msg: 'feat: add modular swipe panel system', dot: '#f472b6', tags: ['main', 'origin/main'] },
  { msg: 'fix: auto-resolve touch event conflicts', dot: '#f87171', tags: [] },
  { msg: 'fix: remove legacy counter component', dot: '#60a5fa', tags: [] },
  { msg: 'feat: add GitHub Codespaces terminal', dot: '#a855f7', tags: [] },
  { msg: 'fix: use opencode for agent backend', dot: '#4ade80', tags: [] },
  { msg: 'feat: add agent panel status bars', dot: '#f59e0b', tags: [] },
  { msg: 'fix: pinch-spread gesture threshold', dot: '#60a5fa', tags: [] },
  { msg: 'feat: add voice-to-bash translation', dot: '#a855f7', tags: [] },
  { msg: 'fix: module resize handle drag events', dot: '#f87171', tags: [] },
  { msg: 'init: vite + electron + capacitor', dot: '#4ade80', tags: ['v0.1.0'] },
]

export class GitGraphView {
  el: HTMLElement

  constructor() {
    this.el = document.createElement('div')
    this.el.className = 'view-graph'
    this.render()
  }

  private render() {
    const hdr = document.createElement('div')
    hdr.className = 'graph-hdr'
    hdr.innerHTML = `
      <span class="graph-label">GRAPH</span>
      <span class="graph-auto">↺ Auto</span>
      <div class="graph-tools">
        <span class="graph-tool">⎇</span>
        <span class="graph-tool">⚙</span>
        <span class="graph-tool">↑</span>
        <span class="graph-tool">↓</span>
        <span class="graph-tool">↺</span>
      </div>
    `

    const list = document.createElement('div')
    list.className = 'graph-commits'

    COMMITS.forEach((c) => {
      const row = document.createElement('div')
      row.className = 'graph-row'

      const tags = c.tags.map(t => {
        const cls = t === 'main' ? 'git-tag-main' : t.startsWith('origin') ? 'git-tag-origin' : ''
        return `<span class="git-tag ${cls}">${t}</span>`
      }).join('')

      row.innerHTML = `
        <div class="graph-dot" style="background:${c.dot};box-shadow:0 0 6px ${c.dot}44"></div>
        <div class="graph-row-info">
          <div class="graph-row-msg">${c.msg}</div>
          ${tags ? `<div class="graph-row-meta">${tags}</div>` : ''}
        </div>
      `
      list.appendChild(row)
    })

    this.el.appendChild(hdr)
    this.el.appendChild(list)
  }
}
