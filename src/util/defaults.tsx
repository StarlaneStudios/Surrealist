import { Connection, ConnectionOptions, DatabaseSchema, SurrealistConfig, SurrealistSettings, TabQuery } from "~/types";
import { newId } from "./helpers";
import { validateQuery } from "./surrealql";

export const CONFIG_VERSION = 1;

export function createBaseConfig(): SurrealistConfig {
	const settings = createBaseSettings();

	return {
		configVersion: CONFIG_VERSION,
		previousVersion: import.meta.env.VERSION,
		connections: [],
		sandbox: createSandboxConnection(settings),
		activeView: 'query',
		activeConnection: null,
		savedQueries: [],
		lastPromptedVersion: null,
		featureFlags: {},
		commandHistory: [],
		lastViewedNewsAt: null,
		onboarding: [],
		settings
	};
}

export function createBaseSettings(): SurrealistSettings {
	return {
		behavior: {
			updateChecker: true,
			tableSuggest: true,
			variableSuggest: true,
			queryErrorChecker: true,
			windowPinned: false,
			autoConnect: true,
			docsLanguage: "cli",
			editorKeymap: "default"
		},
		appearance: {
			colorScheme: "dark",
			windowScale: 100,
			editorScale: 100,
			resultWordWrap: true,
			defaultResultMode: "combined",
			defaultDiagramMode: "fields",
			defaultDiagramDirection: "ltr",
			expandSidebar: true,
			valueMode: "sql",
			queryOrientation: "vertical"
		},
		templates: {
			list: []
		},
		serving: {
			driver: "memory",
			storage: "",
			executable: "",
			username: "root",
			password: "root",
			port: 8000
		}
	};
}

export function createBaseConnectionOptions(): ConnectionOptions {
	return {
		protocol: "ws",
		hostname: "",
		namespace: "",
		database: "",
		username: "",
		password: "",
		authMode: "root",
		token: "",
		scope: "",
		scopeFields: []
	};
}

export function createBaseConnection(settings: SurrealistSettings): Connection {
	const baseTab = createBaseTab(settings);

	return {
		id: newId(),
		name: "",
		icon: 0,
		queries: [{
			...baseTab,
			name: "New query"
		}],
		activeQuery: baseTab.id,
		connection: createBaseConnectionOptions(),
		pinnedTables: [],
		queryHistory: [],
		diagramMode: settings.appearance.defaultDiagramMode,
		diagramDirection: settings.appearance.defaultDiagramDirection,
	};
}

export function createBaseTab(settings: SurrealistSettings, query?: string, ): TabQuery {
	return {
		id: newId(),
		query: query || "",
		name: "",
		variables: "{}",
		valid: query ? !validateQuery(query) : true,
		resultMode: settings.appearance.defaultResultMode,
	};

}

export function createSandboxConnection(settings: SurrealistSettings): Connection {
	return {
		...createBaseConnection(settings),
		id: "sandbox",
		name: "Sandbox",
		connection: {
			protocol: "mem",
			hostname: "",
			namespace: "sandbox",
			database: "sandbox",
			authMode: "none",
			token: "",
			scope: "",
			scopeFields: [],
			password: "",
			username: ""
		}
	};
}

export function createDatabaseSchema(): DatabaseSchema {
	return {
		kvUsers: [],
		nsUsers: [],
		dbUsers: [],
		scopes: [],
		functions: [],
		models: [],
		tables: [],
	};
}
