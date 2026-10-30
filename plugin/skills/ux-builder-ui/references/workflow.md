# Building UI with the AI-UI SDK

This app's look comes from the AI-UI SDK: widgets from `@ux-builder/ui`, colours,
type and shapes from the theme in `@ux-builder/tokens`. The theme can change
(another client, another design system, light or dark) without any change
to the app, as long as the app follows the rules below.

## Rules

<!-- rules:start -->
1. Use the SDK's widgets (@ux-builder/ui) for buttons, fields, choices, tables, menus, tabs, breadcrumbs, sheets, notices, status pills, toasts, progress bars, spinners, skeletons, icons and the logo; do not build your own. Icons beyond the shared names come from @ux-builder/ui/icons, never hand-drawn.
2. Style your own markup with --piq-* role tokens (var(--piq-color-text), var(--piq-space-4), var(--piq-radius-control)); pick tokens by role, not by how they look today.
3. Never hard-code colours, font families or radii: no hex, rgb(), named colours, font names or pixel radii in CSS or style props.
4. Run the lint rule ux-builder/no-hard-coded-values (@ux-builder/ui/stylelint, @ux-builder/ui/eslint) with ux-builder/no-foreign-ui, ux-builder/no-inline-svg and ux-builder/ai-neutral-voice (a warning on copy that presents the AI as a person, "I think…", or as the actor, "Copilot, summarize"; English only), then the theme audit on the running app (npx ux-builder-audit <url>, @ux-builder/audit), and fix what they report.
5. Select themes with ThemeProvider (theme, appearance) or data-theme and data-appearance on <html>; never restyle per theme in app code.
6. Compose screens from @ux-builder/ui/patterns before writing any layout CSS: AppShell for the frame, with each screen inside a Page, which gives it the page gutter and width (AppShell's content area and the screen patterns have none of their own; ErrorScreen excepted); CollectionList, ListDetail, RecordDetail, FormPage, QuickEdit, Dashboard, ReportViewer, SettingsPage and ErrorScreen for screens; the regions and the layout primitives (Stack, Cluster, Grid, Page, SplitView) for anything else. Supply content, data and actions through their slots; never fork or restyle a pattern.
7. Plan before you build: describe the app or view in its blueprint, docs/ux-builder/blueprint/app.blueprint.json (ux-builder-blueprint init, or the MCP tool get_blueprint_schema), choose its screens from the recipes (list_recipes), and run ux-builder-blueprint check (or check_blueprint) until it reports no errors. Then build, lint and audit. Rules apply by size class, input and context (app or embedded view), and by the app's modalities (supports.modalities: responsive-web, chat, hybrid-chat), never by device.
<!-- rules:end -->

## Setting up

```js
// once, at the entry point, before the app's own CSS
import "@ux-builder/tokens/themes/<theme>.css";
import "@ux-builder/tokens/fonts/<theme>.css";
import "@ux-builder/ui/ui.css";
```

```jsx
import { ThemeProvider } from "@ux-builder/ui";

<ThemeProvider theme="<theme>" appearance="system">
  <App />
</ThemeProvider>
```

## Doing common things

- **A filter or view switch** with two to five options: `<ChoicePicker>`, not
  a row of buttons.
- **A primary action**: `<Button>`; the action beside it:
  `<Button variant="secondary">`; a quiet one: `<Button variant="text">`. A
  count on it: `badge`.
- **A form**: `<TextField>`, `<TextArea>`, `<Select>`, `<Checkbox>`,
  `<Switch>`, `<RadioGroup>`, each with its `label`; errors go in `error`,
  help in `hint`.
- **A list of records**: `<DataTable>` with `columns` and `rows`; statuses
  in a cell with `<StatusPill>`.
- **A message in the page**: `<Notice tone="warning">`; after an action,
  `useToast()`.
- **An icon**: `<Icon name="search" />`; give it a `label` when it is the
  only thing saying what a control does.
- **Your own layout**: plain elements styled with role tokens:

  ```css
  .matter-summary {
    padding: var(--piq-space-4);
    background: var(--piq-color-surface);
    color: var(--piq-color-text);
    border: var(--piq-border-default);
    border-radius: var(--piq-radius-card);
    font-family: var(--piq-font-body);
  }
  ```

- **Light and dark**: never write a dark-mode stylesheet. `useTheme()`
  gives `setAppearance`; the tokens change by themselves.

## Do not

- Copy a widget's markup or CSS into the app.
- Write a colour, font family or radius as a literal, even one that matches
  the theme today; it will be wrong under the next theme.
- Style a widget by targeting its `.piq-*` classes or setting its widget
  tokens; use its props.
- Check for a theme name in app code to change styles.

<!-- episode:start -->
## Recording the build

Every UI or UX change is an **episode**, recorded in `.ux-builder/trace/` and committed
with the code (`@ux-builder/trace`, CONTRACT-007). ux-builder's tools write what they told
you and every check they ran; you record the rest:

1. **Open an episode** before you change a screen: the MCP tool `start_episode` (its goal,
   stories, screens and journeys), or `npx ux-builder-trace start --goal "<goal>" --story US-<n> --screen <id>`.
   If one is still open, end it first.
2. **Record a decision** at every pattern choice, every departure from the guidance and every
   workaround for a missing component: the MCP tool `record_decision` (`chose`, `considered`,
   `why`, `relied`: the rule and story IDs, `departs`, `workaround`, `screen`), or
   `npx ux-builder-trace decide --chose <what> --why <why> --relied <rule ID>`. Say why in a
   sentence; never paste code.
3. **Add the trailer** to every commit made in the episode: end its message with the line
   `UX-Episode: <episode ID>`.
4. **End the episode** once its commits are made: the MCP tool `end_episode`, or
   `npx ux-builder-trace end`. It records the commits, each check's attempts and the audit's
   verdicts, and warns about a commit without the trailer, or screens changed with no decision.

Nothing in the trace is sent anywhere; the app's owner shares episodes by choice
(`npx ux-builder-trace export`).
<!-- episode:end -->

<!-- catalogue:start -->
## Reference (generated from the SDK; do not edit by hand)

@ux-builder/ui 0.14.0, @ux-builder/tokens 1.7.0. The full catalogue, with every token and prop, is `@ux-builder/ui/catalogue.json`.

### Components

| Component | Props | Use it for |
|-----------|-------|------------|
| `<AppearanceSwitch>` | `value = "system", onChange, label = "Appearance", labels = { light: "Light", system: "Auto", dark: "Dark" }, available, className` | Light, the system's setting, or dark, as three icons in a pill: a radio group (arrow keys move and choose), each option named in text for assistive technology and shown on hover, the chosen one raised on a disc so the choice is never colour alone. value is "light", "system" or "dark", as ThemeProvider's appearance takes; available lists the appearances the theme has, and the others are disabled. |
| `<Breadcrumbs>` | `items = [], label = "Breadcrumb", onNavigate, className` | Where the page sits in a hierarchy, as an ordered list of links in a navigation landmark; the last item is the current page. Where it has little width (the compact size class) it shows only a link back to the parent. |
| `<Button>` | `variant = "primary", size, badge, busy = false, type = "button", className = "", onClick, children` | A button in one of three emphases: primary for the one action a view wants, secondary beside it, text for actions that should not compete. While busy it shows a spinner over its label, keeps its width and name, and ignores clicks. |
| `<Card>` | `title, actions, children, as = "section"` | A bounded group of content with an optional title and actions. |
| `<Checkbox>` | `label, className = ""` | One on/off choice with its label. |
| `<ChoicePicker>` | `label, options, value, onChange, disabled` | One choice from a few, every option in view: a radio group drawn as segments. It is a single tab stop; the arrow keys, Home and End move the selection, as a native radio group does. |
| `<Combobox>` | `label, options = [], value, onChange, placeholder, hint, error, emptyLabel = "No matches", id, className` | A choice from a long list by typing: the WAI-ARIA Combobox pattern with a listbox popup. Typing filters the options; Down and Up move the active option (focus stays in the field, aria-activedescendant follows); Enter chooses; Escape closes without changing the choice; with no match it says so. |
| `<DataTable>` | `columns, rows, rowKey = "id", caption, pageSize = 10, initialSort` | A table that sorts and pages. Sortable headers are buttons with aria-sort on their cell, so the order is announced; numbers align right and sort as numbers. |
| `<DatePicker>` | `label, value, onChange, min, max, hint, error, id, className` | A date, on the browser's own date input, so the keyboard, the calendar and screen readers work everywhere. value and onChange use YYYY-MM-DD. |
| `<DateRangePicker>` | `label, from, to, onChange, min, max, fromLabel = "From", toLabel = "To", className` | A date range: From and To dates in a group named by label. The To date cannot be before the From date. |
| `<Dialog>` | `open = false, onClose, title, description, actions, closeLabel = "Close", initialFocus, role, className, children` | A modal dialog in the middle of the screen: a short task or a decision. The page behind is inert, focus moves in (to initialFocus, a ref, if given) and returns to what opened it; Escape or the close button calls onClose. |
| `<Favicon>` | `—` | Keeps the page's icon on the theme's favicon, for a page that sets data-theme and data-appearance on <html> without a ThemeProvider; renders nothing. |
| `<Icon>` | `name, icon, set, size = "1em", label, className = ""` | An icon by shared name (ICON_NAMES) or registered name, or an icon from @ux-builder/ui/icons passed as icon, drawn in the theme's icon set, the text colour and 1em; decorative unless label names it. |
| `<JourneyProvider>` | `sink, children` | Hands the app's own sink each journey event (journey-start, step, complete, abandon, error-shown, empty-result, no-results-search) for its own analytics: wrap the app, or the part a journey runs in. Without a sink it does nothing, and the SDK sends nothing anywhere. |
| `<Logo>` | `variant = "logo", size = "md", label, className = ""` | The active theme's logo, or its mark (variant="mark"), drawn from the brand's artwork; a brand without artwork gets its title as a wordmark in the logo colour. |
| `<MenuButton>` | `label, items = [], icon, variant = "secondary", size, align = "start", buttonLabel, className` | A button that opens a menu of actions: account, workspace, a page's or a row's "More". Keyboard as the WAI-ARIA Menu Button pattern: Enter, Space or Down opens on the first item, Up on the last; arrows, Home and End move; a letter jumps to the next item starting with it; Escape closes and returns focus to the button. |
| `<Notice>` | `tone = "info", title, children` | A message in the flow of the page. The tone sets its colour and its mark; the title says the point, so the colour is never the only signal. |
| `<Pagination>` | `page = 1, pageSize = 20, total = 0, onPageChange, pageSizes = [10, 20, 50, 100], onPageSizeChange, label = "Pagination", ofLabel = "of", previousLabel = "Previous page", nextLabel = "Next page", pageSizeLabel = "Rows per page", className` | Moving through a long list a page at a time: where the user is ("21–40 of 312"), previous and next, and how many rows a page shows. Pages count from 1. |
| `<ProgressBar>` | `label, value, max = 100, valueText, showValue = false, hideLabel = false, className = ""` | A bar showing how much of a task is done, named by its visible label; leave out value while the amount is unknown and it moves instead. |
| `<RadioGroup>` | `label, options, name, value, defaultValue, onChange, disabled` | One choice from a short list, each option with its label, in a fieldset with a legend. |
| `<Select>` | `label, hint, error, id, className = "", options, placeholder` | A dropdown: one choice from a longer list, with its label, and an optional placeholder, hint or error. |
| `<Sheet>` | `open = false, onClose, title, label, side = "start", closeLabel = "Close", initialFocus, className, children` | A modal panel that slides in from an edge: the navigation drawer, filters on a phone, a short form. It is a modal dialog: the page behind is inert, focus moves into it and returns to what opened it, and Escape, the close button or a click outside calls onClose. |
| `<Skeleton>` | `variant = "text", lines = 1, width, height, className = "", style` | A placeholder in the shape of content that is loading: text lines, a block or a circle. It is hidden from assistive technology, so mark the region that holds it aria-busy="true". |
| `<Spinner>` | `size = "md", label = "Loading", showLabel = false, className = ""` | A turning ring for a short wait, announced as a status with its label (spoken only, unless showLabel puts it beside the ring). |
| `<StatusPill>` | `state, children` | An availability status. It is a label, never a target, and it always says its state in words, so colour is never the only signal. |
| `<Switch>` | `label, className = ""` | A setting that takes effect at once: a checkbox announced as on or off. |
| `<Tabs>` | `tabs = [], value, defaultValue, onChange, label, className` | Panels that share one place, one shown at a time, chosen by a row of tabs. Keyboard as the WAI-ARIA Tabs pattern: Left and Right (mirrored in a right-to-left page) move between tabs and show each, Home and End go to the ends; Tab moves into the panel. |
| `<TextArea>` | `label, hint, error, id, className = "", rows = 4` | Several lines of typed input with its label, and an optional hint or error. |
| `<TextField>` | `label, hint, error, id, className = ""` | A single line of typed input with its label, and an optional hint or error. |
| `<ThemeProvider>` | `theme, appearance = "system", tokens, favicon = true, onChange, as = "div", style, children` | Sets the theme and appearance (light, dark or system) for its subtree, and the page's favicon from the theme; pass tokens instead of theme for an embedded view. |
| `<Toast>` | `message, actionLabel, onAction, onMouseEnter, onMouseLeave, onFocus, onBlur` | A short confirmation after an action, with Undo. The region is a polite live region, so a screen reader announces each toast without moving focus. |
| `<ToastProvider>` | `children` | Holds the toasts for its subtree and shows them in a polite live region; wrap the app once. |
| `<Tooltip>` | `content, children, placement = "top", className` | A short description of a control, shown while the pointer is over it or it has keyboard focus: the WAI-ARIA Tooltip pattern. The control points to it with aria-describedby; Escape hides it without moving focus; the pointer can move onto it without it closing (WCAG 1.4.13). |

### Layout

Lay out screens with the layout primitives from `@ux-builder/ui/patterns` (load `@ux-builder/ui/patterns.css` after `ui.css`), never with your own flex or grid CSS. Each adapts to the width it is given, not the window, so it works in a narrow embed as on a phone. Size classes: compact from 0px, medium from 600px, expanded from 840px, large from 1200px, extra-large from 1600px.

| Primitive | Props | Use it for |
|-----------|-------|------------|
| `<Cluster>` | `gap = 3, justify = "start", align = "center", wrap = true, as = "div", className, children` | A row of children that wraps onto further rows when it runs out of width: buttons, tags, filters. justify is start, center, end or between. |
| `<Grid>` | `columns = { compact: 1, medium: 2, expanded: 3, large: 4 }, gap = 4, as = "div", className, children` | Equal columns whose count follows the width the grid is given, per size class: columns is a number for every class, or { compact, medium, expanded, large, extraLarge } where a class left out keeps the previous class's count. Counts run from 1 to 6. |
| `<Page>` | `width = "page", as = "div", className, children` | The frame of a screen's content: the design system's page gutter for the size class, and a maximum width (page, form or reading) centred in the space. |
| `<SplitView>` | `primary, secondary, show = "primary", ratio = "1:2", primaryLabel, secondaryLabel, className` | Two panes: side by side from the expanded size class up, and below it one pane at a time, the one named by show (primary or secondary). The app decides which pane shows, for example the detail once a record is chosen. |
| `<Stack>` | `gap = 4, align = "stretch", as = "div", className, children` | A vertical run of children with one of the theme's space steps between them. gap is a step from 0 to 8. |

| Pattern | Props | Use it for |
|---------|-------|------------|
| `<ApiKeys>` | `title = "API keys", keys = [], created, onCreate, onCreatedClose, onRevoke, className` | API keys: a new key is shown in full once, with a copy button; after that only masked, and the full key is not in the page; revoking is confirmed. keys: [{ id, name, last4, created }]; created: { name, secret } while the new key is being shown, then the app clears it on onCreatedClose(); onCreate(); onRevoke(key). |
| `<AppShell>` | `nav = [], current, navLabel = "Main", brand, actions, breadcrumbs, onNavigate, moreLabel = "More", skipLabel = "Skip to content", adapt = "window", frame = "side-nav", children, className` | The frame of an app: its navigation, a top bar for the brand, workspace and account, and the content. Navigation follows the window: from the expanded size class a persistent side navigation in the design system's style; at medium a rail; below it a bottom bar with up to five destinations (four and More when there are more), the rest in a drawer. |
| `<Attachments>` | `label = "Attachments", files = [], onUpload, onRemove, accept, uploadLabel = "Upload a file", className` | A record's files: upload by a button, or by dropping a file as an extra (WCAG 2.5.7); each file with its name (a link to it), type, size and version; removing one is confirmed. files: [{ id, name, href, type, size, version }]; onUpload(file); onRemove(file). |
| `<AuditLog>` | `title = "Audit log", entries = [], people = [], actions = [], filters = [], onFilter, onRemoveFilter, onClearFilters, locale, className` | Who changed what and when, read only: each entry with the person, the change, the time and the value before and after, filtered by person, action and date (applied filters as removable chips). The app filters: onFilter({ person, action, from, to }); filters: the applied ones as [{ id, label }]; onRemoveFilter(filter). |
| `<Board>` | `label, columns = [], cards = [], onMove, moveLabel = "Move to", className` | Records grouped by status in columns, each headed with its count. A card moves by dragging it to a column or by its "Move to" menu, so dragging is never the only way (WCAG 2.5.7). |
| `<BulkActionBar>` | `count = 0, children, onClearSelection, clearLabel = "Clear selection", label = "Bulk actions", selectedText = (n) => `${n} selected`, className` | The actions for the selected rows, shown while any are selected, with how many are selected; the count is announced as it changes. A toolbar: arrow keys move between its controls. |
| `<Calendar>` | `label = "Calendar", events = [], date = new Date(), view, onViewChange, locale, className` | Events in time: month, week and day views from a view switch. The month is a grid of days that the arrow keys move through (WAI-ARIA Grid); every event is named in text with its time. |
| `<ChartFrame>` | `title, description, legend = [], table, status = "ready", onRetry, showTableLabel = "Show data table", hideTableLabel = "Hide data table", emptyTitle = "No data for this period", actions, children, className` | The frame around a chart the app draws: a title, a legend in text, the chart, and a data table with the same values behind a button, for keyboard and screen-reader users and anyone who wants the numbers. status is ready, loading, empty or error, shown in the chart's own space; error offers retry. |
| `<CollectionList>` | `title, breadcrumbs, statusPill, actions, secondaryActions, overflow, columns = [], rows = [], rowKey = "id", rowLabel, caption, status = "ready", onRetry, search, onSearchChange, searchLabel = "Search", filters = [], onRemoveFilter, onClearFilters, filterPanel, filtersLabel = "Filters", selectable = false, selected = [], onSelectedChange, bulkActions, rowActions, rowActionsLabel = (name) => `Actions for ${name}`, selectRowLabel = (name) => `Select ${name}`, selectAllLabel = "Select all on this page", sort, onSortChange, page = 1, pageSize = 20, total, onPageChange, pageSizes, onPageSizeChange, empty, showResultsLabel = "Show results", className` | A screen for finding and acting on records: the page header, search and filters, the records as a table (from the medium size class; only the priority columns until expanded) or as stacked items (compact), selection with bulk actions, row action menus, sorting, pagination, and a state panel for empty, no results, no permission, a failed or partial load, with skeletons while loading. The app supplies the rows of the current page and owns the query (useListQuery keeps it in the URL); the list fetches nothing. |
| `<CommandPalette>` | `recent = [], results = [], onSearch, onSelect, buttonLabel = "Search", placeholder = "Search records and actions", recentLabel = "Recent", emptyLabel = "No results", className` | Search everything and go: Ctrl+K or Cmd+K (or its button) opens a modal dialog with focus in a combobox. Before typing it lists recent items; typing asks the app (onSearch(query)) and lists the results it returns (results: [{ label, items: [{ id, label }] }]) in labelled groups. |
| `<ConfirmDialog>` | `open = false, onConfirm, onCancel, title, objectName, consequence, confirmLabel = "Delete", cancelLabel = "Cancel", requireTyping = false, typeLabel = (name) => `Type ${name} to confirm`, className` | The question before a destructive action: it names the object and what will be lost, starts focus on Cancel, and with requireTyping makes the user type the object's name before the action becomes available. |
| `<ContextMenu>` | `items = [], label = "Actions", children` | Right-click shortcuts for an element: a menu at the pointer on right-click, or beside the element on Shift+F10 or the ContextMenu key; the WAI-ARIA Menu pattern (arrows, Enter, Escape returns focus). Its items must also be in a visible menu (a MenuButton) so nothing depends on right-clicking: pass the same items to both. |
| `<Dashboard>` | `title, breadcrumbs, actions, filters, dateRange, refreshedAt, refreshedLabel = "Last refreshed", locale, tiles = [], charts = [], children, className` | A dashboard: page-wide filters, the date range and when the data was last refreshed, above a grid of number tiles (two across at compact size, four from expanded) and a grid of charts (one, then two across). filters and dateRange are slots; tiles and charts are lists of elements. |
| `<DescriptionList>` | `items = [], className` | A record's fields as label and value pairs, read only: two columns where it has room (from the medium size class), one where it has not. An item with wide spans both columns. |
| `<DrillDown>` | `trail = [], onSelect, label = "Drill-down", children, className` | A drill-down's trail: the summary, then each applied level, the current one marked; choosing an earlier one goes back to it. trail: [{ label }] from the summary to the current level; onSelect(index). |
| `<EditableGrid>` | `label, columns = [], rows = [], rowKey = "id", onChange, errors = {}, newRow = () => ({}), addLabel = "Add row", removeLabel = (n) => `Remove row ${n}`, editLabel = (n) => `Edit row ${n}`, totalLabel = "Total", saveLabel = "Save", className` | Rows edited in place, like a spreadsheet: the WAI-ARIA Grid pattern. The grid is one stop in the Tab order; arrow keys, Home and End move between cells; Enter or F2 edits a cell, Enter commits and Escape discards; rows are added and removed; an error the app reports is tied to its cell; a totals row sums the numeric columns. |
| `<ErrorScreen>` | `kind = "not-found", title, children, actions, className` | A whole screen that says something went wrong and how to go on: not found, no permission, offline, maintenance or an expired session (kind). One level-1 heading states what happened. |
| `<ErrorSummary>` | `errors = {}, idOf = (n) => n, title = "There is a problem", attempt = 0, className` | The problems with a submitted form, at its top: a heading and a link to each invalid field. It takes focus when it appears, so keyboard and screen reader users learn what is wrong at once, and each link moves focus to its field. |
| `<ExportDialog>` | `open = false, onClose, title = "Export", formats = [], fields = [], onExport, progress = null, ready, exportLabel = "Export", className` | Taking records out: a modal dialog to choose the format and the fields, then the export runs; a long one shows its progress outside the dialog, so the user can close it and keep working, and announces when the file is ready with a link to it. formats and fields: [{ value, label }]; onExport({ format, fields }); progress (0-100 while running, else null); ready: { href, label }. |
| `<FilterBar>` | `search, onSearchChange, searchLabel = "Search", filters = [], onRemoveFilter, onClearAll, clearLabel = "Clear all", onOpenFilters, filtersOpen, filtersLabel = "Filters", appliedLabel = "Applied filters", removeLabel = (f) => `Remove filter: ${f.label}`, children, className` | Search and filtering above a list: a search field, the applied filters as removable chips with Clear all, and a Filters button that opens the filter panel and shows how many are applied. Where it has little width (compact) only the search and the Filters button show. |
| `<FilterPanel>` | `open = false, onClose, mode = "inline", title = "Filters", closeLabel = "Close filters", footer, children, className` | The filters themselves, in collapsible sections (FilterSection): a side panel beside the list (mode inline), or a full-screen sheet where there is little width (mode sheet). CollectionList chooses the mode by its width. |
| `<FilterSection>` | `title, count, defaultOpen = true, children, className` | One group of filters that opens and closes, with an optional count of matching records. |
| `<FormPage>` | `title, breadcrumbs, description, form, onCancel, submitLabel = "Save", cancelLabel = "Cancel", discardTitle = "Discard your changes?", discardText = "What you have typed will be lost.", keepLabel = "Keep editing", discardLabel = "Discard", children, className` | A full-page form for creating or editing a record: one column of fields with labels above, no wider than the design system's form width; an error summary that takes focus when a submit finds problems; Save and Cancel in a bar that stays in view (and above the on-screen keyboard) without ever covering the focused field; a warning before leaving with unsaved changes, and a question before Cancel discards them. form comes from useFormState; fields go in children. |
| `<FormSection>` | `title, description, children, className` | A group of related fields with a heading. |
| `<HomeScreen>` | `title = "Home", tiles = [], assigned, recent, children, className` | The first screen after signing in: a summary for this person, from slots: number tiles (StatTile elements), their assigned work and their recent items, each list with its own empty state. assigned and recent: { title, items: [{ id, label, href, meta? |
| `<ImportFlow>` | `title = "Import records", onFile, columns = [], fields = [], onMap, errors = [], failedRowsHref, preview, onCommit, result, accept = ".csv,.xlsx", className` | Bringing records in from a file, in steps: upload (a button, and drop as an extra, WCAG 2.5.7), map each file column to a field, validation errors by row with a file of the failed rows, a preview of the rows to save, then the import and the app's result report. The app reads, checks and saves: onFile(file), onMap(mapping), onCommit(); it supplies columns, fields, errors ([{ row, message }]), failedRowsHref, preview ({ columns, rows }) and result (a node). |
| `<Integrations>` | `title = "Integrations", items = [], onConnect, onDisconnect, className` | Connections to other services: each with its status in text, Connect when it is not connected and Disconnect when it is. items: [{ id, name, description, connected }]; onConnect(item); onDisconnect(item). |
| `<ListDetail>` | `items = [], selected, onSelect, renderItem = (it) => it.label ?? it.id, listLabel = "Records", detail, backLabel = "Back", ratio = "1:2", className` | A list of records with the chosen record's detail: side by side from the expanded size class, where selection follows the arrow keys; below it the list first, and choosing a record (Enter, Space or a click) opens its detail as its own view with Back, which returns to the list on that record. When two panes become one, the pane holding focus is the one kept, so focus is never lost. |
| `<NotificationCentre>` | `notifications = [], onMarkRead, onMarkAllRead, preferences, onPreferenceChange, label = "Notifications", className` | Notifications: a button whose name says how many are unread ("Notifications, 3 unread"), opening a panel where each says Read or Unread in text and links to its record; mark one or all as read; channel preferences per kind of notification. notifications: [{ id, title, href, read }]; onMarkRead(notification); onMarkAllRead(); preferences: { kinds, channels: [{ value, label }], value: { kind: { channel: on } } }; onPreferenceChange(kind, channel, on). |
| `<PageHeader>` | `title, breadcrumbs, status, description, actions, secondaryActions, overflow, overflowLabel = "More actions", className` | The top of a screen: one level-1 heading, optional breadcrumbs and status, the primary action, secondary actions beside it, and any further actions in a More menu (overflow: MenuButton items). Its size follows the design system's page-header variant. |
| `<PeriodComparison>` | `label, current, previous, comparison = "on the previous period", format = (n) => String(n), currentLabel = "This period", previousLabel = "Previous", className` | A figure now against before (or a target): both values, the difference with its sign, and the direction in words ("down 8% on last quarter"), so it never depends on colour (WCAG 1.4.1). format(n) writes a value. |
| `<PermissionsMatrix>` | `title = "Permissions", roles = [], permissions = [], has = () => false, yes = "Yes", no = "No", className` | Which role may do what: a table with a column per role and a row per permission, each cell saying Yes or No in text. has(role, permission). |
| `<PivotTable>` | `label, groups = [], columns = [], value = () => 0, format = (n) => String(n), totalLabel = "Total", className` | Rows by columns with subtotals and a grand total, the row groups opening and closing: the WAI-ARIA Treegrid pattern. Right opens a group (or moves into it), Left closes it (or moves to its group), Up and Down move between visible rows. |
| `<PrimaryNav>` | `items = [], current, label = "Main", onNavigate, className` | An app's main navigation: destinations as links in a labelled navigation landmark, the current one marked (aria-current="page") and shown by the design system's active state. A destination with items is a group that opens and closes by a disclosure button, open while it holds the current page. |
| `<PrintLayout>` | `title, logo, runDate, locale, sections = [], children, className` | A report laid out for paper: a header with the title, the logo and the run date on the first page; each section from a new page; table headers repeat; navigation and actions are left out. While printing, the theme is switched to its light appearance and back afterwards. |
| `<QuickEdit>` | `open = false, onClose, title, form, submitLabel = "Save", cancelLabel = "Cancel", children, className` | A short form for a quick create or edit, without leaving the page: a modal dialog from the medium size class, a full-screen sheet below it. Focus stays inside while it is open and returns to the control that opened it. |
| `<RecordDetail>` | `title, statusPill, actions, secondaryActions, overflow, breadcrumbs, back, fields, tabs, tabsParam = "tab", tabsLabel, activity, activityLabel = "Activity", status = "ready", onRetry, emptyTitle = "Choose a record", emptyText = "Select a record in the list to see it here.", notFoundTitle = "This record no longer exists", children, className` | One record: its page header (title, status and actions), its fields, its tabs and its activity, which sits beside the rest from the expanded size class. status is ready, loading, empty (no record chosen), error, forbidden or not-found; each but ready and loading shows a state panel. |
| `<ReportBuilder>` | `measures = [], groupings = [], preview = () => [], onSave, saveLabel = "Save report", className` | Making a report: choose measures and groupings, see a preview table as you choose (groupings as rows, measures as columns), and save it with a name. measures and groupings: [{ value, label }]; preview(choice) returns the preview's rows; onSave({ name, measures, groupings }). |
| `<ReportViewer>` | `title, breadcrumbs, parameters, onRun, runLabel = "Run report", parametersLabel = "Parameters", applied = [], appliedLabel = "Run with", results, status = "ready", onRetry, onExport, exportLabel = "Export", onPrint, printLabel = "Print", className` | A report: its parameters, a Run action, and the results with a summary of the parameters they were run with above them at every size. Parameters sit in a side panel from the expanded size class, in a panel that opens and closes at medium, and in a sheet at compact. |
| `<ReviewConfirm>` | `title = "Check your answers", sections = [], consequence, submitLabel = "Submit", onSubmit, changeLabel = "Change", result, className` | Answers before they are sent: grouped by section with a Change link to each, and what submitting will do said before the submit button (WCAG 3.3.4). Once the app reports the result, a confirmation panel shows it with its reference. |
| `<SettingsPage>` | `title = "Settings", breadcrumbs, sections = [], current, onChange, navLabel = "Settings sections", backLabel = "All settings", className` | A settings screen: section navigation beside the current section from the expanded size class; below it the list of sections first, and a chosen section on its own with a link back to the list. Sections swap in place, so the current one is marked aria-current="true"; choosing one moves focus to its heading. |
| `<sizeAtLeast>` | `size, min` | Whether a size class is at least another: sizeAtLeast(size, "expanded"). |
| `<sizeClassOf>` | `width` | The size class a width falls in: compact, medium, expanded, large or extra-large. |
| `<StatePanel>` | `kind = "empty", title, children, action, filters = [], onClearFilters, clearLabel = "Clear filters", onRetry, retryLabel = "Try again", activeLabel = "Active filters:", className` | What a list or region shows when it has no content to show: first use (empty), nothing matching (no-results, with the active filters and a way to clear them), no permission (forbidden), a failed load (error, with retry) or a partial load (partial). Each says what happened and offers the next action, and is announced to screen readers. |
| `<StatTile>` | `label, value, change, words = DIRECTION, className` | One figure that matters: its label, its value and, optionally, its change (change: { direction: up, down or flat, amount, comparison }), written out in words ("up 8% on August") so direction never depends on colour or an icon. |
| `<Subscriptions>` | `items = [], onAdd, onPause, onDelete, title = "Subscriptions", className` | A report's scheduled deliveries and alerts: each with its frequency or threshold and its recipients; add one, pause one ("Paused" in text), or delete one after confirmation. items: [{ id, kind: delivery or alert, name, frequency?, threshold?, recipients: [], paused? |
| `<TabsSection>` | `tabs = [], param = "tab", label, defaultValue, onChange, className` | Tabs whose selection is kept in the page's URL (param), so a reload or a shared link opens the same tab. Tabs and their counts as for Tabs: [{ id, label, panel, count? |
| `<TaskList>` | `title, sections = [], statusLabels = STATUS, completedText = (n, t) => `${n} of ${t} sections completed`, onSelect, className` | A long form in independent sections, done in any order: each section a link with its status in text, and how many are completed. sections: [{ id, label, href, status: not-started, in-progress or completed }]. |
| `<Timeline>` | `events = [], label = "Activity", order = "newest", kindLabels = {}, locale, className` | What has happened to a record, in time order (newest first unless order is oldest): who, what and when, each kind of event (comment, change or system) named in text and marked with its own icon, so colour is never the only signal. events: [{ id, kind, actor, action, time, body? |
| `<useDrillPath>` | `param = "drill" } = {` | The path of a drill-down kept in the page's URL (param), one history entry per level, so a link opens the same level and Back returns to the one before. Returns { path, drill(id), goTo(index) }; path is the list of level ids. |
| `<useFormState>` | `initial = {}, validate = () => ({}), onSubmit } = {` | A form's values, errors and submission, as the form patterns expect. validate(values) returns { field: message } for what is wrong. |
| `<useListQuery>` | `key = "list", defaults = {} } = {` | A list's query (page, page size, search, filters, sort) kept in the page's URL under a key, so it survives opening a record and coming back, can be shared, and follows Back and Forward. Returns [query, update]; update merges, and a change to search or filters returns to page 1. |
| `<UsersAndRoles>` | `title = "Members", members = [], roles = [], onInvite, onRoleChange, className` | The members of a workspace with their roles: invite one by email with a role (an address that is not an email is an error at its field), and change a member's role. The list shows what the app says, so a change shows once the app confirms it. |
| `<useSizeClass>` | `ref` | The size class of an element's own width, kept up to date as it resizes. For behaviour that must change with width (a panel inline or in a sheet); layout itself changes in CSS. |
| `<useStickyClearance>` | `ref, active = true` | Keeps a sticky bar's own height clear at the bottom of the area that scrolls it, while active, so focus scrolled into view never lands under the bar (WCAG 2.4.11), even when the bar wraps onto two lines. |
| `<useUnsavedChangesWarning>` | `dirty` | Warns before the page is left with unsaved changes (the browser's own prompt on reload, close or a link out of the app). An app's router should also block its own navigation while dirty is true. |
| `<Wizard>` | `title, steps = [], review, onSaveDraft, onFinish, saveDraftLabel = "Save draft", backLabel = "Back", nextLabel = "Continue", finishLabel = "Submit", reviewTitle = "Check your answers", className` | A task in steps: "Step 2 of 5: Title" with a step list from the medium size class and a progress bar below it; each step is checked before moving on; going back keeps every answer (all steps stay in one form); Save draft gives the app what has been entered; the last step is the review. A step is { id, title, content, validate? |
| `<WorkQueue>` | `items = [], index = 0, onIndexChange, onApprove, onReject, onAssign, people = [], title = "Review queue", emptyTitle = "Nothing to review", emptyText = "New items will appear here.", className` | Work through items one at a time: the item, its position ("3 of 12"), previous and next, approve, reject (a comment is required) and assign. Single-key shortcuts (J, K, A, R) can be turned off and never fire while typing (WCAG 2.1.4); a help dialog lists them. |
| `<WorkspaceSwitcher>` | `workspaces = [], current, onSwitch, label = "Workspace", searchLabel = "Search workspaces", searchAt = 8, emptyLabel = "No workspace matches", className` | The workspace or tenant switcher in an app's top bar. Up to seven workspaces it is a menu; from eight (searchAt) its popup has a search that narrows the list, as a combobox: type to filter, Up and Down to move, Enter to switch, Escape to close and return to the button. |

A list of records is `<CollectionList>`: give it the current page's rows and keep its query in the URL with `useListQuery()`; it brings the header, search, filters, selection and bulk actions, pagination, and the empty, no-results, no-permission, error and loading states. Never hand-build a list screen.

### Choosing a pattern

- `<AppShell>`: The frame of every app: navigation, top bar and content.
- `<AuditLog>`: A read-only history of who changed what, filterable. Choose `<Timeline>` instead when it is the activity of one record.
- `<CollectionList>`: Finding and acting on many records: search, filters, selection, bulk and row actions, pages. Never choose between a table and stacked items yourself: it shows a table from medium and stacked items at compact. Choose `<ListDetail>` instead when users look at one record at a time while keeping the list in view.
- `<Dashboard>`: An overview of figures and charts for a period. Choose `<ReportViewer>` instead when users set parameters, run a report and export or print it.
- `<ErrorScreen>`: A whole screen that cannot show: not found, no permission, offline, maintenance, session expired. Choose `<StatePanel>` instead when only one region of the screen has nothing to show.
- `<FormPage>`: Creating or editing a record with more than about six fields, or with sections. Choose `<QuickEdit>` instead when the form is short (about six fields or fewer) and users should stay on the page.
- `<HomeScreen>`: The first screen after signing in: this person's figures, work and recent items. Choose `<Dashboard>` instead when it is an overview of the business for a period.
- `<ImportFlow>`: Bringing records in from a file: upload, map, validate, preview, import.
- `<ListDetail>`: Working through records one at a time while the list stays in view, such as triage or review. Choose `<CollectionList>` instead when users mostly search, filter and act on many records at once.
- `<QuickEdit>`: A short create or edit (about six fields or fewer) without leaving the page. Choose `<FormPage>` instead when the form is long or has sections.
- `<RecordDetail>`: One record: its header, fields, tabs and activity. Choose `<FormPage>` instead when the record is being created or edited.
- `<ReportViewer>`: Parameters, Run, results with the applied parameters, Export and Print. Choose `<Dashboard>` instead when it is an at-a-glance overview.
- `<SettingsPage>`: An app's or a workspace's settings in sections.
- `<UsersAndRoles>`: A workspace's members: invite by email with a role, change a role. Choose `<CollectionList>` instead when it is a large directory to search and filter.
- `<Wizard>`: A task whose steps depend on each other, checked step by step, ending in a review. Choose `<TaskList>` instead when the sections are independent and can be done in any order; `<FormPage>` instead when it fits on one page.
- `<WorkQueue>`: Working through items one at a time: approvals, triage. Choose `<ListDetail>` instead when users pick items in any order from a list.

Every pattern's slots, states, size-class behaviour and variant points are in `catalogue.json` (`patterns`) and from the MCP tools `list_patterns` and `get_pattern`.

Frame an app with `<AppShell>`: it places the navigation for the screen size (bottom bar and drawer, rail, or side navigation) and keeps the bars from covering focus. Navigation between pages is links (`PrimaryNav`), never a menu; `<MenuButton>` is for actions.

Spacing props (`gap`) are the theme's space steps, 0 to 8. Each design system chooses its own look at some points (`navigation`, `page-header`, `table`, `tabs`); never restyle a pattern per theme.

### Hooks

- `useJourneySignal()`: For the SDK's own panels: report `type` for the current step while `when` holds. Outside a provider with a sink it does nothing.
- `useJourneyStep()`: Mark the screen a component renders as step `step` of `journeyId` (the blueprint's IDs). The screen is the given one, else the page's data-piq-screen.
- `useTheme()`: The nearest provider's theme: { theme, appearance, preference, themes, setTheme, setAppearance }. appearance is always "light" or "dark".
- `useToast()`: show({ message, actionLabel, onAction, duration }) a toast, or dismiss(id) one.

### Role tokens

Style your own markup with these. Each names a role; its value comes from the theme.

- **border**: `--piq-border-default`
- **color**: `--piq-color-accent`, `--piq-color-border`, `--piq-color-diagram-edge`, `--piq-color-diagram-edge-muted`, `--piq-color-diagram-edge-strong`, `--piq-color-diagram-region-1`, `--piq-color-diagram-region-2`, `--piq-color-diagram-region-3`, `--piq-color-ground`, `--piq-color-ground-recessed`, `--piq-color-lifecycle-decided`, `--piq-color-lifecycle-placeholder`, `--piq-color-lifecycle-unknown`, `--piq-color-on-accent`, `--piq-color-series-1`, `--piq-color-series-2`, `--piq-color-series-3`, `--piq-color-series-4`, `--piq-color-series-5`, `--piq-color-series-6`, `--piq-color-series-7`, `--piq-color-series-8`, `--piq-color-status-caution`, `--piq-color-status-caution-subtle`, `--piq-color-status-info`, `--piq-color-status-info-subtle`, `--piq-color-status-negative`, `--piq-color-status-negative-subtle`, `--piq-color-status-positive`, `--piq-color-status-positive-subtle`, `--piq-color-structure`, `--piq-color-surface`, `--piq-color-surface-sunken`, `--piq-color-text`, `--piq-color-text-muted`, `--piq-color-text-strong`, `--piq-color-text-subtle`
- **focus**: `--piq-focus-offset`, `--piq-focus-ring`
- **font-size**: `--piq-font-size-body`, `--piq-font-size-display`, `--piq-font-size-heading`, `--piq-font-size-label`, `--piq-font-size-lead`, `--piq-font-size-small`, `--piq-font-size-title`
- **font-weight**: `--piq-font-weight-regular`, `--piq-font-weight-strong`
- **font**: `--piq-font-body`, `--piq-font-display`, `--piq-font-heading`, `--piq-font-mono`
- **letter-spacing**: `--piq-letter-spacing-eyebrow`, `--piq-letter-spacing-label`
- **line-height**: `--piq-line-height-body`, `--piq-line-height-tight`
- **radius**: `--piq-radius-card`, `--piq-radius-control`, `--piq-radius-diagram-node`
- **shadow**: `--piq-shadow-card`, `--piq-shadow-overlay`
- **size**: `--piq-size-breakpoint-expanded`, `--piq-size-breakpoint-extra-large`, `--piq-size-breakpoint-large`, `--piq-size-breakpoint-medium`, `--piq-size-content-form`, `--piq-size-content-page`, `--piq-size-diagram-stroke`, `--piq-size-diagram-stroke-strong`, `--piq-size-measure`, `--piq-size-target-minimum`, `--piq-size-target-touch`
- **space**: `--piq-space-1`, `--piq-space-2`, `--piq-space-3`, `--piq-space-4`, `--piq-space-5`, `--piq-space-6`, `--piq-space-7`, `--piq-space-8`, `--piq-space-gutter-compact`, `--piq-space-gutter-expanded`, `--piq-space-gutter-extra-large`, `--piq-space-gutter-large`, `--piq-space-gutter-medium`
- **state-layer**: `--piq-state-layer-hover`, `--piq-state-layer-press`
- **state**: `--piq-state-closed`, `--piq-state-evaluation`, `--piq-state-limited`, `--piq-state-live`, `--piq-state-purchasing`

Widget tokens (`badge`, `button`, `card`, `check`, `choice-picker`, `field`, `icon`, `menu`, `nav`, `notice`, `page-header`, `pill`, `progress`, `skeleton`, `spinner`, `switch`, `table`, `tabs`, `toast`) belong to the widgets; style widgets through their props, not their tokens.

### Icons

`<Icon name="…" />` with one of: `add`, `arrow-left`, `arrow-right`, `calendar`, `check`, `check-circle`, `chevron-down`, `chevron-left`, `chevron-right`, `chevron-up`, `close`, `copy`, `delete`, `download`, `edit`, `error`, `external-link`, `filter`, `help`, `home`, `info`, `lock`, `menu`, `more`, `refresh`, `search`, `settings`, `sort-ascending`, `sort-descending`, `upload`, `user`, `view`, `warning`. The glyph follows the theme's design system.

Any other icon: `@ux-builder/ui/icons` has all 2130 Lucide icons by their Lucide name, each with Material, Fluent or Carbon's own glyph where one matches (422, 408 and 347; otherwise Lucide's). Import the ones you use, so the bundle carries only those, and pass one or register them: `import { iconPin, iconPlay } from "@ux-builder/ui/icons"`, then `<Icon icon={iconPin} />`, or `registerIcons(iconPin, iconPlay)` once and `<Icon name="pin" />`. The export is `icon` + the name in PascalCase. Find names in `@ux-builder/ui/catalogue.json` (`iconLibrary.icons`) or with the MCP tool `list_icons` and a query. Never draw an icon the library has; for one it lacks, `registerIcons({ name, glyphs: { lucide: { viewBox, body } } })` so it still draws through `Icon`.

### Loading and progress

Show waiting with the SDK, never a hand-drawn loader or another library's: `<ProgressBar label="Uploading" value={40} />` when the amount is known (leave out `value` while it is not), `<Spinner label="Saving" />` for a short wait (`showLabel` to show the words, `size="sm"` inline), `<Skeleton lines={3} />` (or `variant="rect"` or `"circle"`) in place of content that is loading, inside a region marked `aria-busy="true"`, and `<Button busy>` while a button's action runs. Each follows the theme's design system and the user's reduced-motion setting.

### Logo and favicon

`<Logo />` in the app's header (`variant="mark"` where space is tight, `size="sm"` for the compact height). It draws the theme's brand artwork, or the brand's title as a wordmark when the brand has none, and changes with the theme and appearance. Never import or hard-code a logo file. An embedded view draws no logo.

The page's favicon follows the theme too: the top-level `ThemeProvider` sets it (`favicon={false}` turns that off). An app that sets `data-theme` on `<html>` without a provider renders `<Favicon />` once. Keep the app's own `<link rel="icon">` in index.html: it shows for a theme without a favicon. Never hard-code the brand's favicon.

### Assistant

Build an assistant from `@ux-builder/ui/assistant`, never from a chat library's components (styled by `patterns.css`). `<Conversation>` takes the messages and callbacks; it announces each finished reply once, keeps focus in the composer, offers Stop while a reply streams and Retry when one fails, shows reasoning, tool calls, numbered sources and artifacts, and asks for approval before an action changes anything. Put it beside the page with `<AssistantPanel>`. Connect a runtime with `useAiSdkConversation(chat)`, given what the AI SDK's useChat returns, from `@ux-builder/ui/assistant/ai-sdk` or `useAssistantUiConversation(thread)` from `@ux-builder/ui/assistant/assistant-ui`; neither configures a hosted service.

| Export | Props | Use it for |
|--------|-------|------------|
| `<ApprovalCard>` | `summary, details, decision, current = true, onDecide, approveLabel = "Approve", denyLabel = "Deny", className` | A request for the user's approval before the assistant changes anything: what will happen and to what, with Approve and Deny. Nothing is passed on until the user chooses, neither button is chosen or focused for them, and once decided, or no longer current, it has no buttons and says why. |
| `<AssistantPanel>` | `open = false, onClose, title = "Assistant", panel, closeLabel = "Close assistant", children, className` | The assistant beside the page: from the expanded size class a side panel region next to children, below it a full-screen modal sheet. Focus moves into the panel's composer when it opens. |
| `<Conversation>` | `messages = [], onSend, onStop, onRetry, onRegenerate, suggestions = [], onDecide, decisions, onComponentSubmit, onCardAction, onCardDecide, renderArtifact, disabledReason, actor, label = "Conversation with the assistant", composerLabel = "Ask the assistant", disclosure = DISCLOSURE, strings, className` | A conversation with an assistant: the messages as a log, a composer, Stop while a reply streams, Retry when one fails, suggestions, and each reply's reasoning, tool calls, sources, approvals, artifacts and generated components. Finished replies are announced once each, never token by token. |
| `<GenerativeComponent>` | `component, props, values, onValuesChange, onSubmit, submitted, fallback = "This content could not be shown.", className` | What an agent asked to render, as the SDK component it names, in the app's theme: only a renderable component, and only with props that pass its schema. Anything else is a plain notice; nothing from it is inserted as HTML. |
| `<InlineForm>` | `title, fields = [], submitLabel = "Submit", values, onValuesChange, onSubmit, submitted, className` | A short form the assistant asks the user to fill in, inside the conversation: its values may be pre-filled, stay editable, and are sent only when the user submits. Once submitted it shows what was sent, read only. |
| `<Markdown>` | `text, sources, idPrefix, className` | Markdown from a model, rendered as React elements: never as HTML. sources and idPrefix link each [n] to source n of a Sources list. |
| `<Reasoning>` | `text, seconds, className` | What the assistant reasoned, collapsed behind a disclosure that says for how long; the answer never depends on opening it. |
| `<Sources>` | `sources = [], idPrefix, label = "Sources", className` | The sources a reply relies on, numbered; each title is a link where it has one, leaving the app. Each item can take focus, so a citation [n] in the answer moves to it. |
| `<ToolCall>` | `name, title, status = "running", input, output, error, className` | One tool the assistant used: its name and status (running, done, failed) in text, and on request its input and result. It is a step of the reply's plan. |
| `<ToolCalls>` | `calls = []` | A reply's tool calls as one plan; more than three are grouped under "Used n tools". |
| `useAiSdkConversation()` | `chat, { describeApproval } = {}` | Conversation props from the AI SDK chat that useChat returns: messages, onSend, onStop, onRetry, onRegenerate and onDecide. Spread them onto <Conversation>. |
| `useAssistantUiConversation()` | `thread, { describeApproval } = {}` | Conversation props from an assistant-ui ThreadRuntime: messages, onSend, onStop, onRetry, onRegenerate and onDecide. Spread them onto <Conversation>. |

A tool result renders UI as `{ component, props }`, with props as JSON. Only these components may be rendered, and only with props that pass their schema (`propsSchema` in `catalogue.json`, or the MCP tool `list_renderable`); anything else shows a plain notice: `Card`, `DataTable`, `DescriptionList`, `FormPage`, `InlineForm`, `Notice`, `ProgressBar`, `StatTile`, `StatusPill`, `Wizard`.

### Adaptive Cards

An agent built for Microsoft hosts may answer with an Adaptive Card (open-source schema 1.6) instead of a component. Render it with `<AdaptiveCard card onAction />` from `@ux-builder/ui/adaptive-cards`: each element becomes an SDK widget in the app's theme, a ColumnSet stacks at compact, and an element outside 1.6 shows its fallback or a plain notice; nothing is inserted as HTML. In a `<Conversation>`, a tool result `{ type: "adaptive-card", card }` (or the card itself) is an `"adaptive-card"` part, and `onCardAction` receives its actions. `onAction` gets `{ type, id, verb, data, inputs }` for Action.Submit and Action.Execute. Mark an action that pays, sends, deletes or publishes with `"data": { "ux-builder": { "highImpact": true, "consequence": "Pay £120.00 to Acme Ltd" } }`: the user approves it before `onAction`, and the marker is removed from `data`. Check every card before the agent sends it with `checkCard(card)` (also `@ux-builder/ui/adaptive-cards/check` for Node, or the MCP tool `check_card`), and fix what it reports: `card.actions-few`, `card.wrap`, `card.input-label`, `card.input-error`, `card.heading`, `card.columns-few`, `card.image-alt`, `card.action-titles`, `card.no-hidden-inputs`, `card.version`, `card.high-impact-marked`.

### Modalities

An app declares the kind of experience it gives in its blueprint (`app.blueprint.json`): `"supports": { "modalities": ["responsive-web"] }`, one or more of `responsive-web`, `chat`, `hybrid-chat` (a blueprint without it is read as `responsive-web`; `ios`, `android`, `macos`, `windows` are future and refused). The starter asks for them (`npm create @ux-builder/app <dir> -- --modality responsive-web,hybrid-chat`; an agent passes `--modality`). Each modality expands to size classes, inputs and AI roles, so `rulesFor({ modalities })` or `get_rules` with `modalities` returns its rules, and `get_guidance` with `modalities` names its components. Build with the components for the app's modalities:

| Modality | Shell | Build with | Rule families | Size classes; inputs; AI roles |
|----------|-------|------------|---------------|-------------------------------|
| `responsive-web` | AppShell with an empty Home screen | `@ux-builder/ui`, `@ux-builder/ui/patterns` | `nav.*`, `layout.*`, `modal.*`, `action.*`, `feedback.*`, `loading.*`, `screen.*`, `emphasis.*`, `input.*`, `text.*`, `view.*`, `pattern.*`, `flow.*`, `journey.*`, `theme.*` | compact, medium, expanded, large; coarse, fine; none |
| `chat` | a full-screen Conversation | `@ux-builder/ui/assistant` | `ai.*`, `feedback.*`, `input.*`, `text.*`, `theme.*` | compact, medium, expanded; coarse, fine; assistant |
| `hybrid-chat` | a Conversation that renders Adaptive Card parts | `@ux-builder/ui/assistant`, `@ux-builder/ui/adaptive-cards` | `ai.*`, `feedback.*`, `input.*`, `text.*`, `genui.*`, `card.*`, `theme.*` | compact, medium, expanded; coarse, fine; assistant |

With several modalities, the app is an `<AppShell>` whose destinations are Home and Assistant, each built for its modality, and the rules are the union of theirs.

### Interaction and screen rules

How screens fit together and behave: navigation by size, modals, safeguards, states and emphasis (FEAT-008). Each rule has an ID that the blueprint check and the audit report use. The loop: **plan** the app in its blueprint, `docs/ux-builder/blueprint/app.blueprint.json` (`npx ux-builder-blueprint init`) from the recipes, **check** it (`npx ux-builder-blueprint check`, or the MCP tool `check_blueprint`) until it has no errors, **build** from the patterns it names, then **lint** and **audit**. Rules apply by size class, input (`coarse` touch, `fine` pointer) and context (`app`, or an embedded `view`), never by device. Get the rules for a target with `rulesFor()` from `@ux-builder/ui/blueprint` or the MCP tool `get_rules`; the full rules, recipes and blueprint schema are in `catalogue.json` (`interaction`). To document every state, not only the happy path: `npx ux-builder-blueprint draw` writes each screen's interaction states (a Mermaid `stateDiagram-v2` and a table of what the user sees, the action available and the announcement), `wireframes` draws each declared state at each size class, and `propose` drafts HELIX's interaction-state-diagram, wireframe, screen-flow and user-journey-map documents (as patches where the installed HELIX defines those types, as drafts in its output where not).

| Rule | Applies | Checked by | Statement |
|------|---------|------------|-----------|
| `blueprint.valid` | always | blueprint `blueprint.valid` | A blueprint has the fields CONTRACT-005 requires, no unknown fields, unique screen IDs, and destinations that name existing screens. |
| `pattern.exists` | always | blueprint `pattern.exists` | Every screen names a pattern the installed SDK ships. |
| `nav.compact-destinations` | context: app; sizeClass: compact | blueprint `nav.compact-destinations`, audit `nav-per-breakpoint` | In an app that supports the compact size class, keep the top-level destinations to five; group the rest or move them to a drawer. |
| `nav.standing-at-expanded` | context: app; sizeClass: expanded, large, extra-large | audit `nav-per-breakpoint` | From the expanded size class, show primary navigation as a standing rail or side navigation, not behind a menu button. |
| `nav.links-not-menus` | context: app | review | Move between top-level destinations with navigation links; keep menu buttons for actions on the current page or item. |
| `layout.panes-by-size` | always | review | Use one pane in compact and medium windows, two from expanded (a list beside its detail), and three only in extra-large ones. |
| `layout.dense-medium-single-pane` | sizeClass: medium | review | At the medium size class, use two panes only for sparse content with clear actions, such as settings; keep dense lists and tables in one. |
| `modal.only-when-needed` | always | review | Present a task modally only when it needs focus or a decision before the person continues; otherwise keep it in the page. |
| `modal.one-at-a-time` | always | blueprint `modal.one-at-a-time`, audit `one-modal` | Never open a modal on top of another, and never show more than one alert at once; close one before presenting the next. |
| `modal.titled` | always | blueprint `modal.titled`, audit `modal-contract` | Give every modal a title that says what the task is, as its accessible name. |
| `modal.dismiss` | always | blueprint `modal.dismiss`, audit `modal-contract` | Give every modal an obvious way out (Cancel, Close or Done), and let Escape close it. |
| `modal.unsaved-changes` | always | blueprint `modal.unsaved-changes` | When closing a modal would lose what the person entered, explain that and let them save, discard or keep editing. |
| `modal.short-task` | always | review | Keep a modal task brief; if it needs several steps, give them a single path and no buttons that could be mistaken for dismissing it. |
| `action.destructive-safeguard` | always | blueprint `action.destructive-safeguard` | Give every destructive action a safeguard: Undo when the loss is expected and reversible, a confirmation only when it is unexpected or irreversible; never neither, and not both. |
| `feedback.status-in-place` | always | review | Show the status of something next to it, passively; interrupt with an alert only for critical, actionable information. |
| `feedback.explain-failure` | always | review | When an action cannot be carried out, say why and what to do, in text next to it. |
| `loading.show-something` | always | review | Show placeholder content, such as a skeleton, as soon as a region starts loading; never leave it blank. |
| `loading.progress-kind` | always | review | Use a determinate progress indicator when the duration is known and an indeterminate one when it is not. |
| `screen.states` | always | blueprint `screen.states` | A screen that shows a collection, a record or figures declares its empty, loading and error states. |
| `emphasis.one-primary` | always | audit `one-primary-action` | Give each page region or dialog at most one primary (filled) button; make the others secondary or text buttons. |
| `input.touch-targets` | input: coarse | audit `target-size` | Under touch input, make every control at least the theme's touch-target size (44 points on Apple platforms, 48 dp in Material). |
| `input.no-hover-only` | input: coarse | review | Under touch input, never put content or actions where only hovering reveals them. |
| `input.focus-visible` | input: fine | review | Show a visible focus indicator on every focusable control, distinct from hover and selection. |
| `text.line-length` | always | audit `line-length` | Keep running text to at most 80 characters per line, 40 to 60 where possible, by limiting the measure rather than shrinking the type. |
| `view.no-shell` | context: view | blueprint `view.no-shell` | An embedded view draws no app shell, primary navigation or brand; the host provides its chrome, title and pins. |
| `view.size-classes` | context: view | blueprint `view.size-classes` | An embedded view supports the compact and medium size classes, since a host's panel is often that narrow even on a desktop. |
| `view.one-task` | context: view | blueprint `view.one-task` | Keep an embedded view to one screen and one task; put further steps in modal tasks or sections of that screen. |
| `view.states` | context: view | blueprint `view.states` | Every screen of an embedded view, whatever its pattern, declares its empty, loading and error states. |
| `view.theme-from-host` | context: view | review | Take the theme only from the host's styles and appearance, and follow the host when it changes them. |
| `ai.disclose` | aiRole: generative, assistant, agent | audit `ai-disclose`, review | Content made by AI is labelled as AI-made where it appears, or sits in a region whose label says so. |
| `ai.not-a-person` | aiRole: generative, assistant, agent | lint `ux-builder/ai-neutral-voice`, review | The UI never presents the AI as a person: no first-person thinking or feeling, and no human name or face that implies a human author. |
| `ai.capabilities` | aiRole: generative, assistant, agent | review | At first use, the screen says what the AI can and cannot do, and that its results may need checking. |
| `ai.starters` | aiRole: assistant, agent | audit `ai-starters`, review | An open-ended prompt offers suggested starting points, and they are never the only way to start. |
| `ai.fallback` | aiRole: generative | blueprint `ai.fallback` | Where AI adds to a task rather than being the task, the task can still be done without it. |
| `ai.stop` | aiRole: generative, assistant, agent | audit `ai-stop` | While AI is generating or working, a Stop control is reachable and named; stopping keeps what has arrived and says that it stopped. |
| `ai.correct` | aiRole: generative, assistant, agent | audit `ai-correct` | AI output can be edited, retried, regenerated or reverted, and the screen says when a correction has taken effect. |
| `ai.dismiss` | aiRole: generative | review | An AI suggestion the user did not ask for can be dismissed in one action, and stays dismissed. |
| `agent.on-off` | aiRole: agent | review | The user can turn the agent off, and its state (off, idle, working, waiting for you) is shown. |
| `agent.declare-high-impact` | aiRole: agent | blueprint `agent.declare-high-impact` | A screen whose agent acts lists the actions it can take that are irreversible, costly or seen by other people. |
| `agent.approve-high-impact` | aiRole: agent | blueprint `agent.approve-high-impact`, audit `agent-approval` | Each high-impact action waits for the user's approval, shows what will happen and to what, offers Deny, and is never approved on the user's behalf. |
| `agent.plan-visible` | aiRole: agent | audit `agent-plan` | When an agent works in steps, its plan and next step are shown, each step with its status, and a change of plan is shown too. |
| `agent.interrupt` | aiRole: agent | audit `agent-interrupt` | A working agent can be paused or stopped at any step, and the user can then give a new instruction. |
| `agent.who-acts` | aiRole: agent | audit `agent-who-acts` | When the user can take over and hand back, the screen states who is acting now, and the agent's actions are distinguishable from the user's. |
| `agent.recover` | aiRole: agent | audit `agent-recover` | A failed step is described at that step and in text, and the user can retry it or return to an earlier step without starting over. |
| `agent.summary` | aiRole: agent | audit `agent-summary` | A finished run ends with a summary of what was done, with the detail available on request. |
| `agent.status-unwatched` | aiRole: agent | review | Progress, duration and step status reach a user who is not watching (a persistent status region or a notification), above all for risky steps. |
| `ai.sources` | aiRole: assistant, agent | review | Output that relies on documents, data or the web shows which, linked where possible. |
| `ai.uncertainty` | aiRole: generative, assistant, agent | review | The UI says when the AI is unsure or has assumed something the user did not say, instead of presenting a guess as fact. |
| `ai.ask-when-unclear` | aiRole: agent | review | In a high-stakes step an ambiguous request is clarified with the user; in a low-stakes one a stated default may be used. |
| `ai.improve-request` | aiRole: generative, assistant, agent | review | A blocked or unhelpful result says why, where it can, and how to ask differently. |
| `ai.consent` | aiRole: generative, assistant, agent | blueprint `ai.consent`, review | Before personal data or usage leaves the device for an AI feature, the user is told what is sent and why, gives permission, and can opt out later. |
| `ai.feedback` | aiRole: generative, assistant, agent | review | Users can give feedback on a specific output; giving it is optional and never blocks the task. |
| `ai.memory-visible` | aiRole: assistant, agent | review | What the AI remembers or has learned about the user can be seen and changed. |
| `ai.notify-changes` | aiRole: generative, assistant, agent | review | When the AI's behaviour or model changes in a way users would notice, they are told. |
| `ai.inclusive` | aiRole: generative, assistant, agent | review | The AI does not infer personal or cultural attributes it can ask for, and is tested with diverse people for stereotyped output. |
| `genui.renderable` | aiRole: assistant | blueprint `genui.renderable` | An assistant renders inline only components the catalogue marks renderable. |
| `genui.inline-compact` | sizeClass: compact | blueprint `genui.inline-compact`, review | At the compact size class, a form or a task in steps rendered inside a conversation shows one short step at a time with its progress, and leaves the composer and the Stop control reachable; a longer task opens on a screen of its own, linked from the reply. |
| `genui.review-prefill` | aiRole: assistant, agent | audit `genui-review-prefill` | Values the AI pre-fills in an inline form or wizard are editable, and are submitted only by the user's own action. |
| `genui.keep-input` | aiRole: assistant | review | Regenerating an answer never silently discards what the user typed into its inline UI. |
| `genui.history` | aiRole: assistant | review | A submitted inline component stays readable in the conversation, shows what was submitted, and can no longer be changed. |
| `ai.declared` | always | audit `ai-declared` | A screen that shows AI content declares its AI role in the blueprint. |
| `ai.user-initiates` | aiRole: generative, assistant, agent | lint `ux-builder/ai-neutral-voice` | Labels keep the user as the one who starts an action ("Summarize", "Summarize with Assistant"), not the AI ("Assistant, summarize"). |
| `card.actions-few` | aiRole: assistant, agent; modality: hybrid-chat | card `card.actions-few`, review | A card offers few primary actions, usually one to three and never more than six. |
| `card.wrap` | aiRole: assistant, agent; modality: hybrid-chat | card `card.wrap` | Text blocks and choice labels in a card wrap, so text is never cut off on a narrow screen. |
| `card.input-label` | aiRole: assistant, agent; modality: hybrid-chat | audit `card-input-label`, card `card.input-label` | Every input in a card has a label of its own; a placeholder is never the only label. |
| `card.input-error` | aiRole: assistant, agent; modality: hybrid-chat | card `card.input-error` | An input in a card that validates (required, pattern, range) says what is wrong in an error message. |
| `card.heading` | aiRole: assistant, agent; modality: hybrid-chat | card `card.heading` | A card with more than its title marks the title as a heading. |
| `card.columns-few` | aiRole: assistant, agent; modality: hybrid-chat | card `card.columns-few` | A column layout in a card uses few columns (at most three) and no fixed widths wider than a compact screen allows. |
| `card.narrow-first` | aiRole: assistant, agent; modality: hybrid-chat | audit `card-narrow-first`, review | A card is laid out for the narrowest width it will show at and still works wider; it never scrolls sideways. |
| `card.reading-order` | aiRole: assistant, agent; modality: hybrid-chat | review | The order a card is read and tabbed in matches the order it is seen in. |
| `card.image-alt` | aiRole: assistant, agent; modality: hybrid-chat | card `card.image-alt` | Every informative image in a card has alternative text. |
| `card.image-transparent` | aiRole: assistant, agent; modality: hybrid-chat | review | Images in a card use transparent backgrounds so they suit light and dark themes, and text never sits on a colour that hurts reading. |
| `card.action-titles` | aiRole: assistant, agent; modality: hybrid-chat | card `card.action-titles` | Action titles in a card say what they do; never "Click here", or "Submit" alone where the outcome is unclear. |
| `card.no-hidden-inputs` | aiRole: assistant, agent; modality: hybrid-chat | card `card.no-hidden-inputs` | Inputs in a card, above all validated ones, are not hidden behind a toggle; if one must be, the toggle says what it shows. |
| `card.version` | aiRole: assistant, agent; modality: hybrid-chat | card `card.version` | A card declares a schema version the host supports (1.6 or lower) and gives a fallback for anything outside it. |
| `card.sparingly` | aiRole: assistant, agent; modality: hybrid-chat | review | An agent sends a card only when it helps; cards that scroll out of view lose their use. |
| `card.high-impact-marked` | aiRole: assistant, agent; modality: hybrid-chat | card `card.high-impact-marked` | A card action that pays, sends, deletes or publishes is marked high-impact, so the host asks for approval. |
| `flow.reachable` | always | blueprint `flow.reachable` | Every screen is reached from a destination (or, in a view, its first screen) through actions, at every size class the app supports; leaving by external counts as a way on. |
| `flow.no-dead-end` | always | blueprint `flow.no-dead-end` | A screen or modal that declares actions offers a way on or back: another screen, back, external, or a modal's dismiss. |
| `flow.target-exists` | always | blueprint `flow.target-exists` | Every action's target names a screen, a modal of its screen, back, a state or external. |
| `flow.primary-consistent` | always | blueprint `flow.primary-consistent` | A screen marks at most one action primary, and when it also gives primaryAction, that is the same action. |
| `journey.walkable` | always | blueprint `journey.walkable` | Each step of a journey names an action its screen has, and the next step is where that action leads; the first step is on the entry, and an alternate starts where it branches. |
| `journey.safeguarded` | always | blueprint `journey.safeguarded` | A journey step that takes a destructive action has its safeguard (undo or confirm), and one that takes a high-impact action has its approval. |
| `journey.covers-errors` | always | blueprint `journey.covers-errors` | A journey through a screen that declares an error state has an alternate that covers that state. |
| `journey.story-covered` | always | blueprint `journey.story-covered` | With a HELIX marker, every story a screen serves has a journey, and each journey's story and criteria exist in HELIX; the stories are read, never written. |
| `journey.task-exists` | always | blueprint `journey.task-exists` | A journey that names the task it realizes names one of the blueprint's tasks. |
| `simplicity.delta-decided` | always | blueprint `simplicity.delta-decided` | When a change adds a screen, a step, a required input or a decision to a journey, a recorded decision names the addition and answers why it is needed and what simpler option was considered. |
| `task.realized` | always | blueprint `task.realized` | Each task in the task model is realized by at least one journey, so the flow shows how the user accomplishes it. |
| `screen.purpose` | always | blueprint `screen.purpose` | Once a blueprint models tasks or screen content, each screen states its purpose in a sentence, so its content can be ordered by what serves that purpose. |
| `consistency.same-kind` | always | blueprint `consistency.same-kind` | Where tasks need the same kind of interaction, such as choosing a location, they reach it through screens with the same pattern, so people learn it once. |
| `theme.applied` | always | audit `theme-applied` | The page loads the declared theme's CSS and the theme's tokens resolve on the themed element. |
| `theme.token-colors` | always | audit `token-colors` | Every colour the app draws is one of the theme's colour tokens, or a mix of two of them. |
| `theme.token-fonts` | always | audit `token-fonts` | Text is set in the font families the theme names, through its type tokens. |
| `theme.token-radii` | always | audit `token-radii` | Rounded corners use the theme's radius tokens. |
| `theme.token-overrides` | always | audit `token-overrides` | The app never sets --piq-* tokens itself; only the theme defines them. |
| `theme.widget-overrides` | always | audit `widget-overrides` | The app does not restyle the SDK's widgets with its own CSS; it chooses variants and tokens instead. |
| `theme.sdk-widgets` | always | audit `sdk-widgets` | Icons, the logo, loading indicators and controls are the SDK's components, not drawn by the app. |
| `theme.foreign-components` | always | audit `foreign-components` | The page renders no component from another UI library. |
| `theme.outside-theme` | always | audit `outside-theme` | Every visible element sits inside the element the theme is applied to. |
| `theme.brand` | always | audit `brand` | The page's favicon and logo are the theme's brand assets. |
| `theme.fonts` | always | audit `fonts` | The theme's fonts are loaded, from the SDK's font files. |
| `theme.contrast` | always | audit `contrast` | Text meets a contrast ratio of at least 4.5:1 (3:1 for large text) and controls' boundaries at least 3:1, in every appearance. |
| `theme.reflow` | always | audit `reflow` | The page does not scroll sideways at the audited width, down to 320 CSS pixels. |
| `theme.target-size` | always | audit `target-size` | Pointer targets are at least the theme's minimum target size, and never smaller than 24 by 24 CSS pixels. |
| `theme.focus-obscured` | always | audit `focus-obscured` | A control that receives keyboard focus is never entirely hidden behind sticky or fixed content. |

Recipes (tested combinations of patterns for a job):

- `review-queue` (any): People work through items waiting for a decision and approve, reject or reassign them. `<WorkQueue>`, `<RecordDetail>`, `<ConfirmDialog>`.
- `manage-records` (app): People search a collection, open a record and change it. `<CollectionList>`, `<ListDetail>`, `<FormPage>`, `<QuickEdit>`.
- `settings` (any): People adjust preferences or configuration in sections. `<SettingsPage>`.
- `dashboard` (app): People check key figures and drill into a report. `<Dashboard>`, `<ReportViewer>`, `<DrillDown>`.
- `import-data` (any): People upload a file, map its columns, check the result and commit it. `<ImportFlow>`, `<ReviewConfirm>`.
- `guided-setup` (any): People complete a task in ordered steps and confirm it at the end. `<Wizard>`, `<ReviewConfirm>`.
- `users-and-access` (app): Administrators invite people, assign roles and set permissions. `<UsersAndRoles>`, `<PermissionsMatrix>`.
- `embedded-tool` (view): A tool's result is shown inside a host (an MCP App view, such as a Praxis plug-in) for one task. `<RecordDetail>`.

### AI and agent screens

Declare each screen's AI role in the blueprint: a screen where AI generates content, converses or acts has `ai` in its blueprint, for example `"ai": { "roles": ["agent"], "acts": true, "highImpactActions": [{ "label": "Pay", "approval": "each" }] }`. The roles are `generative`, `assistant`, `agent`: `generative` for AI output inside an ordinary screen, `assistant` for a conversation, `agent` where the AI acts for the user. The AI rules apply by declared role and combine with the others, so an embedded agent view gets the view rules and the agent rules. Get them with `rulesFor({ aiRoles })` or `get_rules` with `aiRoles`; a target with no role gets no AI rule. The AI rules by role:

- **generative**: `ai.disclose`, `ai.not-a-person`, `ai.capabilities`, `ai.fallback`, `ai.stop`, `ai.correct`, `ai.dismiss`, `ai.uncertainty`, `ai.improve-request`, `ai.consent`, `ai.feedback`, `ai.notify-changes`, `ai.inclusive`, `ai.user-initiates`
- **assistant**: `ai.disclose`, `ai.not-a-person`, `ai.capabilities`, `ai.starters`, `ai.stop`, `ai.correct`, `ai.sources`, `ai.uncertainty`, `ai.improve-request`, `ai.consent`, `ai.feedback`, `ai.memory-visible`, `ai.notify-changes`, `ai.inclusive`, `genui.renderable`, `genui.review-prefill`, `genui.keep-input`, `genui.history`, `ai.user-initiates`, `card.actions-few`, `card.wrap`, `card.input-label`, `card.input-error`, `card.heading`, `card.columns-few`, `card.narrow-first`, `card.reading-order`, `card.image-alt`, `card.image-transparent`, `card.action-titles`, `card.no-hidden-inputs`, `card.version`, `card.sparingly`, `card.high-impact-marked`
- **agent**: `ai.disclose`, `ai.not-a-person`, `ai.capabilities`, `ai.starters`, `ai.stop`, `ai.correct`, `agent.on-off`, `agent.declare-high-impact`, `agent.approve-high-impact`, `agent.plan-visible`, `agent.interrupt`, `agent.who-acts`, `agent.recover`, `agent.summary`, `agent.status-unwatched`, `ai.sources`, `ai.uncertainty`, `ai.ask-when-unclear`, `ai.improve-request`, `ai.consent`, `ai.feedback`, `ai.memory-visible`, `ai.notify-changes`, `ai.inclusive`, `genui.review-prefill`, `ai.user-initiates`, `card.actions-few`, `card.wrap`, `card.input-label`, `card.input-error`, `card.heading`, `card.columns-few`, `card.narrow-first`, `card.reading-order`, `card.image-alt`, `card.image-transparent`, `card.action-titles`, `card.no-hidden-inputs`, `card.version`, `card.sparingly`, `card.high-impact-marked`
- **any screen**: `genui.inline-compact`, `ai.declared`

Mark AI in the markup so the audit can check it (the SDK's assistant components do this for you):

- `data-piq-ai="generated"`: content made by AI, with a visible disclosure and a correction control (data-piq-ai-control="retry", "regenerate", "edit" or "undo"); inline UI it makes has a label on each input, pre-filled values the user can edit, and a submit control of its own.
- `data-piq-ai="status"`: the live region saying what the AI is doing (aria-live; aria-busy="true" while working), with a Stop or Pause control in or beside it.
- `data-piq-ai="plan"`: an agent's steps, each data-piq-ai="step" with data-piq-ai-status (pending, running, done, failed or skipped) and that status in text.
- `data-piq-ai="approval"`: a request for approval, with data-piq-ai-control="approve" and "deny", neither pre-chosen.
- `data-piq-ai-actor="agent" | "user"`: the live region saying who is acting now, updated on takeover and hand-back.
- `data-piq-ai-label`: an ancestor whose visible text discloses AI for everything inside it.
- `data-piq-ai="prompt"`: the field or form where the user asks the AI; an empty conversation offers suggested starting points (data-piq-ai-control="starter").
- `data-piq-ai-status="done"`: on the status region when a run has finished, with its summary shown (data-piq-ai="summary").
- `data-piq-ai-takeover`: on the agent region when the user can take over; then data-piq-ai-actor says who is acting.
- `data-piq-ai-control="previous"`: returns to the previous step, beside "retry", on a failed step.
- `data-piq-screen="<screen id>"`: on the page's root: the blueprint screen it shows, for ux-builder-audit --blueprint.

The rules restate guidance from Apple's Human Interface Guidelines, Material Design 3, WCAG 2.2 and the WAI-ARIA Authoring Practices in this SDK's own words, with a link to each source. They are not those guidelines. ux-builder is not affiliated with or endorsed by Apple or Google; Human Interface Guidelines is a trademark of Apple Inc., and Material Design is a trademark of Google LLC. The AI rules also restate, in the SDK's own words, Microsoft's HAX Toolkit, its design and Learn guidance and the Adaptive Cards documentation, Google PAIR's People + AI Guidebook, and Cheng, Liang, Schoop and Nichols (IUI '26); ux-builder is not affiliated with or endorsed by Microsoft either.

### Themes

| Theme | Design system | Appearances |
|-------|---------------|-------------|
| `databricks` | databricks | dark, light (default light) |
| `img-8593-databricks` | databricks | dark, light (default light) |
| `plain` | own anatomy | light (default light) |
| `praxis` | own anatomy | dark, light (default dark) |
| `praxis-carbon` | carbon | dark, light (default dark) |
| `praxis-fluentui` | fluent | dark, light (default dark) |
| `praxis-material` | material | dark, light (default dark) |
| `praxis-v2-databricks` | databricks | dark, light (default light) |
| `synaptiq` | own anatomy | dark, light (default light) |
| `ux-builder-databricks` | databricks | dark, light (default light) |
<!-- catalogue:end -->
