const STAGED = [
  { name: 'README.md', add: 9, del: 2, icon: 'ℹ' },
]
const UNSTAGED = [
  { name: 'src/modules/Module.ts', add: 34, del: 12, icon: '◆' },
  { name: 'src/style.css', add: 18, del: 4, icon: '◆' },
  { name: 'src/app.ts', add: 8, del: 0, icon: '◆' },
]

export class GitChangesView {
  el: HTMLElement

  constructor() {
    this.el = document.createElement('div')
    this.el.className = 'view-changes'
    this.render()
  }

  private render() {
    this.el.innerHTML = `
      <div class="changes-header">
        <span class="changes-label">CHANGES</span>
        <span class="changes-sparkle">✦</span>
      </div>
      <div class="commit-area">
        <div class="commit-msg">feat: add modular swipe panel system with glass UI</div>
        <div class="commit-btn-row">
          <button class="commit-btn">
            <span>✓</span> Commit
          </button>
          <button class="commit-btn-drop">▾</button>
        </div>
      </div>
      <div class="changes-files-area">
        <div class="changes-section-hdr">
          <span>Changes</span>
          <span class="changes-count">${STAGED.length}</span>
        </div>
        ${STAGED.map(f => fileRow(f)).join('')}
        <div class="changes-section-hdr" style="margin-top:4px">
          <span>Untracked / Modified</span>
          <span class="changes-count">${UNSTAGED.length}</span>
        </div>
        ${UNSTAGED.map(f => fileRow(f)).join('')}
      </div>
    `

    this.el.querySelector('.commit-btn')?.addEventListener('click', () => {
      const btn = this.el.querySelector('.commit-btn') as HTMLButtonElement
      btn.textContent = '✓ Committed!'
      btn.style.background = 'var(--green)'
      setTimeout(() => {
        btn.innerHTML = '<span>✓</span> Commit'
        btn.style.background = ''
      }, 2000)
    })
  }
}

function fileRow(f: { name: string; add: number; del: number; icon: string }) {
  return `
    <div class="changed-file">
      <div class="changed-file-name">
        <span style="color:var(--blue)">${f.icon}</span>
        <span>${f.name.split('/').pop()}</span>
      </div>
      <div class="changed-file-stats">
        <span class="stat-add">+${f.add}</span>
        <span style="color:var(--text-faint)">, </span>
        <span class="stat-del">-${f.del}</span>
      </div>
    </div>
  `
}
