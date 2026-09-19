export type ConfigTag = {
  tag: string
  label: string
  description?: string
  color?: string
}

export type ConfigNode = {
  path: string
  color?: string
  textColor?: string
  bgColor?: string
  title?: string
  description?: string
  /** Curated logical deps for AI subtree focus (paths relative to --root). */
  ai_subtree_nodes?: string[]
}

export type GraphNode = {
  id: string
  tags: string[]
}

export type GraphEdge = {
  source: string
  target: string
}

export type GraphData = {
  root: string
  configPath?: string
  fileBase: string | null
  displayPrefix: string
  generatedAt: string
  nodes: GraphNode[]
  edges: GraphEdge[]
  configTags: ConfigTag[]
  configNodes?: ConfigNode[]
}

export type ViewMode = 'highlight' | 'isolate' | 'changed' | 'notes'

/** How multiple selected tags combine: any = OR, all = AND (intersection). */
export type TagMatchMode = 'any' | 'all'

export type FilePayload = {
  path: string
  displayPath: string
  fileUri: string | null
  language: string
  content: string
}

/** Line-anchored note on a change-set node (current-file 1-based line). */
export type ChangeNote = {
  line: number
  text: string
}

/** One contiguous hunk from an agent change set. */
export type ChangeHunk = {
  path: string
  comment?: string
  /** Optional per-line notes (agent-authored; current-file lines). */
  notes?: ChangeNote[]
  /** Inclusive 1-based line range in the current file. */
  from: number
  to: number
  /** Original line numbers as stored in JSON (for decorations). */
  rows: number[]
  prev_row?: string
}

export type ChangeSetSummary = {
  id: string
  label: string
  fileName: string
}

/** Set-level AI review guide (agent-authored). */
export type ChangeReview = {
  goal: string
  order: string[]
}

export type ChangeSet = ChangeSetSummary & {
  nodes: ChangeHunk[]
  review?: ChangeReview
}

/** Set-level AI notes viewing map (agent-authored). */
export type NoteGuide = {
  goal: string
  order: string[]
}

/** One file entry in an AI note (no Diff / prev_row required). */
export type NoteNode = {
  path: string
  comment?: string
  notes?: ChangeNote[]
}

export type NoteSummary = {
  id: string
  label: string
  fileName: string
}

export type NoteSet = NoteSummary & {
  guide: NoteGuide
  nodes: NoteNode[]
}
