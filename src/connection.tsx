import posthog from "posthog-js";
import { surrealdbWasmEngines } from 'surrealdb.wasm';
import { Surreal, QueryResult, ScopeAuth, UUID, decodeCbor, VersionRetrievalFailure, UnsupportedVersion } from 'surrealdb.js';
import { AuthDetails, ConnectionOptions, Protocol, QueryResponse } from './types';
import { getConnection } from './util/connection';
import { useDatabaseStore } from './stores/database';
import { connectionUri, newId, showError, showWarning } from './util/helpers';
import { syncDatabaseSchema } from './util/schema';
import { ConnectedEvent, DisconnectedEvent } from './util/global-events';
import { useInterfaceStore } from "./stores/interface";
import { useConfigStore } from "./stores/config";
import { objectify, sleep } from "radash";
import { getLiveQueries } from "./util/surrealql";
import { Value } from "surrealql.wasm/v1";
import { adapter } from "./adapter";

export interface ConnectOptions {
	connection?: ConnectionOptions;
}

export interface UserQueryOptions {
	override?: string;
}

let iter = 0;
const LQ_SUPPORTED = new Set<Protocol>(['ws', 'wss', 'mem', 'indxdb']);
const LIVE_QUERIES = new Map<string, Set<UUID>>();
const SURREAL = createSurreal();

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
	iter++;
	const iterSelf = iter;
	const currentConnection = getConnection();
	const connection = options?.connection || currentConnection?.connection;

	if (!connection) {
		throw new Error("No connection available");
	}

	const { setIsConnected, setIsConnecting, setVersion } = useDatabaseStore.getState();
	const { settings: { behavior: { versionCheckTimeout } } } = useConfigStore.getState();
	const rpcEndpoint = connectionUri(connection);

	await closeConnection();

	adapter.log('DB', `Opening connection to ${rpcEndpoint}`);

	setIsConnecting(true);
	setIsConnected(false);

	const isSignup = connection.authMode === "scope-signup";
	const auth = composeAuthentication(connection);

	await SURREAL.connect(rpcEndpoint, {
		versionCheckTimeout: (versionCheckTimeout ?? 5) * 1000,
		namespace: connection.namespace,
		database: connection.database,
		prepare: async (surreal) => {
			try {
				if (isSignup) {
					await register(buildScopeAuth(connection), surreal);
				} else {
					await authenticate(auth, surreal);
				}
			} catch {
				throw new Error("Authentication failed");
			}
		},
	})
		.then(() => {
			if (iter == iterSelf) {
				setIsConnecting(false);
				setIsConnected(true);
				syncDatabaseSchema();

				ConnectedEvent.dispatch(null);

				posthog.capture('connection_open', {
					protocol: connection.protocol
				});

				adapter.log('DB', "Connection established");
			}
		})
		.catch((err) => {
			if (iter == iterSelf) {
				SURREAL.close();

				setIsConnecting(false);
				setIsConnected(false);

				if (err instanceof VersionRetrievalFailure)
					return showWarning({
						title: "Failed to query version",
						subtitle: "The database version could not be determined. Please ensure the database is running and accessible by Surrealist."
					});

				if (err instanceof UnsupportedVersion)
					showError({
						title: "Unsupported version",
						subtitle: `The database version must be in range "${err.supportedRange}". The current version is ${err.version}`
					});

				showError({
					title: "Failed to connect",
					subtitle: err.message
				});
			}
		}).finally(() => {
			if (iter == iterSelf) {
				SURREAL.version().then((v) => {
					setVersion(v);
					adapter.log('DB', `Database version ${v ?? "unknown"}`);
				});
			}
		});
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
				throw new Error(err.message);
			}
		});
	}
}

/**
 * Execute a query against the active connection
 */
export async function executeQuery(query: string, params?: any) {
	try {
		adapter.trace('DB', `Executing query: ${query}`);

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
		setQueryActive(true);

		let liveIndexes: number[];

		try {
			liveIndexes = getLiveQueries(queryStr);
		} catch(err: any) {
			adapter.warn('DB', `Failed to parse live queries: ${err.message}`);
			console.error(err);
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
		setQueryActive(false);
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

/**
 * Construct a new configured Surreal instance
 *
 * @returns Surreal
 */
export function createSurreal() {
	return new Surreal({
		engines: surrealdbWasmEngines() as any
	});
}

function mapResults(response: QueryResult<unknown>[]): QueryResponse[] {
	return response.map(res => ({
		success: res.status == "OK",
		result: res.result,
		execution_time: res.time
	}));
}

function buildScopeAuth(connection: ConnectionOptions): ScopeAuth {
	const { namespace, database, scope, scopeFields } = connection;
	const fields = objectify(scopeFields, f => f.subject, f => f.value);

	return { namespace, database, scope, ...fields };
}
