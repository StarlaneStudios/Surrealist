import queryIcon from "~/assets/animation/query.json";
import explorerIcon from "~/assets/animation/explorer.json";
import designerIcon from "~/assets/animation/designer.json";
import authIcon from "~/assets/animation/auth.json";

import {
	AuthMode,
	CodeLang,
	DataSet,
	ValueMode,
	Protocol,
	ResultMode,
	Selectable,
	ViewInfo,
	ViewMode,
	Orientation,
	EditorKeymap,
} from "./types";

import {
	iconAPI,
	iconAuth,
	iconCombined,
	iconDataTable,
	iconDesigner,
	iconExplorer,
	iconFunction,
	iconLive,
	iconModel,
	iconQuery,
} from "./util/icons";

export type StructureTab = "graph" | "builder";
export type ExportType = (typeof EXPORT_TYPES)[number];

export interface ListingItem {
	label: string;
	value: ResultMode;
	icon: string;
}

export const SANDBOX = "sandbox";
export const MAX_HISTORY_SIZE = 50;
export const MAX_LIVE_MESSAGES = 50;
export const SENSITIVE_SCOPE_FIELDS = new Set(["password", "pass", "secret"]);
export const ML_SUPPORTED = new Set<Protocol>(["ws", "wss", "http", "https"]);

export const DATASETS: Record<string, DataSet> = {
	"surreal-deal": {
		name: "Surreal Deal",
		url: "https://datasets.surrealdb.com/surreal-deal-mini-v2.surql",
	},
};

export const THEMES = [
	{ label: "Automatic", value: "auto" },
	{ label: "Light", value: "light" },
	{ label: "Dark", value: "dark" },
];

export const RESULT_MODES: ListingItem[] = [
	{ label: "Combined", value: "combined", icon: iconCombined },
	{ label: "Individual", value: "single", icon: iconQuery },
	{ label: "Table", value: "table", icon: iconDataTable },
	{ label: "Live", value: "live", icon: iconLive },
];

export const CONNECTION_PROTOCOLS: Selectable<Protocol>[] = [
	{ label: "HTTP", value: "http" },
	{ label: "HTTPS", value: "https" },
	{ label: "WS", value: "ws" },
	{ label: "WSS", value: "wss" },
	{ label: "Memory", value: "mem" },
	{ label: "IndexedDB", value: "indxdb" },
];

export const AUTH_MODES: Selectable<AuthMode>[] = [
	{ label: "Root", value: "root" },
	{ label: "Namespace", value: "namespace" },
	{ label: "Database", value: "database" },
	{ label: "Scope", value: "scope" },
	{ label: "Token", value: "token" },
	{ label: "Anonymous", value: "none" },
];

export const CODE_LANGUAGES: Selectable<CodeLang>[] = [
	{ label: "CLI", value: "cli" },
	{ label: "Rust", value: "rust" },
	{ label: "JavaScript", value: "js" },
	// { label: "Go", value: "go" },
	{ label: "Python", value: "py" },
	{ label: ".NET", value: "csharp" },
	// { label: "Java", value: "java" },
	// { label: "PHP", value: "php" }
];

export const VALUE_MODES: Selectable<ValueMode>[] = [
	{ label: "JSON", value: "json" },
	{ label: "SurrealQL", value: "sql" },
];

export const VIEW_MODES: Record<ViewMode, ViewInfo> = {
	query: {
		id: "query",
		name: "Query",
		icon: iconQuery,
		anim: queryIcon,
		desc: "Execute queries against the database and inspect the results",
	},
	explorer: {
		id: "explorer",
		name: "Explorer",
		icon: iconExplorer,
		anim: explorerIcon,
		desc: "Explore the database tables, records, and relations",
	},
	designer: {
		id: "designer",
		name: "Designer",
		icon: iconDesigner,
		anim: designerIcon,
		desc: "Define database tables and relations",
	},
	authentication: {
		id: "authentication",
		name: "Authentication",
		icon: iconAuth,
		anim: authIcon,
		desc: "Manage account details and database scopes",
	},
	functions: {
		id: "functions",
		name: "Functions",
		icon: iconFunction,
		desc: "Create and update schema level functions",
	},
	models: {
		id: "models",
		name: "Models",
		icon: iconModel,
		desc: "Upload and manage machine learning models",
		disabled: (flags) => !flags.models_view,
	},
	documentation: {
		id: "documentation",
		name: "API Docs",
		icon: iconAPI,
		desc: "View the database schema and documentation",
		disabled: (flags) => !flags.apidocs_view,
	},
};

export const EXPORT_TYPES = [
	"records",
	"tables",
	"analyzers",
	"functions",
	"params",
	"scopes",
] as const;

export const SURREAL_KINDS = [
	{ label: "No kind specified", value: "" },
	{ label: "Any", value: "any" },
	{ label: "Array", value: "array" },
	{ label: "Bool", value: "bool" },
	{ label: "Datetime", value: "datetime" },
	{ label: "Decimal", value: "decimal" },
	{ label: "Duration", value: "duration" },
	{ label: "Float", value: "float" },
	{ label: "Int", value: "int" },
	{ label: "Number", value: "number" },
	{ label: "Object", value: "object" },
	{ label: "String", value: "string" },
	{ label: "Record", value: "record" },
	{ label: "Geometry", value: "geometry" },
];

export const GEOMETRY_TYPES = [
	{ label: "Feature", value: "feature" },
	{ label: "Point", value: "point" },
	{ label: "Line", value: "line" },
	{ label: "Polygon", value: "polygon" },
	{ label: "MultiPoint", value: "multipoint" },
	{ label: "MultiLine", value: "multiline" },
	{ label: "MultiPolygon", value: "multipolygon" },
	{ label: "Collection", value: "collection" },
];

export const DESIGNER_NODE_MODES = [
	{ label: "Fields", value: "fields" },
	{ label: "Summary", value: "summary" },
	{ label: "Simple", value: "simple" },
];

export const DESIGNER_DIRECTIONS = [
	{ label: "Left to right", value: "ltr" },
	{ label: "Right to left", value: "rtl" },
];

export const SURQL_FILTERS = [
	{
		name: "SurrealDB Schema",
		extensions: ["surql", "sql", "surrealql"],
	},
];

export const ORIENTATIONS: Selectable<Orientation>[] = [
	{ label: "Horizontal", value: "horizontal" },
	{ label: "Vertical", value: "vertical" },
];

export const EDITOR_KEYMAPS: Selectable<EditorKeymap>[] = [
	{ label: "Default", value: "default" },
	{ label: "Vim", value: "vim" },
];
