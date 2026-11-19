# Synaptiq icons

Copied from the Synaptiq brand kit (2026-11-19) for the SDK's "synaptiq" icon set: packages/ui/scripts/gen-synaptiq-icons.mjs
turns `library/` into `<Icon name="syn-NN-MMM" />` and into the shared names on a theme whose icon.set is "synaptiq"
(vk-synaptiq). The contact sheet and its build script stay in the brand kit.

The icon library from the Synaptiq Sales/Brand Deck template, slides 59–63 ("Iconography Library").

- `library/sNN-MMM.svg`: one file per icon (581 in all). `NN` is the slide in the brand deck. `MMM` is the icon's place on that slide, counting left to right and top to bottom. Every icon is a filled vector shape in Charcoal (#302A28), so it opens in Illustrator and can be recolored.
- `contact-sheet.pdf`: every icon with its number, one page per slide. Rebuild it with `node build/icon-sheet.js`.

| Slide | Icons | What's on it |
|---|---|---|
| 59 | 81 | Social logos in circles (59-001 to 59-033) and general line icons |
| 60 | 187 | Thin-line arrows, maps, weather, documents, check marks and charts |
| 61 | 129 | Thin-line devices, media, science, layout and office icons |
| 62 | 85 | Money, shopping carts, cloud, social logos in squares and file types |
| 63 | 99 | A slightly heavier business set: awards, people, buildings and tools |

Slides 60–62 share one line weight. Pick a paper's icons from those slides so the icons match, preferably slide 60, which every section icon in the sample paper comes from. Slide 62's money icons (coins, banknotes, wallets: 62-001 to 62-007, 62-018 to 62-021) have solid filled marks and look heavier than the rest; for cost or pricing, use the price tag 60-186 instead.

To put an icon on a section heading, see "Section icons" in the main README (`# Heading {icon=60-124}` in Markdown).
