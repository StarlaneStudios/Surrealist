import { Platform } from "~/types";

export interface OpenedTextFile {
	name: string;
	content: string;
}

export interface OpenedBinaryFile {
	name: string;
	content: Blob;
}

export interface SurrealistAdapter {

	/**
	 * Returns whether local database serving is supported
	 */
	isServeSupported: boolean;

	/**
	 * Returns whether update checking is supported
	 */
	isUpdateCheckSupported: boolean;

	/**
	 * Whether the window has a native titlebar
	 */
	hasTitlebar: boolean;

	/**
	 * The currently active platform
	 */
	platform: Platform;

	/**
	 * Initialize any adapter specific services. This function is invoked
	 * after the config has been loaded.
	 */
	initialize(): void;

	/**
	 * Return debug information about the current environment of the adapter
	 */
	dumpDebug(): Result<object>;

	/**
	 * Set the window title
	 *
	 * @param title The title to set
	 */
	setWindowTitle(title: string): Promise<void>;

	/**
	 * Load the config from the adapter
	 */
	loadConfig(): Promise<any>;

	/**
	 * Save the config to the adapter
	 *
	 * @param config The config to save
	 */
	saveConfig(config: any): Promise<void>;

	/**
	 * Check whether the adapter has a legacy config. This is
	 * called after loadConfig.
	 */
	hasLegacyConfig(): Result<boolean>;

	/**
	 * Return the legacy config used for migration
	 */
	getLegacyConfig(): Promise<any>;

	/**
	 * Clean up any legacy config. This is called after the config
	 * has been migrated, or if the user chooses to ignore the
	 * migration.
	 */
	handleLegacyCleanup(): Promise<void>;

	/**
	 * Start the database with the given parameters
	 */
	startDatabase(
		username: string,
		password: string,
		port: number,
		localDriver: string,
		localPath: string,
		surrealPath: string
	): Promise<void>;

	/**
	 * Stop the currently running database
	 */
	stopDatabase(): Promise<void>;

	/**
	 * Open the given URL in the default browser
	 *
	 * @param url The URL to open
	 */
	openUrl(url: string): Promise<void>;

	/**
	 * Save a file locally
	 */
	saveFile(
		title: string,
		defaultPath: string,
		filters: any,
		content: () => Result<string | Blob | null>
	): Promise<boolean>;

	/**
	 * Open a text file locally
	 */
	openTextFile(
		title: string,
		filters: any,
		multiple: boolean
	): Promise<OpenedTextFile[]>;

	/**
	 * Open a binary file locally
	 */
	openBinaryFile(
		title: string,
		filters: any,
		multiple: boolean
	): Promise<OpenedBinaryFile[]>;

	/**
	 * Log a message to the implemented logging system
	 */
	log(label: string, message: string): void;

	/**
	 * Log a warning message to the implemented logging system
	 */
	warn(label: string, message: string): void;

	/**
	 * Log a trace message to the implemented logging system
	 */
	trace(label: string, message: string): void;

}
