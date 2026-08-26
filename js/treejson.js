/**
 * TreeJSON — a tiny, dependency-free interactive JSON viewer.
 *
 * Basic (interactive) usage:
 *   const viewer = new TreeJSON('#viewer', {
 *     data: { hello: 'world' },
 *     theme: 'light',      // 'light' | 'dark'
 *     editable: true,      // show the input textarea + Format button
 *     showThemeToggle: true
 *   });
 *
 *   viewer.setData({ updated: true });
 *   viewer.setTheme('dark');
 *   viewer.toggleTheme();
 *
 * Just want colored output somewhere else on the page (no interactivity)?
 *   el.innerHTML = TreeJSON.toHTML(someJson, { theme: 'dark' });
 *
 * Large / deeply nested JSON:
 *   new TreeJSON('#viewer', {
 *     data: bigJson,
 *     autoCollapseDepth: 2,   // branches deeper than this aren't built until expanded
 *     maxArrayItems: 200      // long arrays render a "N more items" placeholder
 *   });
 *
 * You can create as many independent instances on a page as you like —
 * each instance is scoped to its own container, so there are no global
 * ids and no collisions between instances.
 */
(function (global) {
    'use strict';

    const THEMES = ['light', 'dark'];

    // ---------------------------------------------------------------
    // Auto-injected styles
    // ---------------------------------------------------------------
    // The library's CSS is embedded here so a single <script src="treejson.js">
    // is enough to use it — no separate <link> tag required. This is safe for
    // this component specifically because TreeJSON never styles markup that
    // was already on the page; every element it draws is created by this same
    // script, so the stylesheet is guaranteed to be in <head> before any
    // TreeJSON element exists — there's no flash of unstyled content to worry
    // about, and the one-time cost is a few KB added to this file instead of
    // a separate HTTP request.
    //
    // If you'd rather link css/treejson.css yourself (e.g. a strict
    // Content-Security-Policy that blocks inline <style> tags, or you want it
    // in your own asset pipeline), just add that <link> before this <script> —
    // injection is skipped automatically when it detects one.
    const STYLE_ELEMENT_ID = 'treejson-styles';
    const CSS_TEXT = `
.treejson {
    --tj-bg: #f5f5f5;
    --tj-panel-bg: #ffffff;
    --tj-text: #333333;
    --tj-border: #dddddd;
    --tj-line-numbers-bg: #f0f0f0;
    --tj-line-numbers-color: #666666;
    --tj-key-color: #9c27b0;
    --tj-string-color: #4caf50;
    --tj-number-color: #2196f3;
    --tj-boolean-color: #ff9800;
    --tj-null-color: #f44336;
    --tj-bracket-color: #555555;
    --tj-comma-color: #888888;
    --tj-error-color: #d32f2f;
    --tj-error-bg: #ffecec;
    --tj-accent: #2196f3;
    --tj-accent-text: #ffffff;
    --tj-children-border: #dddddd;

    box-sizing: border-box;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    color: var(--tj-text);
    background-color: var(--tj-bg);
}

.treejson[data-theme="dark"] {
    --tj-bg: #1e1e1e;
    --tj-panel-bg: #252526;
    --tj-text: #d4d4d4;
    --tj-border: #3c3c3c;
    --tj-line-numbers-bg: #1a1a1a;
    --tj-line-numbers-color: #7f8792;
    --tj-key-color: #9cdcfe;
    --tj-string-color: #ce9178;
    --tj-number-color: #b5cea8;
    --tj-boolean-color: #569cd6;
    --tj-null-color: #f44747;
    --tj-bracket-color: #d4d4d4;
    --tj-comma-color: #858585;
    --tj-error-color: #f48771;
    --tj-error-bg: #4b1113;
    --tj-accent: #0e639c;
    --tj-accent-text: #ffffff;
    --tj-children-border: #3c3c3c;
}

.treejson *,
.treejson *::before,
.treejson *::after {
    box-sizing: border-box;
}

.treejson-input {
    display: block;
    width: 100%;
    min-height: 140px;
    resize: vertical;
    font-family: inherit;
    font-size: 14px;
    padding: 10px;
    border: 1px solid var(--tj-border);
    border-radius: 4px;
    background-color: var(--tj-panel-bg);
    color: var(--tj-text);
}

.treejson-toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 8px;
    margin-bottom: 16px;
    flex-wrap: wrap;
}

.treejson-btn {
    font-family: inherit;
    font-size: 14px;
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    background-color: var(--tj-accent);
    color: var(--tj-accent-text);
    cursor: pointer;
}

.treejson-btn:hover {
    opacity: 0.9;
}

.treejson-theme-btn {
    margin-left: auto;
    background-color: transparent;
    color: var(--tj-text);
    border: 1px solid var(--tj-border);
}

.treejson-hint {
    font-size: 12px;
    color: var(--tj-line-numbers-color);
}

.treejson-viewer {
    display: flex;
    border: 1px solid var(--tj-border);
    border-radius: 4px;
    background-color: var(--tj-panel-bg);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    overflow: hidden;
}

.treejson-line-numbers {
    background-color: var(--tj-line-numbers-bg);
    color: var(--tj-line-numbers-color);
    padding: 10px 5px;
    text-align: right;
    user-select: none;
    border-right: 1px solid var(--tj-border);
    min-width: 30px;
    line-height: 1.5;
    flex-shrink: 0;
}

.treejson-content {
    flex-grow: 1;
    padding: 10px;
    overflow-x: auto;
    position: relative;
    white-space: pre;
    line-height: 1.5;
}

.treejson-line {
    display: block;
    min-height: 1.5em;
}

.treejson-key { color: var(--tj-key-color); }
.treejson-string { color: var(--tj-string-color); }
.treejson-number { color: var(--tj-number-color); }
.treejson-boolean { color: var(--tj-boolean-color); }
.treejson-null { color: var(--tj-null-color); }
.treejson-bracket { color: var(--tj-bracket-color); }
.treejson-comma { color: var(--tj-comma-color); }
.treejson-truncated { color: var(--tj-line-numbers-color); font-style: italic; }

.treejson-static-content {
    margin: 0;
    padding: 10px;
    background-color: var(--tj-panel-bg);
    border: 1px solid var(--tj-border);
    border-radius: 4px;
    overflow-x: auto;
    white-space: pre;
    line-height: 1.5;
}

.treejson-collapsible {
    cursor: pointer;
    margin-right: 4px;
    color: var(--tj-bracket-color);
    user-select: none;
    display: inline-block;
    width: 15px;
    text-align: center;
}

.treejson-children {
    margin-left: 20px;
    border-left: 1px dotted var(--tj-children-border);
    padding-left: 15px;
}

.treejson-collapsed > .treejson-children {
    display: none;
}

.treejson-collapsed > .treejson-collapsible::after {
    content: "+";
}

.treejson-collapsible::after {
    content: "-";
}

.treejson-error-line {
    background-color: var(--tj-error-bg);
    color: var(--tj-error-color);
    font-weight: bold;
}

.treejson-error {
    color: var(--tj-error-color);
    padding: 10px;
    margin-top: 10px;
    border: 1px solid var(--tj-error-color);
    border-radius: 4px;
    background-color: var(--tj-error-bg);
}

@media (max-width: 600px) {
    .treejson-input {
        font-size: 13px;
        min-height: 110px;
    }

    .treejson-content {
        padding: 8px;
        font-size: 13px;
    }

    .treejson-line-numbers {
        padding: 8px 4px;
        min-width: 24px;
        font-size: 13px;
    }

    .treejson-children {
        margin-left: 12px;
        padding-left: 8px;
    }

    .treejson-toolbar {
        gap: 6px;
    }

    .treejson-theme-btn {
        margin-left: 0;
    }
}
`;

    function injectStylesOnce() {
        if (typeof document === 'undefined') return;
        if (document.getElementById(STYLE_ELEMENT_ID)) return;
        if (document.querySelector('link[href*="treejson.css"]')) return; // developer opted to link it manually
        const style = document.createElement('style');
        style.id = STYLE_ELEMENT_ID;
        style.textContent = CSS_TEXT;
        document.head.appendChild(style);
    }

    // Runs as soon as this script executes — before any `new TreeJSON()` call
    // and before any `TreeJSON.toHTML()` call — so styles are always present
    // by the time anything from this library touches the page.
    injectStylesOnce();

    // ---------------------------------------------------------------
    // Shared, DOM-free helpers (used by both the interactive class and
    // the static TreeJSON.toHTML() output, so the two stay in sync).
    // ---------------------------------------------------------------

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function syntaxHighlightValue(json) {
        if (typeof json !== 'string') json = JSON.stringify(json);
        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
            let cls = 'treejson-number';
            if (/^"/.test(match)) {
                cls = 'treejson-string';
            } else if (/true|false/.test(match)) {
                cls = 'treejson-boolean';
            } else if (/null/.test(match)) {
                cls = 'treejson-null';
            }
            return '<span class="' + cls + '">' + match + '</span>';
        });
    }

    class TreeJSON {
        constructor(target, options = {}) {
            this.container = typeof target === 'string' ? document.querySelector(target) : target;
            if (!this.container) {
                throw new Error('TreeJSON: could not find a container matching "' + target + '"');
            }

            this.options = Object.assign({
                theme: 'light',
                editable: true,
                showThemeToggle: true,
                data: {},
                autoCollapseDepth: Infinity, // branches at/after this depth start collapsed and unbuilt
                maxArrayItems: Infinity,     // arrays longer than this render a "N more items" placeholder
                onThemeChange: null,
                onError: null
            }, options);

            this._data = null;
            this.elements = {};
            this._lazyNodes = new WeakMap(); // collapsible element -> { obj, indent, depth, isArray }

            this._buildDom();
            this._bindEvents();
            this.setTheme(this.options.theme);

            const initialData = this.options.data;
            this.setData(typeof initialData === 'string' ? initialData : JSON.stringify(initialData, null, 2));
        }

        // ---------------------------------------------------------------
        // Static, DOM-free API — for when you just want colored markup
        // ---------------------------------------------------------------

        /**
         * Renders JSON straight to an HTML string: syntax-highlighted, with
         * proper indentation, but no line numbers, no collapsing, and no
         * event listeners. Drop the result into any element's innerHTML.
         *
         * Because it never touches the DOM until you assign the result,
         * this is the cheapest way to display large read-only JSON blobs —
         * there's no per-line element or click-listener overhead at all.
         *
         *   el.innerHTML = TreeJSON.toHTML(data, { theme: 'dark' });
         */
        static toHTML(data, options = {}) {
            const cfg = Object.assign({ theme: 'light', indent: 2 }, options);

            function renderValue(value, indent, prefix) {
                const pad = ' '.repeat(indent);

                if (typeof value !== 'object' || value === null) {
                    return pad + prefix + syntaxHighlightValue(JSON.stringify(value));
                }

                const isArray = Array.isArray(value);
                const keys = isArray ? value.map((_, i) => i) : Object.keys(value);

                if (keys.length === 0) {
                    return pad + prefix + '<span class="treejson-bracket">' + (isArray ? '[ ]' : '{ }') + '</span>';
                }

                const lines = [pad + prefix + '<span class="treejson-bracket">' + (isArray ? '[' : '{') + '</span>'];

                keys.forEach((key, i) => {
                    const itemPrefix = isArray ? '' : '<span class="treejson-key">"' + escapeHtml(key) + '"</span>: ';
                    const itemValue = isArray ? value[key] : value[key];
                    let rendered = renderValue(itemValue, indent + cfg.indent, itemPrefix);
                    if (i < keys.length - 1) rendered += '<span class="treejson-comma">,</span>';
                    lines.push(rendered);
                });

                lines.push(pad + '<span class="treejson-bracket">' + (isArray ? ']' : '}') + '</span>');
                return lines.join('\n');
            }

            const theme = cfg.theme === 'dark' ? 'dark' : 'light';
            const body = renderValue(data, 0, '');
            return '<div class="treejson treejson-static" data-theme="' + theme + '">'
                + '<pre class="treejson-static-content">' + body + '</pre>'
                + '</div>';
        }

        // ---------------------------------------------------------------
        // Public instance API
        // ---------------------------------------------------------------

        /** Accepts either a JSON string or a plain JS object/array. */
        setData(jsonStringOrData) {
            const jsonString = typeof jsonStringOrData === 'string'
                ? jsonStringOrData
                : JSON.stringify(jsonStringOrData, null, 2);

            if (this.elements.textarea && this.elements.textarea.value !== jsonString) {
                this.elements.textarea.value = jsonString;
            }

            try {
                this.elements.errorMessage.style.display = 'none';
                const parsed = JSON.parse(jsonString);
                this._data = parsed;
                this._render(parsed);
            } catch (error) {
                this._showError(jsonString, error);
                if (typeof this.options.onError === 'function') {
                    this.options.onError(error);
                }
            }
        }

        /** Returns the last successfully parsed JSON value. */
        getData() {
            return this._data;
        }

        setTheme(theme) {
            const normalized = THEMES.includes(theme) ? theme : 'light';
            this.theme = normalized;
            this.container.setAttribute('data-theme', normalized);

            if (this.elements.themeBtn) {
                this.elements.themeBtn.textContent = normalized === 'dark' ? 'Light mode' : 'Dark mode';
                this.elements.themeBtn.setAttribute('aria-pressed', String(normalized === 'dark'));
            }

            if (typeof this.options.onThemeChange === 'function') {
                this.options.onThemeChange(normalized);
            }
        }

        getTheme() {
            return this.theme;
        }

        toggleTheme() {
            this.setTheme(this.theme === 'dark' ? 'light' : 'dark');
        }

        /** Removes all DOM created by this instance. */
        destroy() {
            this.container.innerHTML = '';
            this.container.classList.remove('treejson');
            this.container.removeAttribute('data-theme');
        }

        // ---------------------------------------------------------------
        // DOM construction
        // ---------------------------------------------------------------

        _buildDom() {
            this.container.innerHTML = '';
            this.container.classList.add('treejson');

            const showToolbar = this.options.editable || this.options.showThemeToggle;

            if (this.options.editable) {
                const textarea = document.createElement('textarea');
                textarea.className = 'treejson-input';
                textarea.spellcheck = false;
                textarea.setAttribute('aria-label', 'JSON input');
                this.container.appendChild(textarea);
                this.elements.textarea = textarea;
            }

            if (showToolbar) {
                const toolbar = document.createElement('div');
                toolbar.className = 'treejson-toolbar';

                if (this.options.editable) {
                    const formatBtn = document.createElement('button');
                    formatBtn.type = 'button';
                    formatBtn.className = 'treejson-btn treejson-format-btn';
                    formatBtn.textContent = 'Format';
                    toolbar.appendChild(formatBtn);
                    this.elements.formatBtn = formatBtn;

                    const hint = document.createElement('span');
                    hint.className = 'treejson-hint';
                    hint.textContent = 'Ctrl/Cmd + Enter to run';
                    toolbar.appendChild(hint);
                }

                if (this.options.showThemeToggle) {
                    const themeBtn = document.createElement('button');
                    themeBtn.type = 'button';
                    themeBtn.className = 'treejson-btn treejson-theme-btn';
                    toolbar.appendChild(themeBtn);
                    this.elements.themeBtn = themeBtn;
                }

                this.container.appendChild(toolbar);
            }

            const viewer = document.createElement('div');
            viewer.className = 'treejson-viewer';

            const lineNumbers = document.createElement('div');
            lineNumbers.className = 'treejson-line-numbers';

            const content = document.createElement('div');
            content.className = 'treejson-content';

            viewer.appendChild(lineNumbers);
            viewer.appendChild(content);
            this.container.appendChild(viewer);

            const errorMessage = document.createElement('div');
            errorMessage.className = 'treejson-error';
            errorMessage.style.display = 'none';
            this.container.appendChild(errorMessage);

            this.elements.lineNumbers = lineNumbers;
            this.elements.content = content;
            this.elements.errorMessage = errorMessage;
        }

        _bindEvents() {
            if (this.elements.formatBtn) {
                this.elements.formatBtn.addEventListener('click', () => {
                    this.setData(this.elements.textarea.value);
                });
            }

            if (this.elements.textarea) {
                this.elements.textarea.addEventListener('keydown', (e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                        e.preventDefault();
                        this.setData(this.elements.textarea.value);
                    }
                });
            }

            if (this.elements.themeBtn) {
                this.elements.themeBtn.addEventListener('click', () => this.toggleTheme());
            }
        }

        // ---------------------------------------------------------------
        // Rendering (interactive tree)
        // ---------------------------------------------------------------

        _render(data) {
            this.elements.content.innerHTML = '';
            const { fragment } = this._formatJson(data, 0, '', 0);
            this.elements.content.appendChild(fragment);
            this._addCollapseListeners(this.elements.content);
            this._updateLineNumbers();
        }

        _showError(jsonString, error) {
            this.elements.errorMessage.textContent = 'JSON Parse Error: ' + error.message;
            this.elements.errorMessage.style.display = 'block';
            this.elements.content.innerHTML = '';

            const match = error.message.match(/at position (\d+)/);
            let errorLineNumber = null;
            if (match) {
                const errorPosition = parseInt(match[1], 10);
                const text = jsonString.substring(0, errorPosition);
                errorLineNumber = text.split('\n').length;
            }

            const lines = jsonString.split('\n');
            let lineNumbersHtml = '';
            lines.forEach((line, index) => {
                const lineDiv = document.createElement('div');
                lineDiv.className = 'treejson-line';
                const isErrorLine = index + 1 === errorLineNumber;
                if (isErrorLine) lineDiv.classList.add('treejson-error-line');
                lineDiv.textContent = line;
                this.elements.content.appendChild(lineDiv);

                lineNumbersHtml += isErrorLine
                    ? '<div class="treejson-error-line">' + (index + 1) + '</div>'
                    : '<div>' + (index + 1) + '</div>';
            });

            this.elements.lineNumbers.innerHTML = lineNumbersHtml;
            this.elements.lineNumbers.style.height = this.elements.content.scrollHeight + 'px';
        }

        // Renders one JSON value. `prefix` is HTML placed at the start of the line
        // (e.g. an object key: `"name": `). Returns {fragment, lastLine} so the
        // caller can attach a trailing comma to the correct line.
        //
        // Branches at or beyond `autoCollapseDepth` are rendered collapsed and
        // their children are NOT built yet — the raw value is stashed in
        // `_lazyNodes` and only turned into real DOM the first time the user
        // expands that node. This keeps the initial render fast and light even
        // for very large or deeply nested documents.
        _formatJson(obj, indent, prefix, depth) {
            const fragment = document.createDocumentFragment();

            if (typeof obj !== 'object' || obj === null) {
                const line = this._addLine(fragment, indent);
                line.innerHTML = ' '.repeat(indent) + prefix + syntaxHighlightValue(JSON.stringify(obj));
                return { fragment, lastLine: line };
            }

            const isArray = Array.isArray(obj);
            const keyCount = isArray ? obj.length : Object.keys(obj).length;

            if (keyCount === 0) {
                const line = this._addLine(fragment, indent);
                line.innerHTML = ' '.repeat(indent) + prefix + '<span class="treejson-bracket">' + (isArray ? '[ ]' : '{ }') + '</span>';
                return { fragment, lastLine: line };
            }

            const openLine = this._addLine(fragment, indent);
            openLine.innerHTML = ' '.repeat(indent) + prefix
                + '<span class="treejson-bracket">' + (isArray ? '[' : '{') + '</span>'
                + '<span class="treejson-collapsible"></span>';

            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'treejson-children';

            const shouldDefer = depth >= this.options.autoCollapseDepth;
            if (shouldDefer) {
                openLine.classList.add('treejson-collapsed');
                const collapsibleEl = openLine.querySelector('.treejson-collapsible');
                this._lazyNodes.set(collapsibleEl, { obj, indent, depth, isArray });
            } else {
                childrenContainer.appendChild(this._buildChildren(obj, indent, depth, isArray));
            }

            openLine.appendChild(childrenContainer);

            const closingLine = this._addLine(fragment, indent);
            closingLine.innerHTML = ' '.repeat(indent) + '<span class="treejson-bracket">' + (isArray ? ']' : '}') + '</span>';

            return { fragment, lastLine: closingLine };
        }

        // Builds the DOM for an object/array's entries. Shared by the initial
        // (eager) render and by lazy expansion of a deferred node. For arrays
        // longer than `maxArrayItems`, only the first N items are built and a
        // placeholder line takes the place of the rest.
        _buildChildren(obj, indent, depth, isArray) {
            const fragment = document.createDocumentFragment();
            let entries = isArray ? obj.map((v, i) => [i, v]) : Object.keys(obj).map((k) => [k, obj[k]]);

            let hiddenCount = 0;
            if (isArray && Number.isFinite(this.options.maxArrayItems) && entries.length > this.options.maxArrayItems) {
                hiddenCount = entries.length - this.options.maxArrayItems;
                entries = entries.slice(0, this.options.maxArrayItems);
            }

            entries.forEach(([key, value], i) => {
                const prefix = isArray ? '' : '<span class="treejson-key">"' + escapeHtml(key) + '"</span>: ';
                const { fragment: childFragment, lastLine: childLastLine } = this._formatJson(value, indent + 2, prefix, depth + 1);
                fragment.appendChild(childFragment);
                if (i < entries.length - 1 || hiddenCount > 0) {
                    childLastLine.innerHTML += '<span class="treejson-comma">,</span>';
                }
            });

            if (hiddenCount > 0) {
                const note = this._addLine(fragment, indent + 2);
                note.innerHTML = ' '.repeat(indent + 2) + '<span class="treejson-truncated">… '
                    + hiddenCount + ' more item' + (hiddenCount === 1 ? '' : 's') + '</span>';
            }

            return fragment;
        }

        _addLine(container, indent) {
            const line = document.createElement('div');
            line.className = 'treejson-line';
            container.appendChild(line);
            return line;
        }

        _escapeHtml(str) {
            return escapeHtml(str);
        }

        // Attaches click handlers to every `.treejson-collapsible` under `root`
        // that doesn't already have one. Called after the initial render and
        // again after lazily building a node's children, so newly created
        // nested collapsibles become clickable too.
        _addCollapseListeners(root) {
            const collapsibles = root.querySelectorAll('.treejson-collapsible');
            collapsibles.forEach((el) => {
                if (el.dataset.tjBound) return;
                el.dataset.tjBound = '1';
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this._toggleCollapse(el);
                });
            });
        }

        _toggleCollapse(collapsibleEl) {
            const openLine = collapsibleEl.parentElement;

            if (this._lazyNodes.has(collapsibleEl)) {
                const { obj, indent, depth, isArray } = this._lazyNodes.get(collapsibleEl);
                const childrenContainer = openLine.querySelector(':scope > .treejson-children');
                const builtFragment = this._buildChildren(obj, indent, depth, isArray);
                childrenContainer.appendChild(builtFragment);
                this._lazyNodes.delete(collapsibleEl);
                this._addCollapseListeners(childrenContainer);
            }

            openLine.classList.toggle('treejson-collapsed');
            this._updateLineNumbers();
        }

        // Numbers only the currently visible (non-collapsed) lines, in order.
        // Visibility is determined by walking up for a collapsed ancestor
        // rather than reading `offsetParent`, which would force a synchronous
        // layout recalculation for every single line on every toggle — that
        // gets slow fast once a document has more than a few thousand lines.
        _updateLineNumbers() {
            const lines = this.elements.content.querySelectorAll('.treejson-line');
            let lineNumbersHtml = '';
            let visibleCount = 0;

            lines.forEach((line) => {
                const hidden = !!line.parentElement.closest('.treejson-collapsed');
                if (!hidden) {
                    visibleCount++;
                    lineNumbersHtml += '<div>' + visibleCount + '</div>';
                } else {
                    lineNumbersHtml += '<div></div>';
                }
            });

            this.elements.lineNumbers.innerHTML = lineNumbersHtml;
            this.elements.lineNumbers.style.height = this.elements.content.scrollHeight + 'px';
        }
    }

    global.TreeJSON = TreeJSON;
})(typeof window !== 'undefined' ? window : this);
