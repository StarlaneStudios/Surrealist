import { closeSurrealConnection, getSurreal, openSurrealConnection } from "./util/surreal";
import { newId, showError } from "./util/helpers";
import { fetchDatabaseSchema } from "./util/schema";
import { getConnection } from "./util/connection";
import { useDatabaseStore } from "./stores/database";
import { useConfigStore } from "./stores/config";
import { ConnectedEvent, DisconnectedEvent } from "./util/global-events";
import { useInterfaceStore } from "./stores/interface";
import { ConnectionOptions } from "./types";

export interface ConnectOptions {
	connection?: ConnectionOptions;
}

/**
 * Open a new connection to the data
 * @param options Whether to hide error notifications
 * @param callback Callback to run after the connection is opened
 */
export function openConnection(options?: ConnectOptions): Promise<void> {
	const currentConnection = getConnection();
	const connection = options?.connection || currentConnection?.connection;

	if (!connection) {
		return Promise.reject(new Error("No connection available"));
	}

	const { setIsConnected, setIsConnecting } = useDatabaseStore.getState();
	const { openScopeSignup } = useInterfaceStore.getState();

	closeConnection();

	return new Promise((resolve, reject) => {
		setIsConnecting(true);
		setIsConnected(false);

		openSurrealConnection({
			connection,
			onConnect() {
				setIsConnecting(false);
				setIsConnected(true);
				fetchDatabaseSchema();
				resolve();
				ConnectedEvent.dispatch(null);
			},
			onDisconnect(code, reason) {
				setIsConnecting(false);
				setIsConnected(false);
				DisconnectedEvent.dispatch(null);

				if (code != 1000) {
					const subtitle = code === 1006
						? "Unexpected connection close"
						: reason || `Unknown reason`;

					showError({
						title: "Connection lost",
						subtitle: `${subtitle} (${code})`,
					});
				}
			},
			onError(error) {
				reject(new Error(error));

				if (error.includes("No record was returned")) {
					openScopeSignup();
				}
			},
		});
	});
}

export interface QueryOptions {
	override?: string;
	loader?: boolean;
}

/**
 * Execute a query against the active connection
 *
 * @param options Query options
 */
export async function executeQuery(options?: QueryOptions) {
	const { setQueryActive, isConnected } = useDatabaseStore.getState();
	const { addHistoryEntry, updateQueryTab } = useConfigStore.getState();
	const connection = getConnection();

	if (!connection || !isConnected) {
		showError({
			title: "Failed to execute",
			subtitle: "You must be connected to the database"
		});
		return;
	}

	const tabQuery = connection.queries.find((q) => q.id === connection.activeQuery);

	if (!tabQuery) {
		return;
	}

	const { id, query, variables, name } = tabQuery;
	const queryStr = (options?.override || query).trim();
	const variableJson = variables
		? JSON.parse(variables)
		: undefined;

	if (query.length === 0) {
		return;
	}

	try {
		if (options?.loader) {
			setQueryActive(true);
		}

		const surreal = getSurreal();
		const response = await surreal?.query(queryStr, variableJson, id) || [];

		updateQueryTab({
			id,
			response
		});
	} finally {
		if (options?.loader) {
			setQueryActive(false);
		}
	}

	addHistoryEntry({
		id: newId(),
		query: queryStr,
		timestamp: Date.now(),
		origin: name
	});
}

/**
 * Terminate the active connection
 */
export function closeConnection() {
	const { setIsConnected, setIsConnecting } = useDatabaseStore.getState();

	closeSurrealConnection();
	setIsConnecting(false);
	setIsConnected(false);
}