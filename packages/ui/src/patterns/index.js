/* @ux-builder/ui/patterns: layout primitives, navigation, regions and screen
   patterns composed from the widgets (ADR-020). Each renders .piq-* markup
   that patterns.css styles from the theme's tokens; load
   @ux-builder/ui/patterns.css once, after @ux-builder/ui/ui.css. */

export { Cluster, Grid, Page, SplitView, Stack } from "./Layout.jsx";
export { AppShell, PrimaryNav, WorkspaceSwitcher } from "./Navigation.jsx";
export { ErrorScreen } from "./ErrorScreen.jsx";
export { BulkActionBar, FilterBar, FilterPanel, FilterSection, PageHeader, StatePanel, sizeAtLeast, sizeClassOf, useSizeClass, useStickyClearance } from "./Regions.jsx";
export { ConfirmDialog, ErrorSummary, FormPage, FormSection, QuickEdit, useFormState, useUnsavedChangesWarning } from "./Forms.jsx";
export { CollectionList, useListQuery } from "./CollectionList.jsx";
export { DescriptionList, ListDetail, RecordDetail, TabsSection, Timeline } from "./Record.jsx";
export { ChartFrame, Dashboard, ReportViewer, StatTile } from "./Reporting.jsx";
export { SettingsPage } from "./Settings.jsx";
export { ReviewConfirm, TaskList, Wizard } from "./Workflow.jsx";
export { EditableGrid } from "./EditableGrid.jsx";
export { WorkQueue } from "./WorkQueue.jsx";
export { ExportDialog, ImportFlow } from "./ImportExport.jsx";
export { Attachments, Board, Calendar } from "./Planning.jsx";
export { DrillDown, PeriodComparison, PivotTable, PrintLayout, ReportBuilder, Subscriptions, useDrillPath } from "./Analysis.jsx";
export { AuditLog, PermissionsMatrix, UsersAndRoles } from "./Admin.jsx";
export { ApiKeys, Integrations, NotificationCentre } from "./Notifications.jsx";
export { CommandPalette, ContextMenu, HomeScreen } from "./Home.jsx";
