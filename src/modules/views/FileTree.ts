type FileNode = { name: string; icon: string; cls: string; indent: number; expanded?: boolean; children?: FileNode[] }

const TREE: FileNode[] = [
  { name: 'src', icon: '▶', cls: 'fi-dir', indent: 0 },
  { name: 'agents', icon: '▶', cls: 'fi-dir', indent: 1 },
  { name: 'Agent.ts', icon: '◆', cls: 'fi-ts', indent: 2 },
  { name: 'AgentPanel.ts', icon: '◆', cls: 'fi-ts', indent: 2 },
  { name: 'components', icon: '▶', cls: 'fi-dir', indent: 1 },
  { name: 'BottomBar.ts', icon: '◆', cls: 'fi-ts', indent: 2 },
  { name: 'gestures', icon: '▶', cls: 'fi-dir', indent: 1 },
  { name: 'index.ts', icon: '◆', cls: 'fi-ts', indent: 2 },
  { name: 'modules', icon: '▶', cls: 'fi-dir', indent: 1 },
  { name: 'views', icon: '▶', cls: 'fi-dir', indent: 2 },
  { name: 'CodeEditor.ts', icon: '◆', cls: 'fi-ts', indent: 3 },
  { name: 'FileTree.ts', icon: '◆', cls: 'fi-ts', indent: 3 },
  { name: 'GitChanges.ts', icon: '◆', cls: 'fi-ts', indent: 3 },
  { name: 'GitGraph.ts', icon: '◆', cls: 'fi-ts', indent: 3 },
  { name: 'Terminal.ts', icon: '◆', cls: 'fi-ts', indent: 3 },
  { name: 'Module.ts', icon: '◆', cls: 'fi-ts', indent: 2 },
  { name: 'ModuleStack.ts', icon: '◆', cls: 'fi-ts', indent: 2 },
  { name: 'app.ts', icon: '◆', cls: 'fi-ts', indent: 1 },
  { name: 'main.ts', icon: '◆', cls: 'fi-ts', indent: 1 },
  { name: 'style.css', icon: '◆', cls: 'fi-css', indent: 1 },
  { name: '.env.example', icon: '◆', cls: 'fi-env', indent: 0 },
  { name: '.gitignore', icon: '◆', cls: 'fi-git', indent: 0 },
  { name: 'package.json', icon: '◆', cls: 'fi-json', indent: 0 },
  { name: 'README.md', icon: '◆', cls: 'fi-md', indent: 0 },
  { name: 'tsconfig.json', icon: '◆', cls: 'fi-json', indent: 0 },
]

export class FileTreeView {
  el: HTMLElement
  private selected: HTMLElement | null = null

  constructor() {
    this.el = document.createElement('div')
    this.el.className = 'view-files'
    this.render()
  }

  private render() {
    TREE.forEach(node => {
      const item = document.createElement('div')
      item.className = `file-item ind${node.indent}`
      item.innerHTML = `
        <span class="fi ${node.cls}">${node.icon}</span>
        <span>${node.name}</span>
      `
      item.addEventListener('click', () => {
        if (this.selected) this.selected.classList.remove('selected')
        item.classList.add('selected')
        this.selected = item
      })
      this.el.appendChild(item)
    })
  }
}
