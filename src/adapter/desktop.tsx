import { invoke } from "@tauri-apps/api/core";
import { basename } from "@tauri-apps/api/path";
import { listen } from "@tauri-apps/api/event";
import { arch, type } from "@tauri-apps/plugin-os";
import { open as openURL } from "@tauri-apps/plugin-shell";
import { check } from "@tauri-apps/plugin-updater";
import { save, open } from "@tauri-apps/plugin-dialog";
import { attachConsole, info, trace, warn } from "@tauri-apps/plugin-log";
import { readFile, readTextFile, writeFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { OpenedBinaryFile, OpenedTextFile, SurrealistAdapter } from "./base";
import { showError, showInfo, updateTitle } from "~/util/helpers";
import { useDatabaseStore } from "~/stores/database";
import { useConfigStore } from "~/stores/config";
import { watchStore } from "~/util/config";
import { Platform, ViewMode } from "~/types";
import { getHotkeyHandler } from "@mantine/hooks";
import { getCurrent } from "@tauri-apps/api/window";
import { getCurrent as getWebView } from "@tauri-apps/api/webview";
import { handleIntentRequest } from "~/util/intents";
import { VIEW_MODES } from "~/constants";
import { useInterfaceStore } from "~/stores/interface";
import { adapter } from ".";
import { featureFlags } from "~/util/feature-flags";

const WAIT_DURATION = 1000;

interface Resource {
	File?: FileResource;
	Link?: LinkResource;
}

interface FileResource {
	success: boolean,
	name: string,
	query: string
}

interface LinkResource {
	host: string;
	params: string;
}

/**
 * Surrealist adapter for running as Wails desktop app
 */
export class DesktopAdapter implements SurrealistAdapter {

	public isServeSupported = true;
	public isUpdateCheckSupported = true;
	public hasTitlebar = false;
	public platform: Platform = "windows";

	#startTask: any;
	#arch: string = '';
	#system: string = '';

	public constructor() {
		this.initDatabaseEvents();

		document.addEventListener("DOMContentLoaded", () => {
			setTimeout(() => {
				getCurrent().show();
			}, 500);
		});

		document.addEventListener("contextmenu", (e) => {
			e.preventDefault();
		});

		document.body.addEventListener("keydown", getHotkeyHandler([
			["mod+alt+i", () => invoke("toggle_devtools")]
		]));

		type().then(t => {
			this.hasTitlebar = t === "windows" || t === "linux";
		});

		listen("open-resource", () => {
			this.queryOpenRequest();
		});

		listen("tauri://focus", () => {
			this.checkForUpdates();
		});
	}

	public async initialize() {
		await attachConsole();

		this.queryOpenRequest();
		this.checkForUpdates();

		watchStore({
			initial: true,
			store: useConfigStore,
			select: (s) => s.settings.appearance.windowScale,
			then: (scale) => getWebView().setZoom(scale / 100),
		});

		watchStore({
			initial: true,
			store: useConfigStore,
			select: (s) => s.settings.behavior.windowPinned,
			then: (pinned) => {
				getCurrent().setAlwaysOnTop(pinned);
				updateTitle();
			},
		});

		this.#arch = await arch();
		this.#system = await type();
	}

	public dumpDebug = async () => ({
		"Platform": "Desktop",
		"OS": this.#system,
		"Architecture": this.#arch,
		"WebView": navigator.userAgent,
	});

	public setWindowTitle(title: string) {
		return getCurrent().setTitle(title || "Surrealist");
	}

	public async loadConfig() {
		switch (await type()) {
			case "windows": {
				this.platform = "windows";
				break;
			}
			case "macos": {
				this.platform = "darwin";
				break;
			}
			case "linux": {
				this.platform = "linux";
				break;
			}
		}

		const config = await invoke<string>("load_config");

		return JSON.parse(config);
	}

	public saveConfig(config: string) {
		return invoke<void>("save_config", {
			config: JSON.stringify(config)
		});
	}

	public async hasLegacyConfig() {
		return invoke<boolean>("has_legacy_config");
	}

	public async getLegacyConfig() {
		const config = await invoke<string>("load_legacy_config");

		return JSON.parse(config);
	}

	public async handleLegacyCleanup() {
		return invoke<void>("complete_legacy_migrate");
	}

	public async startDatabase(
		username: string,
		password: string,
		port: number,
		localDriver: string,
		localPath: string,
		surrealPath: string
	) {
		return invoke<void>("start_database", {
			username: username,
			password: password,
			port: port,
			driver: localDriver,
			storage: localPath,
			executable: surrealPath,
			v2Compat: featureFlags.get('surreal_compat') === 'v2'
		});
	}

	public stopDatabase() {
		return invoke<void>("stop_database");
	}

	public async openUrl(url: string) {
		openURL(url);
	}

	public async saveFile(
		title: string,
		defaultPath: string,
		filters: any,
		content: () => Result<string | Blob | null>
	): Promise<boolean> {
		const filePath = await save({ title, defaultPath, filters });

		if (!filePath) {
			return false;
		}

		const result = await content();

		if (!result) {
			return false;
		}

		if (typeof result === "string") {
			await writeTextFile(filePath, result);
		} else {
			await writeFile(filePath, new Uint8Array(await result.arrayBuffer()));
		}

		return true;
	}

	public async openTextFile(
		title: string,
		filters: any,
		multiple: boolean
	): Promise<OpenedTextFile[]> {
		const result = await open({
			title,
			filters,
			multiple
		});

		if (!result) {
			return [];
		}

		const files: { path: string; }[] = Array.isArray(result) ? result : [result];
		const tasks = files.map(async ({ path }) => ({
			name: await basename(path),
			content: await readTextFile(path)
		}));

		return Promise.all(tasks);
	}

	public async openBinaryFile(
		title: string,
		filters: any,
		multiple: boolean
	): Promise<OpenedBinaryFile[]> {
		const result = await open({
			title,
			filters,
			multiple: true
		});

		if (!result) {
			return [];
		}

		const files: { path: string; }[] = Array.isArray(result) ? result : [result];
		const tasks = files.map(async ({ path }) => ({
			name: await basename(path),
			content: new Blob([await readFile(path)])
		}));

		return Promise.all(tasks);
	}

	public toggleDevTools() {
		invoke("toggle_devtools");
	}

	public log(label: string, message: string) {
		info(label + ": " + message);
	}

	public warn(label: string, message: string) {
		warn(label + ": " + message);
	}

	public trace(label: string, message: string) {
		trace(label + ": " + message);
	}

	public async checkForUpdates(force?: boolean) {
		const { lastPromptedVersion, setLastPromptedVersion } = useConfigStore.getState();
		const { setAvailableUpdate } = useInterfaceStore.getState();

		adapter.log("Updater", "Checking for updates");

		const result = await check();

		if (result && (force || result.version !== lastPromptedVersion)) {
			adapter.log("Updater", `New version available: ${result.version}`);

			setAvailableUpdate(result);
			setLastPromptedVersion(result.version);
		}
	}

	private initDatabaseEvents() {
		let throttleLevel = 0;

		setInterval(() => {
			throttleLevel = Math.max(0, throttleLevel - 1);
		}, 500);

		listen("database:start", () => {
			this.log('Serve', "Received database start signal");

			this.#startTask = setTimeout(() => {
				useDatabaseStore.getState().confirmServing();

				showInfo({
					title: "Serving started",
					subtitle: "Local database is now online"
				});
			}, WAIT_DURATION);
		});

		listen("database:stop", () => {
			this.log('Serve', "Received database stop signal");

			if (this.#startTask) {
				clearTimeout(this.#startTask);
			}

			useDatabaseStore.getState().stopServing();

			showInfo({
				title: "Serving stopped",
				subtitle: "Local database is now offline"
			});
		});

		listen("database:output", (event) => {
			if (throttleLevel > 50) {
				return;
			}

			useDatabaseStore.getState().pushConsoleLine(event.payload as string);
			throttleLevel++;
		});

		listen("database:error", (event) => {
			this.log('Serve', "Received database error signal");

			const msg = event.payload as string;

			if (this.#startTask) {
				clearTimeout(this.#startTask);
			}

			useDatabaseStore.getState().stopServing();

			showError({
				title: "Serving failed",
				subtitle: msg
			});
		});
	}

	private async queryOpenRequest() {
		const { addQueryTab, setActiveView } = useConfigStore.getState();
		const resources = await invoke<Resource[]>("get_opened_resources");

		if (resources.length === 0) {
			return;
		}

		for (const { File, Link } of resources) {
			if (File) {
				const { success, name, query } = File;

				if (!success) {
					showError({
						title: `Failed to open "${name}"`,
						subtitle: `File exceeds maximum size limit`
					});

					continue;
				}

				addQueryTab({ name, query });
				setActiveView("query");
			} else if (Link) {
				const { host, params } = Link;

				if (host) {
					const views = Object.keys(VIEW_MODES) as ViewMode[];
					const target = views.find((v) => host === v);

					if (target) {
						setActiveView(target);
					}
				}

				if (params) {
					const search = new URLSearchParams(params);
					const intent = search.get("intent");

					if (intent) {
						setTimeout(() => {
							handleIntentRequest(intent);
						});
					}
				}
			}
		}
	}
}
