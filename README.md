# ELDAutoCheck

A Chrome extension that automates HOS compliance workflows on [TrendyELD](https://trendyeld.com).

---

### Features

- **Modern Dark Theme** — sleek, deep-dark interface across trendyeld.com with zero-flash loading, dark tables, cards, dialogs, inputs, preserved ELD status indicator colors, and `Alt + T` toggle shortcut
- **Cross-Browser Support** — runs natively in Firefox, Edge, and Chrome (Manifest V3)
- **One-click auto-check** — selects all standard normalization checkboxes (metadata, intermediate events, coordinates, certify fixes, etc.)
- **Keyboard hotkeys** — full shortcut support for every tool, works on both Latin and Cyrillic layouts
- **Transaction flow** — automates Open Transaction → Fix Violations → Save; press `Z` to commit
- **Smart injection** — the button appears only when the Normalize panel is visible
- **Lightweight** — uses idle callbacks, batched DOM updates, and debounced observers

---

### Hotkeys

| Key | Action | Key | Action |
|:---:|--------|:---:|--------|
| `Q` | Create | `S` | Bulk |
| `W` | Edit | `D` | Normalize |
| `E` | Shift | `X` | Preview |
| `A` | Delete | `C` | Save |
| `Z` | Process Transaction | `Alt + T` | Toggle Dark Theme |

Cyrillic layouts are mapped to the same physical keys.

---

### Install

#### Chrome / Edge:
1. Open `chrome://extensions` (or `edge://extensions`) and enable **Developer mode**
2. Click **Load unpacked** and select the `ELDAutoCheck` folder
3. Navigate to [trendyeld.com](https://trendyeld.com)

#### Firefox:
1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on...** and select `manifest.json`
3. Navigate to [trendyeld.com](https://trendyeld.com)

---

### Project structure

```
ELDAutoCheck/
├── manifest.json     Chrome extension manifest (MV3)
├── content.js        Hotkeys, automation, UI injection
├── dark-theme.css    Deep dark theme stylesheet
└── assets/           Images
```

---

### License

[MIT](LICENSE)
