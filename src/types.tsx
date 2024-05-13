import { MantineColorScheme } from "@mantine/core";
import { FeatureFlagMap } from "./util/feature-flags";
import { AnyAuth, Token } from "surrealdb.js";

export type DriverType = "file" | "memory" | "tikv";
export type ResultMode = "table" | "single" | "combined" | "live";
export type SourceMode = "schema" | "infer";
export type DiagramMode = "fields" | "summary" | "simple";
export type DiagramDirection = "ltr" | "rtl";
export type ColorScheme = "light" | "dark";
export type EditorKeymap = "vim" | "default";
export type Platform = "darwin" | "windows" | "linux";
export type TableType = "ANY" | "NORMAL" | "RELATION";
export type ValueMode = "json" | "sql";
export type Orientation = "horizontal" | "vertical";
export type Protocol = "http" | "https" | "ws" | "wss" | "mem" | "indxdb";
export type AuthMode =
	| "none"
	| "root"
	| "namespace"
	| "database"
	| "token"
	| "scope"
	| "scope-signup";
export type ViewMode =
	| "query"
	| "explorer"
	| "designer"
	| "authentication"
	| "functions"
	| "models"
	| "documentation";
export type CodeLang =
	| "cli"
	| "rust"
	| "js"
	| "go"
	| "py"
	| "csharp"
	| "java"
	| "php";

export type OpenFn = (id: string | null) => void;
export type ColumnSort = [string, "asc" | "desc"];
export type Open<T> = T & { [key: string]: any };
export type PartialId<T extends { id: I }, I = string> = Pick<T, "id"> &
Partial<T>;
export type FeatureCondition<R = boolean> = (flags: FeatureFlagMap) => R;
export type Selectable<T extends string> = { label: string; value: T };
export type AuthDetails = AnyAuth | Token | undefined;

export interface ConnectionOptions {
	namespace: string;
	database: string;
	protocol: Protocol;
	hostname: string;
	username: string;
	password: string;
	authMode: AuthMode;
	token: string;
	scope: string;
	scopeFields: ScopeField[];
}

export interface Connection {
	id: string;
	name: string;
	icon: number;
	queries: TabQuery[];
	activeQuery: string;
	connection: ConnectionOptions;
	pinnedTables: string[];
	diagramMode: DiagramMode;
	diagramDirection: DiagramDirection;
	queryHistory: HistoryQuery[];
}

export interface Template {
	id: string;
	name: string;
	icon: number;
	values: ConnectionOptions;
}

export interface SurrealistBehaviorSettings {
	updateChecker: boolean;
	tableSuggest: boolean;
	variableSuggest: boolean;
	queryErrorChecker: boolean;
	windowPinned: boolean;
	autoConnect: boolean;
	docsLanguage: CodeLang;
	editorKeymap: EditorKeymap;
}

export interface SurrealistAppearanceSettings {
	colorScheme: MantineColorScheme;
	windowScale: number;
	editorScale: number;
	resultWordWrap: boolean;
	defaultResultMode: ResultMode;
	defaultDiagramMode: DiagramMode;
	defaultDiagramDirection: DiagramDirection;
	expandSidebar: boolean;
	valueMode: ValueMode;
	queryOrientation: Orientation;
}

export interface SurrealistTemplateSettings {
	list: Template[];
}

export interface SurrealistServingSettings {
	driver: DriverType;
	storage: string;
	executable: string;
	username: string;
	password: string;
	port: number;
}

export interface QueryResponse {
	execution_time: string;
	success: boolean;
	result: any;
}

export interface TabQuery {
	id: string;
	query: string;
	name?: string;
	variables: string;
	valid: boolean;
	resultMode: ResultMode;
}

export interface HistoryQuery {
	id: string;
	query: string;
	timestamp: number;
	origin?: string;
}

export interface SavedQuery {
	id: string;
	query: string;
	name: string;
	tags: string[];
}

export interface SurrealistSettings {
	behavior: SurrealistBehaviorSettings;
	appearance: SurrealistAppearanceSettings;
	templates: SurrealistTemplateSettings;
	serving: SurrealistServingSettings;
}

export interface SurrealistConfig {
	configVersion: number;
	previousVersion: string;
	connections: Connection[];
	sandbox: Connection;
	activeView: ViewMode;
	activeConnection: string | null;
	savedQueries: SavedQuery[];
	lastPromptedVersion: string | null;
	lastViewedNewsAt: number | null;
	settings: SurrealistSettings;
	featureFlags: Partial<FeatureFlagMap>;
	commandHistory: string[];
	onboarding: string[];
}

export interface ScopeField {
	subject: string;
	value: string;
}

export interface TableView {
	expr: string;
	cond: string;
	group: string;
}

export interface Permissions {
	select: boolean | string;
	create: boolean | string;
	update: boolean | string;
	delete: boolean | string;
}

export interface Kind {
	kind: TableType;
	in?: string[];
	out?: string[];
}

export interface DatabaseSchema {
	kvUsers: SchemaUser[];
	nsUsers: SchemaUser[];
	dbUsers: SchemaUser[];
	scopes: SchemaScope[];
	functions: SchemaFunction[];
	models: SchemaModel[];
	tables: TableInfo[];
}

export interface SchemaTable {
	name: string;
	drop: boolean;
	full: boolean;
	permissions: Permissions;
	kind: Kind;
	view?: string;
	changefeed?: { expiry: string; store_original: boolean };
}

export interface SchemaField {
	name: string;
	flex: boolean;
	readonly: boolean;
	kind?: string;
	value?: string;
	assert?: string;
	default?: string;
	permissions: Permissions;
}

export interface SchemaIndex {
	name: string;
	cols: string;
	index: string;
}

export interface SchemaEvent {
	name: string;
	when: string;
	then: string[];
}

export interface SchemaUser {
	name: string;
	comment: string;
	roles: string[];
}

export interface SchemaScope {
	name: string;
	signin?: string;
	signup?: string;
	session?: string;
}

export interface SchemaFunction {
	name: string;
	block: string;
	args: [string, string][];
	permissions: boolean | string;
	comment: string;
}

export interface SchemaModel {
	name: string;
	hash: string;
	version: string;
	permission: boolean | string;
	comment: string;
}

export interface TableInfo {
	schema: SchemaTable;
	fields: SchemaField[];
	indexes: SchemaIndex[];
	events: SchemaEvent[];
}

export interface SchemaInfoKV {
	namespaces: any[];
	users: SchemaUser[];
}

export interface SchemaInfoNS {
	databases: any[];
	tokens: any[];
	users: SchemaUser[];
}

export interface SchemaInfoDB {
	analyzers: any[];
	functions: SchemaFunction[];
	models: SchemaModel[];
	params: any[];
	scopes: SchemaScope[];
	tables: SchemaTable[];
	tokens: any[];
	users: SchemaUser[];
}

export interface SchemaInfoTB {
	events: SchemaEvent[];
	fields: SchemaField[];
	indexes: SchemaIndex[];
	tables: any[];
}

export interface Analyzer {
	name: string;
	tokenizers: string[];
	filters: string[];
}

export interface SurrealOptions {
	connection: ConnectionOptions;
	onConnect?: (version: string) => void;
	onDisconnect?: (code: number, reason: string) => void;
	onError?: (error: string) => void;
}

export interface ViewInfo {
	id: ViewMode;
	name: string;
	icon: string;
	anim?: any;
	desc: string;
	disabled?: FeatureCondition;
}

export interface DataSet {
	name: string;
	url: string;
}
