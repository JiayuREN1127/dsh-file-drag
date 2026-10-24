# dsh-file-drag

Drag files and folders from the DeepSeek Harness **Files** sidebar straight into the message composer. Each dropped item lands as an `@` mention, the same reference the composer's own picker produces.

DeepSeek Harness already accepts file drags that come from the operating system, but its Sidebar Files pane has no drag source at all, and the composer only claims drags whose payload type is `Files`. This plugin closes that gap from the outside: it arms the existing file rows, carries the relative path over a private MIME type, and replays the result as a paste into the draft editor.


## Requirements

- DeepSeek Harness **0.2.1-rc.2** or a build that still renders the right sidebar Files tab.
- The `desktop` profile (`~/.dsh/profiles/desktop`), which is what the macOS app uses.

## Install

```bash
git clone https://github.com/JiayuREN1127/dsh-file-drag.git
cd dsh-file-drag
./install.sh
```

`install.sh` copies the package into `~/.dsh/profiles/desktop/node_modules/dsh-file-drag` and appends one Loader row to `~/.dsh/profiles/desktop/cordis.patch.yml`, keeping a timestamped backup of that file first.

To install by hand, do the same two things:

1. Copy this package to `~/.dsh/profiles/desktop/node_modules/dsh-file-drag`.
2. Append to `~/.dsh/profiles/desktop/cordis.patch.yml`:

```yaml
- insert:
    - id: file-drag
      name: dsh-file-drag
```

Then **quit the app completely (`Cmd-Q`) and reopen it**. The Loader tree is built at startup, so a page reload is not enough.

## Usage

1. Open the **Files** tab in the right sidebar.
2. Press and drag a file or a folder onto the message composer.
3. Release. The composer receives `@relative/path ` at the caret.

While dragging, the composer shows a dashed outline so you know it will accept the drop.

What gets inserted:

| Source row | Inserted text |
|---|---|
| `src/client/index.ts` | `@src/client/index.ts ` |
| folder `packages` | `@packages/ ` |
| `my notes.md` | `@"my notes.md" ` |

The grammar matches the composer's own `formatFileMention`: folders keep a trailing slash, paths containing whitespace are quoted, and paths containing control characters or a double quote are refused.

## How it works

**Drag source.** The Files tab renders every row as `<li data-files-entry="file|directory|other" data-files-path="relative/path">`. The plugin does not guess the tree shape: on `pointerdown` it sets `draggable` on the closest such row, so the press can turn into a drag.

**Transport.** `dragstart` writes a private payload, `application/x-dsh-file-path`, holding the relative path and the entry kind. The native `Files` type is deliberately not used: a synthesized `File` has no host path, so the desktop-side path bridge would reject it as "path unavailable".

**Drop.** The composer's own `dragover` handler only calls `preventDefault` for `Files`, so a custom drag would otherwise be cancelled by the browser. The plugin claims `dragover` and `drop` in the capture phase for its own MIME type, then inserts the mention and stops propagation.

**Insertion.** The draft editor is Lexical, which ignores direct DOM writes and `document.execCommand`, so the mention is delivered as a synthetic `paste` event carrying `text/plain` on the editor root. That is the same path a real paste takes and it survives Lexical's own state reconciliation.

## Compatibility

Built against DeepSeek Harness `0.2.1-rc.2`. The plugin depends on three implementation details that are not a public contract:

- the `data-files-entry` / `data-files-path` attributes on sidebar rows,
- the composer being a `[contenteditable="true"]` element that handles `paste`,
- `window.__ModuleLoader__.load` as the client bundle entry point.

If a future release changes any of these, the plugin degrades to doing nothing rather than breaking the page: every handler is guarded, and `apply` is wrapped so a failure never blocks boot.

## Limitations

- One item per drag; multi-select dragging is not implemented.
- Only works while the Files tab is rendered, because the rows are the drag source.
- Drops are accepted anywhere in the window, not only over the composer.
- The mention is relative to the Files tab root, which is the session workspace. A session opened in another folder still receives the same relative path.

## Uninstall

```bash
rm -rf ~/.dsh/profiles/desktop/node_modules/dsh-file-drag
cp ~/.dsh/profiles/desktop/cordis.patch.yml.bak-<timestamp> ~/.dsh/profiles/desktop/cordis.patch.yml
```

Then restart the app.

## License

MIT
