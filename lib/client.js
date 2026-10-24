window.__ModuleLoader__.load({
	id: "dsh-file-drag",
	factory: (require) => {
		var exports = {};

		/** React seed module; the settings row is skipped when it is unavailable. */
		let React;
		try {
			React = require("react");
		} catch {
			React = void 0;
		}

		/** Private MIME type carrying one Sidebar files entry across the drag. */
		const MIME = "application/x-dsh-file-path";
		/** Any Sidebar files row: the `<li>` carries both the relative path and the entry kind. */
		const ENTRY = "[data-files-entry][data-files-path]";
		const STYLE_ID = "dsh-file-drag-style";
		const DRAG_ATTR = "data-dsh-file-drag";
		const MODE_KEY = "dsh-file-drag:mode";
		const NS = "fileDrag";

		/** Media types worth preserving on the uploaded card. */
		const MIME_BY_EXT = Object.freeze({
			png: "image/png",
			jpg: "image/jpeg",
			jpeg: "image/jpeg",
			gif: "image/gif",
			webp: "image/webp",
			avif: "image/avif",
			svg: "image/svg+xml",
			bmp: "image/bmp",
			ico: "image/x-icon",
			pdf: "application/pdf",
			txt: "text/plain",
			md: "text/markdown",
			json: "application/json",
			csv: "text/csv",
			html: "text/html",
			ts: "text/typescript",
			tsx: "text/typescript",
			js: "text/javascript",
			jsx: "text/javascript",
			py: "text/x-python",
			yml: "text/yaml",
			yaml: "text/yaml"
		});

		const zh = {
			"settings.title": "文件拖拽",
			"settings.description": "从右侧文件区拖入文件时，默认添加为附件卡片，还是插入 @ 路径",
			"settings.card": "附件卡片",
			"settings.mention": "@ 路径"
		};

		const en = {
			"settings.title": "File drag",
			"settings.description": "Drop a file from the sidebar as an attachment card or as an @ path",
			"settings.card": "Card",
			"settings.mention": "@ path"
		};

		/** Client context captured by apply; card mode needs the Remote face from it. */
		let ctxRef;

		/** Drop behaviour: `card` uploads the file, `mention` inserts its @ path. */
		let mode = readMode();

		/** @returns the persisted preference, defaulting to cards. */
		function readMode() {
			try {
				return localStorage.getItem(MODE_KEY) === "mention" ? "mention" : "card";
			} catch {
				return "card";
			}
		}

		/** @param value - `card` or `mention`; anything else falls back to cards. */
		function writeMode(value) {
			mode = value === "mention" ? "mention" : "card";
			try {
				localStorage.setItem(MODE_KEY, mode);
			} catch {}
		}

		/**
		 * Build the @ mention for one Sidebar entry, matching the composer's own
		 * `formatFileMention` grammar: directories keep a trailing slash, and paths
		 * containing whitespace are quoted.
		 * @param path - relative workspace path from `data-files-path`.
		 * @param type - `data-files-entry`: file, directory, or other.
		 * @returns the mention text, or undefined when the editor grammar cannot represent it.
		 */
		function mentionFor(path, type) {
			if (typeof path !== "string" || path === "") return void 0;
			let text = String(path);
			if (type === "directory" && !text.endsWith("/")) text += "/";
			if (/[\u0000-\u001f\u007f-\u009f"]/u.test(text)) return void 0;
			return /\s/u.test(text) ? `@"${text}"` : `@${text}`;
		}

		/** Install the drag affordance and the drop-target highlight once. */
		function installStyle() {
			if (document.getElementById(STYLE_ID) !== null) return;
			const style = document.createElement("style");
			style.id = STYLE_ID;
			style.textContent = [
				ENTRY + "{cursor:grab}",
				ENTRY + ":active{cursor:grabbing}",
				"html[" + DRAG_ATTR + "] [contenteditable='true']{outline:1.5px dashed var(--dsw-alias-border-l2-darkmode-thin,#7c8cff);outline-offset:3px;border-radius:12px}",
				"html[" + DRAG_ATTR + "] " + ENTRY + "{opacity:.8}"
			].join("");
			document.head.appendChild(style);
		}

		/** @param node - event target. @returns the closest Sidebar files row, if any. */
		function entryOf(node) {
			return node && typeof node.closest === "function" ? node.closest(ENTRY) : null;
		}

		/** Arm the row under the pointer so a press can become a drag. */
		function onPointerDown(event) {
			try {
				const row = entryOf(event.target);
				if (row !== null && row.getAttribute("draggable") !== "true") row.setAttribute("draggable", "true");
			} catch {}
		}

		/** True when this drag carries our private entry payload. */
		function isOurs(dataTransfer) {
			if (dataTransfer === null || dataTransfer === void 0) return false;
			try {
				return Array.from(dataTransfer.types || []).includes(MIME);
			} catch {
				return false;
			}
		}

		/** Publish the drag so the composer can highlight itself. */
		function markDragging(active) {
			if (active) document.documentElement.setAttribute(DRAG_ATTR, "1");
			else document.documentElement.removeAttribute(DRAG_ATTR);
		}

		function onDragStart(event) {
			try {
				const row = entryOf(event.target);
				if (row === null) return;
				const path = row.getAttribute("data-files-path");
				const type = row.getAttribute("data-files-entry");
				const mention = mentionFor(path, type);
				if (mention === void 0) return;
				const dataTransfer = event.dataTransfer;
				if (dataTransfer === null || dataTransfer === void 0) return;
				dataTransfer.effectAllowed = "copy";
				dataTransfer.setData(MIME, JSON.stringify({ path, type }));
				dataTransfer.setData("text/plain", mention);
				markDragging(true);
			} catch {}
		}

		function onDragOver(event) {
			if (!isOurs(event.dataTransfer)) {
				markDragging(false);
				return;
			}
			// The composer only claims OS file drags, so our own drag has to keep
			// the drop alive itself or the browser cancels it.
			event.preventDefault();
			try {
				event.dataTransfer.dropEffect = "copy";
			} catch {}
			markDragging(true);
		}

		function onDrop(event) {
			if (!isOurs(event.dataTransfer)) return;
			event.preventDefault();
			event.stopPropagation();
			markDragging(false);
			let payload;
			try {
				payload = JSON.parse(event.dataTransfer.getData(MIME));
			} catch {
				return;
			}
			if (payload === null || typeof payload !== "object" || typeof payload.path !== "string") return;
			// Alt forces the one-off opposite behaviour without touching the preference.
			const effective = event.altKey === true ? "mention" : mode;
			if (effective === "mention" || payload.type === "directory") {
				insertMention(payload.path, payload.type);
				return;
			}
			void dropAsCard(payload.path).then((inserted) => {
				if (!inserted) insertMention(payload.path, payload.type);
			});
		}

		/**
		 * Insert text at the composer's caret. The draft editor is Lexical, which
		 * ignores DOM writes, so this replays a paste event with `text/plain`,
		 * exactly what a real paste of the mention text would do.
		 * @param text - mention text ending in a space.
		 * @returns whether a composer was found and the paste was dispatched.
		 */
		function insertText(text) {
			const editor = document.querySelector("[contenteditable='true']");
			if (editor === null) return false;
			try {
				editor.focus();
				const selection = window.getSelection();
				if (selection === null || selection.rangeCount === 0 || !editor.contains(selection.anchorNode)) {
					selection.selectAllChildren(editor);
					selection.collapseToEnd();
				}
				const dataTransfer = new DataTransfer();
				dataTransfer.setData("text/plain", text);
				editor.dispatchEvent(new ClipboardEvent("paste", {
					bubbles: true,
					cancelable: true,
					clipboardData: dataTransfer
				}));
				return true;
			} catch (error) {
				console.warn("[dsh-file-drag] could not insert mention", error);
				return false;
			}
		}

		/**
		 * Insert one row's @ mention into the composer.
		 * @param path - relative workspace path.
		 * @param type - entry kind.
		 * @returns whether the mention was inserted.
		 */
		function insertMention(path, type) {
			const mention = mentionFor(path, type);
			if (mention === void 0) return false;
			return insertText(mention + " ");
		}

		/**
		 * The composer's session id, read from the React fiber of the composer
		 * card. The client exposes no "current session" accessor, and a file card
		 * has to be uploaded into a concrete session, so this is the only handle.
		 * @returns the session id, or undefined when the composer is sessionless.
		 */
		function sessionIdOfComposer() {
			const card = document.querySelector("[data-composer-card='true']") ?? document.querySelector("[contenteditable='true']");
			if (card === null) return void 0;
			const key = Object.keys(card).find((name) => name.startsWith("__reactFiber$"));
			if (key === void 0) return void 0;
			let fiber = card[key];
			for (let depth = 0; fiber !== null && fiber !== void 0 && depth < 60; depth += 1) {
				const props = fiber.memoizedProps;
				// Stop at the composer's own component: an outer layout node also
				// carries a `sessionId`, and picking that one would upload into the
				// wrong session. `inputActions` identifies the composer component.
				if (props !== null && typeof props === "object" && "sessionId" in props && "inputActions" in props) {
					return typeof props.sessionId === "string" ? props.sessionId : void 0;
				}
				fiber = fiber.return;
			}
			return void 0;
		}

		/** @param name - file name. @returns its media type, or the empty type. */
		function mimeOf(name) {
			const dot = name.lastIndexOf(".");
			if (dot < 0) return "";
			return MIME_BY_EXT[name.slice(dot + 1).toLowerCase()] ?? "";
		}

		/**
		 * Upload one workspace file into the composer as an attachment card by
		 * replaying the built-in `Files` drop with its real bytes. The composer
		 * then takes its own upload path, so the card behaves exactly like one
		 * dragged in from the operating system.
		 * @param path - relative workspace path of the dragged row.
		 * @returns whether the upload was handed to the composer.
		 */
		async function dropAsCard(path) {
			const context = ctxRef;
			if (context === void 0) return false;
			const sessionId = sessionIdOfComposer();
			if (sessionId === void 0) return false;
			const files = context.remote?.workspaceFiles;
			if (files === void 0) return false;
			try {
				const result = await files.readBytes(sessionId, path, {});
				if (result === null || result === void 0 || result.ok !== true) return false;
				const data = result.value?.data;
				if (!(data instanceof Uint8Array)) return false;
				const name = path.slice(path.lastIndexOf("/") + 1) || "file";
				const file = new File([data], name, { type: mimeOf(name) });
				const dataTransfer = new DataTransfer();
				dataTransfer.items.add(file);
				const target = document.querySelector("[data-composer-card='true']") ?? document.body;
				target.dispatchEvent(new DragEvent("drop", {
					bubbles: true,
					cancelable: true,
					dataTransfer
				}));
				return true;
			} catch (error) {
				console.warn("[dsh-file-drag] could not attach file", error);
				return false;
			}
		}

		const ROW_STYLE = {
			display: "flex",
			alignItems: "center",
			justifyContent: "space-between",
			gap: "16px",
			padding: "12px 0"
		};
		const TEXT_STYLE = { display: "flex", flexDirection: "column", gap: "2px" };
		const TITLE_STYLE = { fontSize: "14px", lineHeight: "22px", color: "var(--dsw-alias-label-primary)" };
		const DESC_STYLE = { fontSize: "12px", lineHeight: "18px", color: "var(--dsw-alias-label-secondary)" };
		const GROUP_STYLE = {
			display: "inline-flex",
			flex: "none",
			gap: "2px",
			padding: "2px",
			borderRadius: "8px",
			background: "var(--dsw-alias-bg-module-platform)"
		};
		const BUTTON_STYLE = {
			border: "none",
			background: "transparent",
			color: "var(--dsw-alias-label-secondary)",
			font: "inherit",
			fontSize: "13px",
			lineHeight: "20px",
			padding: "4px 12px",
			borderRadius: "6px",
			cursor: "pointer"
		};
		const ACTIVE_STYLE = {
			background: "rgba(127,127,127,0.18)",
			color: "var(--dsw-alias-label-primary)"
		};

		/**
		 * General Settings row for the drop behaviour preference.
		 * @param props - composed settings slot props (`getMode`, `setMode`, `t`).
		 * @returns the preference row.
		 */
		function ModeRow(props) {
			const [current, setCurrent] = React.useState(() => props.getMode());
			const choose = (value) => {
				setCurrent(value);
				props.setMode(value);
			};
			const t = props.t;
			const button = (value) => React.createElement("button", {
				key: value,
				type: "button",
				onClick: () => choose(value),
				style: { ...BUTTON_STYLE, ...(current === value ? ACTIVE_STYLE : {}) }
			}, value === "card" ? t("settings.card") : t("settings.mention"));
			return React.createElement("div", { style: ROW_STYLE },
				React.createElement("div", { style: TEXT_STYLE },
					React.createElement("div", { style: TITLE_STYLE }, t("settings.title")),
					React.createElement("div", { style: DESC_STYLE }, t("settings.description"))),
				React.createElement("div", { style: GROUP_STYLE }, ["card", "mention"].map(button)));
		}

		/** Register the General Settings row; skipped without React or the slot. */
		function installSettings(ctx) {
			if (React === void 0) return;
			try {
				ctx.effect(() => ctx.locale.register(NS, { zh, en }), "file-drag: dictionaries");
				ctx.slots.inject("settings.general.item", () => ctx.slots.register({
					name: "settings.general.item",
					id: "file-drag-mode",
					order: 40,
					locale: NS,
					inject: () => ({
						getMode: () => mode,
						setMode: writeMode
					})
				}, ModeRow));
			} catch (error) {
				console.warn("[dsh-file-drag] could not register the settings row", error);
			}
		}

		/** @param ctx - client cordis context. */
		function apply(ctx) {
			ctxRef = ctx;
			try {
				installStyle();
				document.addEventListener("pointerdown", onPointerDown, true);
				document.addEventListener("mousedown", onPointerDown, true);
				document.addEventListener("dragstart", onDragStart, true);
				document.addEventListener("dragover", onDragOver, true);
				document.addEventListener("dragend", () => markDragging(false), true);
				document.addEventListener("drop", onDrop, true);
				const cleanup = () => {
					document.removeEventListener("pointerdown", onPointerDown, true);
					document.removeEventListener("mousedown", onPointerDown, true);
					document.removeEventListener("dragstart", onDragStart, true);
					document.removeEventListener("dragover", onDragOver, true);
					document.removeEventListener("drop", onDrop, true);
					markDragging(false);
					const style = document.getElementById(STYLE_ID);
					if (style !== null) style.remove();
				};
				if (typeof ctx.effect === "function") ctx.effect(() => cleanup);
			} catch (error) {
				console.warn("[dsh-file-drag] failed to install", error);
			}
			installSettings(ctx);
			globalThis.__dshFileDrag = {
				version: "0.2.0",
				getMode: () => mode,
				setMode: writeMode,
				sessionIdOfComposer,
				dropAsCard,
				insertMention,
				diagnose: async (path) => {
					const context = ctxRef;
					const sessionId = sessionIdOfComposer();
					const files = context?.remote?.workspaceFiles;
					if (sessionId === void 0) return { error: "no-session" };
					if (files === void 0) return { error: "no-remote-face", remoteKeys: context?.remote === void 0 ? null : Object.keys(context.remote) };
					try {
						const result = await files.readBytes(sessionId, path, {});
						return {
							sessionId,
							ok: result?.ok,
							code: result?.ok === false ? result.error?.code : void 0,
							message: result?.ok === false ? result.error?.message : void 0,
							dataKind: result?.value?.data === void 0 ? null : Object.prototype.toString.call(result.value.data),
							byteLength: result?.value?.data?.byteLength ?? null
						};
					} catch (error) {
						return { error: "threw", message: String(error && error.message ? error.message : error) };
					}
				}
			};
		}

		exports.apply = apply;
		exports.inject = ["slots", "locale", "remote", "remote.workspaceFiles"];
		return exports;
	}
});
