window.__ModuleLoader__.load({
	id: "dsh-file-drag",
	factory: () => {
		var exports = {};

		/** Private MIME type carrying one Sidebar files entry across the drag. */
		const MIME = "application/x-dsh-file-path";
		/** Any Sidebar files row: the `<li>` carries both the relative path and the entry kind. */
		const ENTRY = "[data-files-entry][data-files-path]";
		const STYLE_ID = "dsh-file-drag-style";
		const DRAG_ATTR = "data-dsh-file-drag";

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
			try {
				const payload = JSON.parse(event.dataTransfer.getData(MIME));
				const mention = mentionFor(payload.path, payload.type);
				if (mention !== void 0) insertMention(mention + " ");
			} catch {}
		}

		/**
		 * Insert text at the composer's caret. The draft editor is Lexical, which
		 * ignores DOM writes, so this replays a paste event with `text/plain`,
		 * exactly what a real paste of the mention text would do.
		 * @param text - mention text ending in a space.
		 * @returns whether a composer was found and the paste was dispatched.
		 */
		function insertMention(text) {
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

		/** @param ctx - client cordis context. */
		function apply(ctx) {
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
				if (ctx !== void 0 && typeof ctx.effect === "function") ctx.effect(() => cleanup);
			} catch (error) {
				console.warn("[dsh-file-drag] failed to install", error);
			}
		}

		exports.apply = apply;
		exports.inject = [];
		return exports;
	}
});
