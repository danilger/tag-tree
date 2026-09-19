export type FileTreeNode = {
  id: string
  name: string
  /** True for files (leaves); folders have children. */
  isFile: boolean
  children?: FileTreeNode[]
}

type MutableDir = {
  id: string
  name: string
  isFile: false
  children: Map<string, MutableDir | MutableFile>
}

type MutableFile = {
  id: string
  name: string
  isFile: true
}

function sortChildren(
  entries: Array<MutableDir | MutableFile>,
): FileTreeNode[] {
  entries.sort((a, b) => {
    if (a.isFile !== b.isFile) return a.isFile ? 1 : -1
    return a.name.localeCompare(b.name)
  })
  return entries.map((entry) => {
    if (entry.isFile) {
      return { id: entry.id, name: entry.name, isFile: true }
    }
    return {
      id: entry.id,
      name: entry.name,
      isFile: false,
      children: sortChildren([...entry.children.values()]),
    }
  })
}

/**
 * Build a folder tree from graph node paths (relative to --root).
 */
export function pathsToTree(paths: string[]): FileTreeNode[] {
  const root: MutableDir = {
    id: '',
    name: '',
    isFile: false,
    children: new Map(),
  }

  for (const raw of paths) {
    const path = raw.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
    if (!path) continue
    const parts = path.split('/').filter(Boolean)
    if (parts.length === 0) continue

    let current = root
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1
      const id = parts.slice(0, i + 1).join('/')

      if (isLast) {
        current.children.set(part, {
          id,
          name: part,
          isFile: true,
        })
      } else {
        let next = current.children.get(part)
        if (!next || next.isFile) {
          next = {
            id,
            name: part,
            isFile: false,
            children: new Map(),
          }
          current.children.set(part, next)
        }
        current = next as MutableDir
      }
    }
  }

  return sortChildren([...root.children.values()])
}
