# Theme Builder prototype

> Superseded by the real builder in `apps/theme-builder` (`npm run builder`).
> Kept as the concept and walkthrough it was built from.

A standalone concept of the guided brand builder (FEAT-003, Option A "Guided
wizard"): upload a logo, compare palette options across shared design systems
in light and dark, save a theme (brand + design system), and see how an app
integrates it. Plain HTML and JavaScript, with no build and no dependency on
`@ux-builder/ui`. It is a mock-up, not the product.

- `theme-builder.html` is the source, published as a Claude artifact
  (https://claude.ai/artifact/XHV8J6UkaQ6NXf7kBGa58L).
- `index.html` is the same page wrapped as a full document so it opens from
  disk. Regenerate it after editing `theme-builder.html`:

  ```sh
  { printf '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'; sed -n '1,/^<\/style>/p' theme-builder.html; printf '</head>\n<body>\n'; sed -n '/^<\/style>/,$p' theme-builder.html | tail -n +2; printf '</body>\n</html>\n'; } > index.html
  ```

## Scripts

```sh
npm install
npm run smoke     # click through all six steps; writes shot-*.png
npm run record    # narrated walkthrough -> theme-builder-walkthrough.mp4
```

`record` needs `ffmpeg`. It uses OpenAI text-to-speech (voice `coral`, override
with `TTS_VOICE`) when the macOS Keychain holds an `openai-api-key` item, and
falls back to macOS `say` otherwise. The video and its working files are not
committed.
