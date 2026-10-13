# ELDAutoCheck

A Chrome extension that automates HOS compliance workflows on [TrendyELD](https://trendyeld.com).

---

### Features

- **Modern Dark Theme** — sleek, deep-dark interface across trendyeld.com with zero-flash loading, dark tables, cards, dialogs, inputs, and preserved ELD status indicator colors
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
| | | `Z` | Process Transaction |

Cyrillic layouts are mapped to the same physical keys.

---

### Install

1. Clone the repo
   ```
   git clone https://github.com/Fikser0/ELDAutoCheck.git
   ```
2. Open `chrome://extensions` and enable **Developer mode**
3. Click **Load unpacked** and select the `ELDAutoCheck` folder
4. Navigate to [trendyeld.com](https://trendyeld.com) — the extension activates automatically

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
