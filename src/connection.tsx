import posthog from "posthog-js";
import { surrealdbWasmEngines } from 'surrealdb.wasm';
import { Surreal, QueryResult, ScopeAuth, UUID, decodeCbor } from 'surrealdb.js';
import { AuthDetails, ConnectionOptions, Protocol, QueryResponse } from './types';
import { getConnection } from './util/connection';
import { useDatabaseStore } from './stores/database';
import { connectionUri, newId, printLog, showError, versionUri } from './util/helpers';
import { syncDatabaseSchema } from './util/schema';
import { ConnectedEvent, DisconnectedEvent } from './util/global-events';
import { useInterfaceStore } from "./stores/interface";
import { useConfigStore } from "./stores/config";
import { compare } from "semver";
import { objectify, sleep } from "radash";
import { getLiveQueries } from "./util/surrealql";
import { Value } from "surrealql.wasm/v1";

const printMsg = (...args: any[]) => printLog("Conn", "#1cccfc", ...args);

export interface ConnectOptions {
	connection?: ConnectionOptions;
}

export interface UserQueryOptions {
	override?: string;
	loader?: boolean;
}

const LQ_SUPPORTED = new Set<Protocol>(['ws', 'wss', 'mem', 'indxdb']);
const MINIMUM_VERSION = import.meta.env.SDB_VERSION;
const LIVE_QUERIES = new Map<string, Set<UUID>>();
const SURREAL = new Surreal({
	engines: surrealdbWasmEngines() as any
});

// Subscribe to disconnects
SURREAL.emitter.subscribe("disconnected", () => {
	const { setIsConnected, setIsConnecting, setVersion } = useDatabaseStore.getState();

	setIsConnecting(false);
	setIsConnected(false);
	setVersion("");

	DisconnectedEvent.dispatch(null);
});

/**
 * Open a new connection to the data
 *
 * @param options Connection options
 */
export async function openConnection(options?: ConnectOptions) {
	const currentConnection = getConnection();
	const connection = options?.connection || currentConnection?.connection;

	if (!connection) {
		throw new Error("No connection available");
	}

	const { setIsConnected, setIsConnecting, setVersion } = useDatabaseStore.getState();
	const rpcEndpoint = connectionUri(connection);
	const versionEndpoint = versionUri(connection);

	await closeConnection();

	printMsg("Opening connection to", rpcEndpoint);

	setIsConnecting(true);
	setIsConnected(false);

	if (versionEndpoint) {
		try {
			const versionResponse = await fetch(versionEndpoint);
			const versionText = await versionResponse.text();
			const version = versionText.replace(/^surrealdb-/, "").replace(/\+.+/, "");

			if (compare(version, MINIMUM_VERSION) < 0) {
				setIsConnecting(false);
				setIsConnected(false);

				showError({
					title: "Unsupported version",
					subtitle: `The server is running an unsupported version of SurrealDB (${version}). Please upgrade to at least ${MINIMUM_VERSION}`
				});

				return;
			}

			setVersion(version);

			printMsg("Database version", version);
		} catch(err: any) {
			console.error("Failed to retrieve database version", err);
		}
	}

	const isSignup = connection.authMode === "scope-signup";
	const auth = composeAuthentication(connection);

	try {
		await SURREAL.connect(rpcEndpoint, {
			namespace: connection.namespace,
			database: connection.database,
			prepare: async (surreal) => {
				if (isSignup) {
					register(buildScopeAuth(connection), surreal);
				} else {
					authenticate(auth, surreal);
				}
			},
		});

		setIsConnecting(false);
		setIsConnected(true);
		syncDatabaseSchema();

		ConnectedEvent.dispatch(null);

		posthog.capture('connection_open', {
			protocol: connection.protocol
		});

		printMsg("Connection established");
	} catch(err: any) {
		SURREAL.close();

		setIsConnecting(false);
		setIsConnected(false);

		showError({
			title: "Failed to connect",
			subtitle: err.message
		});
	}
}

/**
 * Close the active surreal connection
 */
export async function closeConnection() {
	const status = SURREAL.status;

	if (status === "connected" || status === "connecting") {
		await SURREAL.close();
		await sleep(100);
	}
}

/**
 * Register a new scope user
 *
 * @param auth The authentication details
 * @param surreal The optional surreal instance
 */
export async function register(auth: ScopeAuth, surreal?: Surreal) {
	surreal ??= SURREAL;

	await surreal.signup(auth).catch(() => {
		throw new Error("Could not sign up");
	});
}

/**
 * Authenticate the connection
 *
 * @param auth The authentication details
 * @param surreal The optional surreal instance
 */
export async function authenticate(auth: AuthDetails, surreal?: Surreal) {
	surreal ??= SURREAL;

	if (auth === undefined) {
		await surreal.invalidate();
	} else if (typeof auth === "string") {
		await surreal.authenticate(auth).catch(() => {
			throw new Error("Authentication token invalid");
		});
	} else if (auth) {
		await surreal.signin(auth).catch(err => {
			const { openScopeSignup } = useInterfaceStore.getState();

			if (err.message.includes("No record was returned")) {
				openScopeSignup();
			} else {
				throw new Error("Connection failed");
			}
		});
	}
}

/**
 * Execute a query against the active connection
 */
export async function executeQuery(query: string, params?: any) {
	try {
		const responseRaw = await SURREAL.query_raw(query, params) || [];

		return mapResults(responseRaw);
	} catch(err: any) {
		return [{
			success: false,
			result: err.message,
			execution_time: ''
		}];
	}
}

/**
 * Execute a query against the active connection and
 * return the first response
 */
export async function executeQueryFirst(query: string) {
	const results = await executeQuery(query);
	const { success, result } = results[0];

	if (success) {
		return result;
	} else {
		throw new Error(result);
	}
}

/**
 * Execute a query against the active connection and
 * return the first record of the first response
 */
export async function executeQuerySingle<T = any>(query: string): Promise<T> {
	const results = await executeQuery(query);
	const { success, result } = results[0];

	if (success) {
		return Array.isArray(result) ? result[0] : result;
	} else {
		throw new Error(result);
	}
}

/**
 * Execute a query against the active connection
 *
 * @param options Query options
 */
export async function executeUserQuery(options?: UserQueryOptions) {
	const { setIsLive, pushLiveQueryMessage, clearLiveQueryMessages } = useInterfaceStore.getState();
	const { setQueryActive, isConnected, setQueryResponse } = useDatabaseStore.getState();
	const { addHistoryEntry } = useConfigStore.getState();
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
		? decodeCbor(Value.from_string(variables).to_cbor().buffer)
		: undefined;

	if (query.length === 0) {
		return;
	}

	try {
		if (options?.loader) {
			setQueryActive(true);
		}

		let liveIndexes: number[];

		try {
			liveIndexes = getLiveQueries(queryStr);
		} catch(err: any) {
			console.warn("Failed to parse live queries", err);
			liveIndexes = [];
		}

		if (liveIndexes.length > 0 && !LQ_SUPPORTED.has(connection.connection.protocol)) {
			showError({
				title: "Live queries unsupported",
				subtitle: "Unfortunately live queries are not supported in the active connection protocol"
			});
		}

		const response = await executeQuery(queryStr, variableJson) || [];
		const liveIds = liveIndexes.flatMap(idx => {
			const res = response[idx];

			if (!res.success || !(res.result instanceof UUID)) {
				return [];
			}

			return [res.result];
		});

		cancelLiveQueries(id);
		clearLiveQueryMessages(id);
		setIsLive(id, liveIds.length > 0);

		LIVE_QUERIES.set(id, new Set(liveIds));

		const timestamp = Date.now();

		for (const queryId of liveIds) {
			SURREAL.subscribeLive(queryId, (action, data) => {
				pushLiveQueryMessage(id, {
					id: newId(),
					queryId: queryId.toString(),
					action,
					data,
					timestamp
				});
			});
		}

		setQueryResponse(id, response);
		posthog.capture('query_execute');
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
 * Cancel the active live queries for the given query ID
 */
export function cancelLiveQueries(tab: string) {
	const { setIsLive } = useInterfaceStore.getState();

	for (const id of LIVE_QUERIES.get(tab) || []) {
		SURREAL.kill(id);
	}

	setIsLive(tab, false);
}

/**
 * Compose authentication details for the given connection
 *
 * @param connection The connection options
 * @returns The authentication details
 */
export function composeAuthentication(connection: ConnectionOptions): AuthDetails {
	const { authMode, username, password, namespace, database, token } = connection;

	switch (authMode) {
		case "root": {
			return { username, password };
		}
		case "namespace": {
			return { namespace, username, password };
		}
		case "database": {
			return { namespace, database, username, password };
		}
		case "scope": {
			return buildScopeAuth(connection);
		}
		case "token": {
			return token;
		}
		default: {
			return undefined;
		}
	}
}

function mapResults(response: QueryResult<unknown>[]): QueryResponse[] {
	return response.map(res => {
		return res.status == "OK" ? {
			success: true,
			result: res.result,
			execution_time: res.time
		} : {
			success: false,
			result: res.result,
			execution_time: res.time
		};
	});
}

function buildScopeAuth(connection: ConnectionOptions): ScopeAuth {
	const { namespace, database, scope, scopeFields } = connection;
	const fields = objectify(scopeFields, f => f.subject, f => f.value);

	return { namespace, database, scope, ...fields };
}
