#!/usr/bin/env node
/**
 * Analyze --root then start Vite UI.
 *
 * Usage:
 *   npm start -- --root ../src [--port 5174] [--config ./config.json]
 *              [--file-base file:///D:/project/frontend/] [--display-prefix src]
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function parseArgs(argv) {
  const args = {
    root: null,
    port: '5174',
    config: path.join(appDir, 'config.json'),
    fileBase: null,
    displayPrefix: null,
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--root' && argv[i + 1]) args.root = argv[++i]
    else if (a === '--port' && argv[i + 1]) args.port = argv[++i]
    else if (a === '--config' && argv[i + 1]) args.config = argv[++i]
    else if (a === '--file-base' && argv[i + 1]) args.fileBase = argv[++i]
    else if (a === '--display-prefix' && argv[i + 1]) args.displayPrefix = argv[++i]
    else if (a === '--help' || a === '-h') args.help = true
  }
  return args
}

function usage() {
  console.log(`Usage: npm start -- --root <path> [options]

  --root              Directory to scan (required), e.g. ../src
  --port              Dev server port (default: 5174)
  --config            Tag catalog JSON (default: ./config.json)
  --file-base         Client file URI prefix for IDE links
  --display-prefix    Prefix joined to node ids in the UI (e.g. src)
`)
}

function runNode(script, scriptArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...scriptArgs], {
      cwd: appDir,
      stdio: 'inherit',
    })
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${path.basename(script)} exited with ${code}`))
    })
  })
}

function resolveViteBin() {
  const viteJs = path.join(appDir, 'node_modules', 'vite', 'bin', 'vite.js')
  if (fs.existsSync(viteJs)) return viteJs
  throw new Error('vite not found — run npm install in .tag_tree')
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help || !args.root) {
    usage()
    process.exit(args.help ? 0 : 1)
  }

  const analyzeArgs = [
    '--root',
    path.resolve(process.cwd(), args.root),
    '--config',
    path.resolve(process.cwd(), args.config),
  ]
  if (args.fileBase) {
    analyzeArgs.push('--file-base', args.fileBase)
  }
  if (args.displayPrefix) {
    analyzeArgs.push('--display-prefix', args.displayPrefix)
  }

  const analyzeScript = path.join(appDir, 'scripts', 'analyze.mjs')
  await runNode(analyzeScript, analyzeArgs)

  const vite = spawn(
    process.execPath,
    [resolveViteBin(), '--port', String(args.port)],
    {
      cwd: appDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        TAG_TREE_PORT: String(args.port),
      },
    },
  )

  vite.on('exit', (code) => process.exit(code ?? 0))
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
