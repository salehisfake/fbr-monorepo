# MPlus Font Families

The site now loads all MPlus fonts from `public/fonts/mplus` via `src/app/mplus-fonts.css`.

## Primary CSS Variables

- `--font-mplus`: `'MPlus 1 Nerd', sans-serif`
- `--font-noto-serif`: `'MPlus 2 Nerd Propo', 'MPlus 2 Nerd', sans-serif`
- `--font-mplus-code`: `'MPlus 1 Code Nerd', 'MPlus CodeLat60 Nerd Mono', monospace`

## Available Families

You can use these directly in `font-family`:

- `MPlus 1 Nerd`
- `MPlus 1 Nerd Propo`
- `MPlus 2 Nerd`
- `MPlus 2 Nerd Propo`
- `MPlus 1 Code Nerd`
- `MPlus 1 Code Nerd Propo`
- `MPlus 1 Code Nerd Mono`
- `MPlus CodeLat50 Nerd`
- `MPlus CodeLat50 Nerd Propo`
- `MPlus CodeLat50 Nerd Mono`
- `MPlus CodeLat60 Nerd`
- `MPlus CodeLat60 Nerd Propo`
- `MPlus CodeLat60 Nerd Mono`

## Supported Weights

Not every family has every weight, but the pack includes these values:

- `100` Thin
- `200` ExtraLight
- `300` Light
- `400` Regular
- `500` Medium
- `600` SemiBold
- `700` Bold
- `800` ExtraBold
- `900` Black

## Usage Examples

```css
.title {
  font-family: var(--font-mplus);
  font-weight: 700;
}

.bodySerifLike {
  font-family: var(--font-noto-serif);
  font-weight: 400;
}

.code {
  font-family: var(--font-mplus-code);
  font-weight: 500;
}

.altDisplay {
  font-family: 'MPlus 1 Nerd Propo', sans-serif;
  font-weight: 800;
}
```
