#!/usr/bin/env node
/**
 * tag-tree / tag_tree CLI
 *
 *   tag_tree init [--agent cursor|pi|both] [--force] [--cwd <project>]
 *   tag_tree help
 */
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SKILL_TEMPLATE = path.join(appDir, 'templates', 'agent-skill', 'SKILL.md')
const COMMAND_TEMPLATES_DIR = path.join(appDir, 'templates', 'agent-command')

const AGENT_SKILL_TARGETS = {
  cursor: path.join('.cursor', 'skills', 'tag-tree', 'SKILL.md'),
  pi: path.join('.pi', 'skills', 'tag-tree', 'SKILL.md'),
}

/** Shared workflow templates → Cursor commands + Pi prompt templates. */
const WORKFLOW_COMMANDS = [
  {
    id: 'tag-tree-ai-subtree',
    template: path.join(COMMAND_TEMPLATES_DIR, 'tag-tree-ai-subtree.md'),
    argumentHint: '[path]',
  },
  {
    id: 'tag-tree-explain',
    template: path.join(COMMAND_TEMPLATES_DIR, 'tag-tree-explain.md'),
    argumentHint: '[change-set-id]',
  },
  {
    id: 'tag-tree-note',
    template: path.join(COMMAND_TEMPLATES_DIR, 'tag-tree-note.md'),
    argumentHint: '[note-id] [topic…]',
  },
]

function usage() {
  console.log(`Usage:
  tag_tree init [--agent cursor|pi|both] [--force] [--cwd <project-root>]
  tag_tree help

Installs a project skill and workflow slash commands:
  cursor → skill + .cursor/commands/
  pi     → skill + .pi/prompts/ (prompt templates)
  both   → all of the above

  --agent   cursor | pi | both (interactive prompt if omitted)
  --force   overwrite existing skill / command / prompt files
  --cwd     parent project root (default: auto-detect)
`)
}

function parseArgs(argv) {
  const args = {
    command: null,
    agent: null,
    force: false,
    cwd: null,
    help: false,
  }
  const rest = [...argv]
  if (rest.length === 0) {
    args.help = true
    return args
  }
  args.command = rest.shift()
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]
    if (a === '--agent' && rest[i + 1]) args.agent = rest[++i]
    else if (a === '--cwd' && rest[i + 1]) args.cwd = rest[++i]
    else if (a === '--force') args.force = true
    else if (a === '--help' || a === '-h') args.help = true
  }
  return args
}

function isTagTreePackageDir(dir) {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(dir, 'package.json'), 'utf8'),
    )
    return pkg.name === 'tag-tree'
  } catch {
    return false
  }
}

function resolveParentRoot(explicitCwd) {
  if (explicitCwd) {
    return path.resolve(explicitCwd)
  }
  const cwd = process.cwd()
  const base = path.basename(cwd)
  if (base === '.tag_tree' || isTagTreePackageDir(cwd)) {
    return path.dirname(cwd)
  }
  return cwd
}

function askAgent() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  return new Promise((resolve) => {
    rl.question('Install skill for which agent? [cursor / pi / both]: ', (answer) => {
      rl.close()
      resolve(String(answer || '').trim().toLowerCase())
    })
  })
}

function normalizeAgent(value) {
  const v = String(value || '').trim().toLowerCase()
  if (v === 'cursor' || v === 'pi' || v === 'both') return v
  return null
}

function agentsToInstall(agent) {
  if (agent === 'both') return ['cursor', 'pi']
  return [agent]
}

function writeTextFile(dest, contents, force) {
  if (fs.existsSync(dest) && !force) {
    throw new Error(
      `Already exists: ${dest}\nRe-run with --force to overwrite.`,
    )
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, contents, 'utf8')
  return dest
}

function installFile(template, dest, force) {
  if (!fs.existsSync(template)) {
    throw new Error(`Template missing: ${template}`)
  }
  return writeTextFile(dest, fs.readFileSync(template, 'utf8'), force)
}

function installSkill(parentRoot, agent, force) {
  const relative = AGENT_SKILL_TARGETS[agent]
  return installFile(SKILL_TEMPLATE, path.join(parentRoot, relative), force)
}

/**
 * Split Cursor-style YAML frontmatter from body.
 * @returns {{ description: string, body: string }}
 */
function parseCommandTemplate(raw) {
  const text = raw.replace(/^\uFEFF/, '')
  if (!text.startsWith('---')) {
    return { description: '', body: text.trimStart() }
  }
  const end = text.indexOf('\n---', 3)
  if (end === -1) {
    return { description: '', body: text.trimStart() }
  }
  const fm = text.slice(3, end).trim()
  const body = text.slice(end + 4).replace(/^\r?\n/, '')
  let description = ''
  for (const line of fm.split(/\r?\n/)) {
    const m = line.match(/^description:\s*(.*)$/)
    if (!m) continue
    let v = m[1].trim()
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    description = v
    break
  }
  return { description, body }
}

/** Cursor: copy templates into `.cursor/commands/`. */
function installCursorCommands(parentRoot, force) {
  const written = []
  for (const item of WORKFLOW_COMMANDS) {
    written.push(
      installFile(
        item.template,
        path.join(parentRoot, '.cursor', 'commands', `${item.id}.md`),
        force,
      ),
    )
  }
  return written
}

/**
 * Pi: prompt templates in `.pi/prompts/` (filename → `/id`).
 * Frontmatter uses Pi fields; body keeps shared workflow steps.
 */
function installPiPrompts(parentRoot, force) {
  const written = []
  for (const item of WORKFLOW_COMMANDS) {
    if (!fs.existsSync(item.template)) {
      throw new Error(`Template missing: ${item.template}`)
    }
    const raw = fs.readFileSync(item.template, 'utf8')
    const { description, body } = parseCommandTemplate(raw)
    const desc =
      description ||
      `tag-tree workflow: ${item.id}`
    const contents = `---
description: ${JSON.stringify(desc)}
argument-hint: ${JSON.stringify(item.argumentHint)}
---

Slash arguments (expanded by Pi): $@

${body.trimStart()}`
    written.push(
      writeTextFile(
        path.join(parentRoot, '.pi', 'prompts', `${item.id}.md`),
        contents,
        force,
      ),
    )
  }
  return written
}

async function cmdInit(args) {
  if (!fs.existsSync(SKILL_TEMPLATE)) {
    console.error(`Skill template missing: ${SKILL_TEMPLATE}`)
    process.exit(1)
  }

  let agent = normalizeAgent(args.agent)
  if (!agent) {
    if (args.agent) {
      console.error(`Invalid --agent "${args.agent}". Use cursor, pi, or both.`)
      process.exit(1)
    }
    if (!process.stdin.isTTY) {
      console.error('Pass --agent cursor|pi|both when stdin is not a TTY.')
      process.exit(1)
    }
    agent = normalizeAgent(await askAgent())
    if (!agent) {
      console.error('Expected cursor, pi, or both.')
      process.exit(1)
    }
  }

  const parentRoot = resolveParentRoot(args.cwd)
  console.log(`Parent project: ${parentRoot}`)

  const installed = []
  for (const name of agentsToInstall(agent)) {
    try {
      const dest = installSkill(parentRoot, name, args.force)
      installed.push(dest)
      console.log(`Installed skill (${name}): ${dest}`)
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err))
      process.exit(1)
    }
  }

  if (agent === 'cursor' || agent === 'both') {
    try {
      for (const dest of installCursorCommands(parentRoot, args.force)) {
        installed.push(dest)
        console.log(`Installed command (cursor): ${dest}`)
      }
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err))
      process.exit(1)
    }
  }

  if (agent === 'pi' || agent === 'both') {
    try {
      for (const dest of installPiPrompts(parentRoot, args.force)) {
        installed.push(dest)
        console.log(`Installed prompt (pi): ${dest}`)
      }
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err))
      process.exit(1)
    }
  }

  console.log(`Done. ${installed.length} file(s) written.`)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help || args.command === 'help' || args.command === '--help') {
    usage()
    process.exit(0)
  }

  if (args.command === 'init') {
    await cmdInit(args)
    return
  }

  console.error(`Unknown command: ${args.command}`)
  usage()
  process.exit(1)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
