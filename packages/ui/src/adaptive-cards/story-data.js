/* Cards for the Adaptive Cards stories and tests (ADR-029). Each is a
   schema 1.6 payload as an agent would send it; images are inline, so
   nothing is fetched. */

/* A small inline image (a theme-neutral mark), for cards that need one. */
export const PICTURE = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="6" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="14" cy="15" r="4" fill="currentColor"/><path d="M6 32l10-10 6 6 6-8 6 12z" fill="currentColor"/></svg>');

/* An invoice to pay, the walkthrough of US-085: an amount, and a Pay action marked high-impact. */
export const PAY_INVOICE = {
  type: "AdaptiveCard", version: "1.6",
  body: [
    { type: "TextBlock", text: "Invoice INV-2041 from Acme Ltd", style: "heading", wrap: true },
    { type: "FactSet", facts: [{ title: "Due", value: "31 October 2026" }, { title: "Reference", value: "Acme v Beta, October" }] },
    { type: "Input.Number", id: "amount", label: "Amount (£)", value: 120, min: 1, isRequired: true, errorMessage: "Enter an amount of £1 or more." },
  ],
  actions: [
    { type: "Action.Execute", title: "Pay invoice", verb: "pay", style: "positive", data: { invoice: "INV-2041", "ux-builder": { highImpact: true, consequence: "Pay £120.00 to Acme Ltd" } } },
    { type: "Action.Submit", title: "Save for later", data: { invoice: "INV-2041", intent: "later" } },
  ],
};

/* A card that passes every card rule. */
export const CLEAN = {
  type: "AdaptiveCard", version: "1.6",
  body: [
    { type: "TextBlock", text: "Book a table", style: "heading", wrap: true },
    { type: "TextBlock", text: "Choose a time and how many people. We hold the table for **15 minutes**.", wrap: true },
    { type: "Input.Date", id: "date", label: "Date", isRequired: true, errorMessage: "Choose a date." },
    { type: "Input.ChoiceSet", id: "people", label: "People", wrap: true, value: "2", choices: [{ title: "2 people", value: "2" }, { title: "4 people", value: "4" }] },
  ],
  actions: [{ type: "Action.Submit", title: "Book table", style: "positive", data: { action: "book" } }],
};

/* Every element of the open-source schema 1.6, with its input and action types. */
export const EVERY_ELEMENT = {
  type: "AdaptiveCard", version: "1.6",
  body: [
    { type: "TextBlock", id: "title", text: "Every element", style: "heading", wrap: true },
    { type: "TextBlock", text: "Text with **bold**, _italic_ and a [link](https://example.com).\n\n- one\n- two", wrap: true, size: "medium", isSubtle: true },
    { type: "RichTextBlock", inlines: ["Plain, ", { type: "TextRun", text: "bold", weight: "bolder" }, ", ", { type: "TextRun", text: "highlighted", highlight: true }, " and ", { type: "TextRun", text: "struck", strikethrough: true }] },
    { type: "Image", url: PICTURE, altText: "A picture", size: "small" },
    { type: "ImageSet", imageSize: "small", images: [{ type: "Image", url: PICTURE, altText: "First picture" }, { type: "Image", url: PICTURE, altText: "Second picture" }] },
    { type: "Media", altText: "A short video", poster: PICTURE, sources: [{ mimeType: "video/mp4", url: "https://example.com/video.mp4" }], captionSources: [{ mimeType: "vtt", url: "https://example.com/captions.vtt", label: "English" }] },
    { type: "Container", style: "good", items: [{ type: "TextBlock", text: "A container in the good style", wrap: true }] },
    { type: "Container", style: "emphasis", items: [{ type: "TextBlock", text: "An emphasis container", wrap: true }] },
    {
      type: "ColumnSet", id: "columns", columns: [
        { type: "Column", width: "auto", items: [{ type: "Image", url: PICTURE, altText: "A picture in a column", size: "small" }] },
        { type: "Column", width: "stretch", items: [{ type: "TextBlock", text: "A stretched column beside an auto one", wrap: true }] },
        { type: "Column", width: 2, items: [{ type: "TextBlock", text: "A weighted column", wrap: true }] },
      ],
    },
    { type: "FactSet", facts: [{ title: "Matter", value: "Acme v Beta" }, { title: "Hearing", value: "14 November" }] },
    {
      type: "Table", columns: [{ width: 1 }, { width: 1 }], rows: [
        { type: "TableRow", cells: [{ type: "TableCell", items: [{ type: "TextBlock", text: "Filing", wrap: true }] }, { type: "TableCell", items: [{ type: "TextBlock", text: "Date", wrap: true }] }] },
        { type: "TableRow", cells: [{ type: "TableCell", items: [{ type: "TextBlock", text: "Defence", wrap: true }] }, { type: "TableCell", items: [{ type: "TextBlock", text: "3 October", wrap: true }] }] },
      ],
    },
    { type: "Input.Text", id: "name", label: "Name", placeholder: "Your name" },
    { type: "Input.Text", id: "note", label: "Note", isMultiline: true },
    { type: "Input.Number", id: "count", label: "Count", min: 0, max: 10 },
    { type: "Input.Date", id: "when", label: "Date" },
    { type: "Input.Time", id: "at", label: "Time" },
    { type: "Input.Toggle", id: "agree", label: "Terms", title: "I agree to the terms" },
    { type: "Input.ChoiceSet", id: "size", label: "Size (compact)", wrap: true, choices: [{ title: "Small", value: "s" }, { title: "Large", value: "l" }] },
    { type: "Input.ChoiceSet", id: "colour", label: "Colour (expanded)", style: "expanded", wrap: true, choices: [{ title: "Red", value: "red" }, { title: "Blue", value: "blue" }] },
    { type: "Input.ChoiceSet", id: "city", label: "City (filtered)", style: "filtered", wrap: true, choices: [{ title: "London", value: "lon" }, { title: "Los Angeles", value: "lax" }] },
    { type: "Input.ChoiceSet", id: "extras", label: "Extras (multi-select)", isMultiSelect: true, wrap: true, choices: [{ title: "Milk", value: "milk" }, { title: "Sugar", value: "sugar" }] },
    { type: "ActionSet", actions: [{ type: "Action.ToggleVisibility", title: "Show the details", targetElements: ["details"] }] },
    { type: "Container", id: "details", isVisible: false, items: [{ type: "TextBlock", text: "The details, shown on request.", wrap: true }] },
  ],
  actions: [
    { type: "Action.Submit", title: "Send the form", style: "positive", data: { form: "every" } },
    { type: "Action.Execute", title: "Run the check", verb: "check", data: { form: "every" } },
    { type: "Action.OpenUrl", title: "Open the guide", url: "https://example.com/guide" },
    { type: "Action.ShowCard", title: "Add a comment", card: { type: "AdaptiveCard", body: [{ type: "Input.Text", id: "comment", label: "Comment", isMultiline: true }], actions: [{ type: "Action.Submit", title: "Post comment", data: { form: "comment" } }] } },
  ],
};

/* Text with markdown, HTML, a script and a template, US-083-AC5. */
export const MARKUP = {
  type: "AdaptiveCard", version: "1.6",
  body: [
    { type: "TextBlock", text: "Text that is not HTML", style: "heading", wrap: true },
    { type: "TextBlock", id: "md", wrap: true, text: "**Bold** and _italic_ and [a link](https://example.com) and [a bad link](javascript:alert(1))" },
    { type: "TextBlock", id: "html", wrap: true, text: "<b>not bold</b> <img src=x onerror=\"window.pwned=1\"> <script>window.pwned=2</script>" },
    { type: "TextBlock", id: "tpl", wrap: true, text: "Hello ${name}, # not a heading" },
  ],
};

/* A card from a newer schema, with a host-specific element and one outside 1.6 with a fallback, US-083-AC4. */
export const NEWER = {
  type: "AdaptiveCard", version: "1.7",
  body: [
    { type: "TextBlock", text: "A newer card", style: "heading", wrap: true },
    { type: "Carousel", pages: [{ type: "CarouselPage", items: [{ type: "TextBlock", text: "A page" }] }] },
    { type: "Badge", text: "New", fallback: { type: "TextBlock", id: "badge-fallback", text: "New (shown as text)", wrap: true } },
    { type: "Rating", value: 4, fallback: "drop" },
    { type: "Chart.Pie", data: [], fallback: { type: "CodeBlock", fallback: { type: "TextBlock", id: "nested-fallback", text: "A chart, as text", wrap: true } } },
  ],
};

/* A destructive action: FEAT-008's confirmation before onAction. */
export const DESTRUCTIVE = {
  type: "AdaptiveCard", version: "1.6",
  body: [{ type: "TextBlock", text: "Draft reply to Beta Corp", style: "heading", wrap: true }, { type: "TextBlock", text: "Saved 2 minutes ago.", wrap: true }],
  actions: [{ type: "Action.Submit", title: "Discard draft", style: "destructive", data: { draft: "D-7" } }, { type: "Action.Submit", title: "Keep editing", data: { draft: "D-7", keep: true } }],
};

/* A wide ColumnSet, for the compact collapse, US-083-AC3. */
export const COLUMNS = {
  type: "AdaptiveCard", version: "1.6",
  body: [
    { type: "TextBlock", text: "Flight BA 117", style: "heading", wrap: true },
    {
      type: "ColumnSet", id: "legs", columns: [
        { type: "Column", width: "120px", items: [{ type: "TextBlock", text: "London Heathrow, Terminal 5", wrap: true, size: "large" }] },
        { type: "Column", width: "auto", items: [{ type: "Image", url: PICTURE, altText: "to", size: "small" }] },
        { type: "Column", width: "stretch", items: [{ type: "TextBlock", text: "New York John F. Kennedy International, Terminal 7", wrap: true, size: "large", horizontalAlignment: "right" }] },
      ],
    },
  ],
};
