# tree.json

A vanilla-JS JSON viewer you embed with one line: `new TreeJSON(element, options)`. Syntax highlighting, a collapsible tree, light/dark theming, and a couple of knobs specifically for keeping large payloads fast — all with zero runtime dependencies.

Live demo: open `index.html` in a browser, no build step involved.

## Setup

`js/treejson.js` is all you need — its CSS is bundled inside it and gets injected into `<head>` the moment the script runs, so a single `<script>` tag is enough:

```html
<div id="viewer"></div>

<script src="js/treejson.js"></script>
<script>
  new TreeJSON('#viewer', {
    data: { hello: 'world' },
    theme: 'dark'
  });
</script>
```

Adjust the `src` path to wherever you put `treejson.js` — it doesn't have to live in a `js/` folder, that's just how this repo is organized.

**Prefer a separate stylesheet?** (Strict CSP without `unsafe-inline`, an asset pipeline that wants to own your CSS, etc.) Link `css/treejson.css` yourself, before `treejson.js`, and the auto-injection is skipped automatically:

```html
<link rel="stylesheet" href="css/treejson.css">
<script src="js/treejson.js"></script>
```

Why bundling the CSS into the JS is safe to do here, performance-wise: every element TreeJSON draws — including the theme toggle and the tree itself — is created by this same script. Nothing on the page needs those styles before the script runs, so there's no flash of unstyled content to worry about, unlike inlining CSS for markup that's already in your HTML. The only real cost is that `treejson.js` is a few KB bigger than it would be without the CSS in it, and you save the separate request for `treejson.css` in return. For a library this size that trade is a wash either way — pick whichever setup fits your CSP / build tooling.

---

## Why this exists

Most JSON viewers are either a browser devtools panel (not embeddable) or a full framework component (React/Vue-only, dependency-heavy). This is neither — it's one `<script>` tag, works in any stack, and mounts onto any container you give it. You can run several independent viewers on the same page; nothing is global except the `TreeJSON` constructor itself.

## Two ways to use it

### 1. The interactive viewer

Once `treejson.js` is loaded (see Setup above), give it a container and it builds an input box, a Format button, a theme toggle, and the collapsible tree itself:

```html
<div id="viewer"></div>
<script>
  const viewer = new TreeJSON('#viewer', { data: myObject });
</script>
```

Talk to it afterwards through its methods:

```js
viewer.setData(newObject);   // re-render with new data (object or JSON string)
viewer.getData();            // last successfully parsed value
viewer.setTheme('dark');     // or 'light'
viewer.toggleTheme();
viewer.destroy();            // tear the instance down
```

Pass `editable: false` to drop the textarea/Format button for a read-only embed, and `showThemeToggle: false` to hide the built-in theme button if your app already has its own theme switcher (drive it via `setTheme()` instead).

**Just the colored output, no toolbar at all?** Set both to `false` — you still get the collapsible tree and line numbers, just without the input box or buttons above it:

```html
<div id="viewer"></div>
<script>
  new TreeJSON('#viewer', {
    data: myObject,
    theme: 'dark',
    editable: false,
    showThemeToggle: false
  });
</script>
```

If you also don't need collapsing/line numbers — a completely static block — use `TreeJSON.toHTML()` instead (see option 2 below); it's lighter weight since it skips building an interactive tree entirely.

### 2. Plain colored HTML, no widget at all

If you don't need collapsing or an input box — you just want a nicely colored JSON block somewhere on the page — skip the constructor entirely:

```js
document.querySelector('#log-line').innerHTML = TreeJSON.toHTML(payload, { theme: 'dark' });
```

This is a static method: it returns a string and touches nothing until you assign it — see Handling large JSON below for why that also makes it the fastest option for big, read-only payloads.

## Options

Passed as the second argument to `new TreeJSON(target, options)`:

| Key | Default | What it does |
|---|---|---|
| `data` | `{}` | Object, array, or JSON string to render on load |
| `theme` | `'light'` | `'light'` or `'dark'` |
| `editable` | `true` | Show the textarea + Format button |
| `showThemeToggle` | `true` | Show the built-in theme button |
| `autoCollapseDepth` | `Infinity` | Nodes at/past this nesting level start collapsed *and stay unbuilt* until opened |
| `maxArrayItems` | `Infinity` | Arrays past this length render a "+N more" line instead of every item |
| `onThemeChange` | `null` | `(theme) => {}` fired on every theme switch |
| `onError` | `null` | `(error) => {}` fired when `setData` is handed invalid JSON |

`TreeJSON.toHTML(data, { theme, indent })` takes just `theme` (default `'light'`) and `indent` (spaces per level, default `2`).

## Theming

Every color in the widget is a CSS custom property, scoped to `[data-theme="light"]` / `[data-theme="dark"]` on the root `.treejson` element. Switching themes just flips that attribute — light and dark are both included out of the box, and you can override individual variables to build your own:

```css
.treejson[data-theme="dark"] {
  --tj-accent: #ff6b6b;   /* recolor the Format/toggle buttons */
  --tj-string-color: #7ec699;
}
```

Full variable list is at the top of the stylesheet — inside `js/treejson.js`'s embedded `CSS_TEXT`, or in `css/treejson.css` if you're linking it separately.

## Handling large JSON

Rendering builds a real DOM element per visible line, which is how per-node collapsing works — but it's also the thing that gets slow if you hand it something huge without any limits. Two options exist specifically for this:

- **`autoCollapseDepth`** — for JSON that's *deep*. Anything past the given nesting level renders collapsed and isn't turned into DOM until a user actually clicks it open. A 10-level document with `autoCollapseDepth: 2` only builds the outer two levels up front.
- **`maxArrayItems`** — for JSON that's *wide*. A 5,000-item array only renders the first N entries plus a placeholder for the rest, instead of 5,000 DOM nodes.

For anything read-only, `TreeJSON.toHTML()` sidesteps the DOM-per-line cost altogether since it's just string building — worth reaching for first if you don't need collapsing.

Measured on a 5,000-object array (25,004 lines fully expanded): an unrestricted interactive render takes roughly **2–3 seconds**, the same data with `maxArrayItems: 50` takes roughly **50–100ms**, and `toHTML()` rendering all 5,000 items as a string takes roughly **200ms**. Exact numbers depend on the machine, but the relative gap — two to three orders of magnitude — holds up.

## Files

```
index.html         demo page
js/treejson.js      the library — one class, no external state, styles included
js/demo.js           wires the library into index.html
css/treejson.css    same styles as a standalone file, for the opt-out setup above
css/demo.css         demo page chrome only, not required by the library
```

## License

MIT
