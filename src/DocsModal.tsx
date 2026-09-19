import { useEffect, useId } from 'react'

type DocsModalProps = {
  open: boolean
  onClose: () => void
}

/**
 * In-app documentation modal with usage instructions.
 */
export function DocsModal({ open, onClose }: DocsModalProps) {
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-panel docs-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id={titleId}>Documentation</h2>
          <button type="button" className="toolbar-btn" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="modal-body docs-body">
          <section>
            <h3>Overview</h3>
            <p>
              tag-tree builds a file dependency graph from a scanned folder,
              reads <code>// tag:…</code> markers, and lets you filter / preview
              sources in the browser.
            </p>
          </section>

          <section>
            <h3>Run</h3>
            <pre>
              {`npm start -- --root ../src --port 5174 \\
  --display-prefix src \\
  --file-base file:///D:/path/to/project/`}
            </pre>
            <ul>
              <li>
                <strong>--root</strong> — folder scanned on the server disk
              </li>
              <li>
                <strong>--display-prefix</strong> — prefix shown in paths (e.g.{' '}
                <code>src</code>)
              </li>
              <li>
                <strong>--file-base</strong> — client <code>file://</code> URI for
                “Open in VS Code” (optional)
              </li>
              <li>
                <strong>--config</strong> — tag catalog JSON (default{' '}
                <code>config.json</code>)
              </li>
            </ul>
            <p>
              File contents in the preview come from <code>--root</code> via{' '}
              <code>/api/file</code>. Browsers cannot fetch <code>file://</code>{' '}
              URLs; <code>--file-base</code> is only for IDE links on your machine.
            </p>
          </section>

          <section>
            <h3>Deep links</h3>
            <p>
              Share the address bar query string. Valid params override{' '}
              <code>localStorage</code>; missing ones keep stored defaults. The
              URL stays in sync as you change filters, layout, open files, and
              focus.
            </p>
            <ul>
              <li>
                <code>tags</code>, <code>match</code> (<code>any</code>/
                <code>all</code>), <code>mode</code> (
                <code>highlight</code>/<code>isolate</code>/<code>changed</code>)
              </li>
              <li>
                <code>change</code>, <code>review=1</code>, <code>theme</code>
              </li>
              <li>
                <code>explorer</code>/<code>menu</code>/<code>split</code>/
                <code>zoom</code>/<code>ratio</code>
              </li>
              <li>
                <code>file</code> + optional <code>line</code> — open viewer
              </li>
              <li>
                <code>focus</code> — locate node on the canvas
              </li>
            </ul>
            <pre>
              {`?tags=auth,ui&match=all&mode=isolate
?file=shared/auth/store.ts&line=42&split=1
?change=<id>&review=1&mode=changed`}
            </pre>
          </section>

          <section>
            <h3>Tags</h3>
            <p>
              Put tags on the first non-empty line of a source file:
            </p>
            <pre>{`// tag:auth tag:slice_login`}</pre>
            <p>
              Ids may use <code>kebab-case</code> or <code>snake_case</code>{' '}
              (<code>a-z</code>, digits, <code>-</code>, <code>_</code>).
              Checkboxes in the menu come from <code>config.json</code> (
              <code>tag</code>, <code>label</code>, <code>description</code>,
              optional <code>color</code> as HEX or a CSS name like{' '}
              <code>green</code>). Tags used in files but missing from config
              still appear on nodes, but not in the filter list until you add
              them to config.
            </p>
            <p>
              Optional <code>nodes</code> in the same file override a scanned
              file by <code>path</code> (relative to <code>--root</code>):{' '}
              <code>color</code> (border), <code>textColor</code>,{' '}
              <code>bgColor</code> (fill), <code>title</code>, and/or{' '}
              <code>description</code>, and/or <code>ai_subtree_nodes</code>{' '}
              (paths for the dashed AI subtree button). Fill that list with{' '}
              <code>utils/collect-ai-subtree-nodes.mjs</code> or the Cursor
              command <code>/tag-tree-ai-subtree</code>. Node <code>color</code>{' '}
              wins over tag color; <code>title</code> is the primary label with
              the path shown below it; <code>description</code> appears only in
              the hover tooltip under Title.
            </p>
          </section>

          <section>
            <h3>Toolbar / menu</h3>
            <ul>
              <li>
                <strong>Burger</strong> (top right) — show / hide the control
                menu
              </li>
              <li>
                <strong>Explorer</strong> — folder tree of visible canvas files
              </li>
              <li>
                <strong>Day / Night</strong> — light or dark theme
              </li>
              <li>
                <strong>Reload</strong> — rescan without restarting the server
              </li>
              <li>
                <strong>Mode</strong> — select:{' '}
                <em>Highlight</em> (dim non-matching or outside an active
                subtree), <em>Only highlighted</em> (keep the highlighted set:
                active dependency/AI subtree, or else tag matches; empty canvas
                if neither), <em>Only changed</em> (nodes from the selected
                change set only), or <em>Only notes</em> (nodes from the selected
                AI note only; empty if none)
              </li>
              <li>
                <strong>Path glow</strong> — off by default. Soft blots behind
                visible non-dimmed nodes by top-level path family (skips{' '}
                <code>src/</code>). Deeper paths are less saturated. Selecting a
                node pulses that family slowly.
              </li>
              <li>
                <strong>Tags</strong> — searchable multi-select (A–Z; filter by
                label or id). Selected tags show as chips below (dismiss or Clear
                all). <strong>Any / Intersection</strong> — OR vs AND when several
                tags are selected
              </li>
              <li>
                <strong>Changes</strong> — dropdown of{' '}
                <code>changes/*.json</code> sets; bright yellow + one-direction
                hatching on matching nodes (fill reserved for change sets; dark
                text). Open a node for comments + Monaco Diff
              </li>
              <li>
                <strong>AI notes</strong> — searchable single-select (pale blue)
                next to Review; mutually exclusive with Changes. Participating
                nodes get a pale-blue overlay; open a node for comments without
                Diff. See <code>notes/README.md</code>
              </li>
              <li>
                <strong>Documentation</strong> — this help
              </li>
            </ul>
          </section>

          <section>
            <h3>Keyboard shortcuts</h3>
            <p>
              On macOS use <code>Cmd</code> where <code>Ctrl</code> is listed.
              Letter keys use physical position (<code>hjkl</code>) and work on
              any layout.
            </p>
            <p>
              <strong>Chrome/Chromium Vim extensions</strong> (Vimium,
              SurfingKeys, cVim, etc.) intercept <code>hjkl</code>, digits, and
              often arrows before tag-tree receives them — hop, Explorer, and
              pane focus will appear broken. Disable the extension on this site
              (or while using tag-tree), or exclude the tag-tree URL.
            </p>

            <h4>Global / panes</h4>
            <ul>
              <li>
                <code>Ctrl+Shift+E</code> — toggle Explorer
              </li>
              <li>
                <code>Ctrl+←</code> / <code>Ctrl+→</code> — focus canvas /
                Explorer (preferred)
              </li>
              <li>
                <code>Ctrl+Shift+H</code> / <code>Ctrl+Shift+L</code> — same
                (use on Latin layouts; browsers steal plain Ctrl+H/L)
              </li>
              <li>
                <code>Ctrl+H</code> / <code>Ctrl+L</code> — same when the
                browser allows (often on Cyrillic layout)
              </li>
              <li>
                <code>Ctrl+F</code> — Search node by path
              </li>
              <li>
                <code>Shift+R</code> — toggle Review guide (when the selected
                change set has a <code>review</code> field)
              </li>
              <li>
                <code>Shift+N</code> — toggle AI notes guide (when a usable note
                is selected)
              </li>
              <li>
                <code>Esc</code> — close search, step out of hop, or return to
                Explorer after locate
              </li>
            </ul>

            <h4>Canvas — select &amp; hop</h4>
            <p>
              Select an <strong>anchor</strong> first (
              <code>Ctrl+click</code>, Search, or Explorer locate), then hop
              along edges.
            </p>
            <ul>
              <li>
                Click or Enter — open file (Enter uses the anchor, or the hop
                preview target; with a pending multi-digit hop number, Enter
                confirms the choice); <code>Ctrl+click</code> — focus only
                (for hop)
              </li>
              <li>
                <code>l</code> — hop forward (outgoing edges); <code>h</code> —
                hop backward (incoming)
              </li>
              <li>
                Edges are labeled <code>0…n-1</code> top→bottom. Type a number
                (multi-digit + Enter or short pause), or <code>j</code>/
                <code>k</code> / arrows to preview (target blinks ~2s)
              </li>
              <li>
                Same <code>l</code>/<code>h</code> again while previewing —
                commit that node as the new anchor
              </li>
              <li>
                <code>Esc</code> — preview → group → original anchor. One
                neighbor: first key previews, second commits
              </li>
            </ul>

            <h4>Explorer</h4>
            <ul>
              <li>
                <code>hjkl</code> / arrows — nvim-style move; <code>gg</code>/
                <code>G</code> — top/bottom
              </li>
              <li>
                Click / Enter — open file
              </li>
              <li>
                <code>Ctrl+click</code> / <code>Ctrl+Enter</code> — locate on
                graph (center, blink, set hop anchor); <code>Esc</code> returns
                here
              </li>
            </ul>

            <h4>File viewer (Monaco)</h4>
            <ul>
              <li>
                <code>hjkl</code> — move; <code>w</code>/<code>b</code> —
                word; <code>0</code>/<code>$</code> — line start/end;{' '}
                <code>gg</code>/<code>G</code> — top/bottom
              </li>
              <li>
                <code>y</code> / <code>yy</code> / <code>Y</code> — yank
              </li>
              <li>
                <code>gd</code> — go to definition via import graph
              </li>
              <li>
                <code>Ctrl</code>/<code>⌘</code> + left-click — same as{' '}
                <code>gd</code> at the click position
              </li>
              <li>
                <code>Shift+H</code> / <code>Shift+L</code> — back / forward in
                open-file history (also focuses the graph node)
              </li>
              <li>
                Hover an identifier — shows JSDoc from its definition (same
                import-graph resolve as <code>gd</code>, including other files)
              </li>
              <li>
                <code>Z</code> — zoom; Split — file left + graph right
              </li>
              <li>
                Current only / Side-by-side — when a change diff is available,
                toggle single pane (current file + line highlights) vs split
                DiffEditor
              </li>
              <li>
                Comments select — Summary (file comment), Inline (line notes
                as view zones in the editor), Both, or Hide (no AI comments)
              </li>
            </ul>
          </section>

          <section>
            <h3>Agent changes</h3>
            <p>
              Prefer{' '}
              <code>npm run export-change -- --root … --id …</code> so{' '}
              <code>path</code> / <code>rows</code> / <code>prev_row</code>{' '}
              come from <code>git diff HEAD</code>. Agents may edit{' '}
              <code>comment</code>, optional line <code>notes</code>, optional{' '}
              <code>review</code> (<code>goal</code> + path <code>order</code>),
              and optional <code>label</code>. Prefer{' '}
              <code>/tag-tree-explain</code> to fill those initially. Yellow{' '}
              <strong>Review</strong> (or <code>Shift+R</code>) opens the
              floating guide. In the file viewer, the{' '}
              <strong>Comments</strong> select chooses Summary / Inline / Both /
              Hide. See <code>changes/README.md</code>.
            </p>
          </section>

          <section>
            <h3>AI notes</h3>
            <p>
              Prefer <code>/tag-tree-note</code> to author{' '}
              <code>notes/&lt;id&gt;.json</code> with a required{' '}
              <code>label</code> and <code>guide</code> viewing map (
              <code>goal</code> + path <code>order</code>). Pale-blue{' '}
              <strong>AI notes</strong> / <strong>Notes</strong> (or{' '}
              <code>Shift+N</code>) are mutually exclusive with yellow Changes /
              Review. File comments work without Diff. See{' '}
              <code>notes/README.md</code>.
            </p>
          </section>

          <section>
            <h3>Graph UI</h3>
            <p>
              Search (top-right) jumps to a path such as{' '}
              <code>shared/api/core.ts</code>. Next to it,{' '}
              <strong>Review</strong> opens the change-set review guide when
              present; <strong>AI notes</strong> / <strong>Notes</strong> open
              explanation walkthroughs. The solid circle highlights a
              dependency subtree; the dashed purple circle (when{' '}
              <code>ai_subtree_nodes</code> is set) highlights a curated set —
              only one focus at a time. Hover shows tag/title tooltips (
              <code>description</code> is tooltip-only). In split mode,
              clicking another node updates the left pane. “Open in VS Code”
              needs <code>--file-base</code>. See{' '}
              <strong>Keyboard shortcuts</strong> above for hop and pane keys.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
