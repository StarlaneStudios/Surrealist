import { SurrealistConfig } from "~/types";

export function createBaseConfig(): SurrealistConfig {
	return {
		theme: "automatic",
		tabs: [],
		environments: [],
		activeTab: null,
		autoConnect: true,
		tableSuggest: true,
		wordWrap: true,
		queryHistory: [],
		queryFavorites: [],
		localDriver: "memory",
		localStorage: "",
		surrealPath: "",
		surrealUser: "root",
		surrealPass: "root",
		surrealPort: 8000,
		enableConsole: true,
		enableListing: false,
		queryTimeout: 10,
		updateChecker: true,
		queryListing: "history",
		resultListing: "json",
		fontZoomLevel: 1,
		errorChecking: true,
		lastPromptedVersion: null,
		tabSearch: false,
	};
}
