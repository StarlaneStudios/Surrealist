import classes from './style.module.scss';
import surrealistLogo from '~/assets/icon.png';
import { ActionIcon, Box, Button, Center, Group, Image, Modal, Paper, Stack, Text, TextInput, Title, useMantineTheme } from "@mantine/core";
import { Spacer } from "../Spacer";
import { actions, store, useStoreValue } from '~/store';
import { useStable } from '~/hooks/stable';
import { uid } from 'radash';
import { MouseEvent, useEffect, useState } from 'react';
import { updateConfig, updateTitle } from '~/util/helpers';
import { TabBar } from '../TabBar';
import { Form } from '../Form';
import { useImmer } from 'use-immer';
import { getSurreal, openSurreal, SurrealConnection } from '~/surreal';
import { QueryPane } from '../QueryPane';
import { useActiveTab } from '~/hooks/tab';
import { ResultPane } from '../ResultPane';
import { ConsolePane } from "~/components/ConsolePane";
import { showNotification } from '@mantine/notifications';
import { VariablesPane } from '../VariablesPane';
import { useIsLight } from '~/hooks/theme';
import { mdiConsole } from '@mdi/js';
import { Icon } from '../Icon';
import { HistoryPane } from '../HistoryPane';
import { Splitter } from '../Splitter';
import { FavoritesPane } from '../FavoritesPane';

export function Scaffold() {
	const isLight = useIsLight();
	const theme = useMantineTheme();
	const activeTab = useStoreValue(state => state.activeTab);
	const tabList = useStoreValue(state => state.config.tabs);
	const autoConnect = useStoreValue(state => state.config.autoConnect);
	const servePending = useStoreValue(state => state.servePending);
	const isServing = useStoreValue(state => state.isServing);
	const enableConsole = useStoreValue(state => state.config.enableConsole);
	const enableListing = useStoreValue(state => state.config.enableListing);
	const queryListing = useStoreValue(state => state.config.queryListing);
	const tabInfo = useActiveTab();

	const [isOnline, setIsOnline] = useState(false);
	const [isConnecting, setIsConnecting] = useState(false);

	const createNewTab = useStable(async () => {
		const tabId = uid(5);

		function name(n: number) {
			return `New tab ${n ? n + 1 : ''}`.trim();
		}

		let tabName = '';
		let counter = 0;

		do {
			tabName = name(counter);
			counter++;
		} while(tabList.find(tab => tab.name === tabName));

		store.dispatch(actions.addTab({
			id: tabId,
			name: tabName,
			query: '',
			variables: '{}',
			lastResponse: [],
			layout: {},
			connection: {
				endpoint: 'http://localhost:8000/',
				username: 'root',
				password: 'root',
				namespace: '',
				database: ''
			}
		}));

		store.dispatch(actions.setActiveTab(tabId));

		updateTitle();
		await updateConfig();
	});

	const [ editingInfo, setEditingInfo ] = useState(false);
	const [ infoDetails, setInfoDetails ] = useImmer<SurrealConnection>({
		endpoint: '',
		username: '',
		password: '',
		namespace: '',
		database: ''
	});

	const openInfoEditor = useStable(() => {
		setEditingInfo(true);
		setInfoDetails(tabInfo!.connection);
	});

	const closeEditingInfo = useStable(() => {
		setEditingInfo(false);
	});

	const openConnection = useStable((e?: MouseEvent, silent?: boolean) => {
		e?.stopPropagation();

		if (isConnecting) {
			return;
		}

		const activeTab = store.getState().activeTab;
		const tabInfo = store.getState().config.tabs.find(tab => tab.id === activeTab);

		if (!tabInfo) {
			return;
		}

		openSurreal({
			connection: tabInfo.connection,
			silent: silent,
			onConnect() {
				setIsConnecting(false);
				setIsOnline(true)
			},
			onDisconnect() {
				setIsConnecting(false);
				setIsOnline(false)
			},
			onError(code, message) {
				if (code === 1005) {
					return; // Client closed connection
				}

				const reason = `${message || 'Unknown reason'} (${code})`;

				showNotification({
					disallowClose: true,
					color: 'red.4',
					bg: 'red.6',
					message: (
						<div>
							<Text color="white" weight={600}>Connection Closed</Text>
							<Text color="white" opacity={0.8} size="sm">{reason}</Text>
						</div>
					)
				});
			},
		});

		setIsConnecting(true);
	});

	const sendQuery = useStable(async (e?: MouseEvent) => {
		e?.stopPropagation();

		if (!isOnline) {
			showNotification({
				message: 'You must be connected to send a query',
			});
			return;
		}

		const { query, name } = tabInfo!;
		const variables = tabInfo!.variables ? JSON.parse(tabInfo!.variables) : undefined;

		try {
			const response = await getSurreal()?.query(query, variables);

			store.dispatch(actions.updateTab({
				id: activeTab!,
				lastResponse: response
			}));
		} catch(err: any) {
			store.dispatch(actions.updateTab({
				id: activeTab!,
				lastResponse: [{
					status: 'ERR',
					detail: err.message
				}]
			}));
		}

		store.dispatch(actions.addHistoryEntry({
			id: uid(5),
			query: query,
			tabName: name,
			timestamp: Date.now()
		}));

		await updateConfig();
	});

	const saveInfo = useStable(async () => {
		store.dispatch(actions.updateTab({
			id: activeTab!,
			connection: {
				...infoDetails
			}
		}));

		if (isOnline) {
			getSurreal()?.close();
		}

		await updateConfig();
		closeEditingInfo();

		if (autoConnect) {
			openConnection();
		}
	});

	const closeConnection = useStable(() => {
		getSurreal()?.close();
		setIsConnecting(false);
		setIsOnline(false);
	});

	useEffect(() => {
		if (autoConnect) {
			openConnection(undefined, true);
		}
	}, [autoConnect, activeTab]);

	const revealConsole = useStable((e: MouseEvent) => {
		e.stopPropagation();
		store.dispatch(actions.setConsoleEnabled(true));
	});

	const showConsole = enableConsole && (servePending || isServing);
	const borderColor = theme.fn.themeColor(isOnline ? 'surreal' : 'light');

	return (
		<div className={classes.root}>
			<TabBar
				openConnection={openConnection}
				closeConnection={closeConnection}
				onCreateTab={createNewTab}
				onSwitchTab={closeConnection}
			/>

			{activeTab ? (
				<>
					<Group p="xs">
						<Image
							style={{ pointerEvents: 'none', userSelect: 'none' }}
							src={surrealistLogo}
							width={42}
						/>

						<Paper
							className={classes.input}
							onClick={openInfoEditor}
							style={{ borderColor: borderColor }}
						>
							{!isOnline ? (
								<Paper
									bg="light"
									px="xs"
								>
									<Text
										color="white"
										size="xs"
										py={2}
										weight={600}
									>
										OFFLINE
									</Text>
								</Paper>
							) : (
								<Paper
									bg={isLight ? 'light.0' : 'light.6'}
									c={isLight ? 'light.6' : 'white'}
									px="xs"
								>
									{tabInfo!.connection.username}
								</Paper>
							)}
							<Text color={isLight ? 'light.6' : 'white'}>
								{tabInfo!.connection.endpoint}
							</Text>
							<Spacer />
							{(servePending || isServing) && !showConsole && (
								<ActionIcon
									onClick={revealConsole}
									title="Reveal console"
								>
									<Icon color="light.4" path={mdiConsole} />
								</ActionIcon>
							)}
							{isOnline ? (
								<Button
									color="surreal"
									onClick={sendQuery}
									className={classes.sendButton}
									title="Send Query (F9)"
								>
									Send Query
								</Button>
							) : (
								<Button
									color="light"
									style={{ borderRadius: 0 }}
									onClick={openConnection}
								>
									{isConnecting ? 'Connecting...' : 'Connect'}
								</Button>
							)}
						</Paper>
					</Group>

					<Box p="xs" className={classes.content}>
						<Splitter
							minSize={100}
							direction="vertical"
							endPane={showConsole && (
								<ConsolePane />
							)}
						>
							<Splitter
								minSize={300}
								direction="horizontal"
								startPane={
									<Splitter
										minSize={120}
										direction="vertical"
										endPane={
											<VariablesPane />
										}
									>
										<QueryPane
											isConnected={isOnline}
											onExecuteQuery={sendQuery}
										/>
									</Splitter>
								}
								endPane={!enableListing ? null : queryListing == 'history' ? (
									<HistoryPane
										onExecuteQuery={sendQuery}
									/>
								) : (
									<FavoritesPane
										onExecuteQuery={sendQuery}
									/>
								)}
							>
								<ResultPane />
							</Splitter>
						</Splitter>
					</Box>
				</>
			) : (
				<Center h="100%">
					<div>
						<Image
							className={classes.emptyImage}
							src={surrealistLogo}
							width={120}
							mx="auto"
						/>
						<Title color="light" align="center" mt="md">
							Surrealist
						</Title>
						<Text color="light.2" align="center">
							Open or create a new tab to continue
						</Text>
						<Center mt="lg">
							<Button size="xs" onClick={createNewTab}>
								Create tab
							</Button>
						</Center>
					</div>
				</Center>
			)}

			{/* ANCHOR Connection details modal */}
			<Modal
				opened={editingInfo}
				onClose={closeEditingInfo}
				title={
					<Title size={16} color={isLight ? 'light.6' : 'white'}>
						Connection details
					</Title>
				}
			>
				<Form onSubmit={saveInfo}>
					<Stack>
						<TextInput
							style={{ flex: 1 }}
							label="Endpoint URL"
							value={infoDetails.endpoint}
							onChange={(e) => setInfoDetails(draft => {
								draft.endpoint = e.target.value
							})}
							autoFocus
						/>
						<TextInput
							style={{ flex: 1 }}
							label="Username"
							value={infoDetails.username}
							onChange={(e) => setInfoDetails(draft => {
								draft.username = e.target.value
							})}
						/>
						<TextInput
							style={{ flex: 1 }}
							label="Password"
							value={infoDetails.password}
							onChange={(e) => setInfoDetails(draft => {
								draft.password = e.target.value
							})}
						/>
						<TextInput
							style={{ flex: 1 }}
							label="Namespace (optional)"
							value={infoDetails.namespace}
							onChange={(e) => setInfoDetails(draft => {
								draft.namespace = e.target.value
							})}
						/>
						<TextInput
							style={{ flex: 1 }}
							label="Database (optional)"
							value={infoDetails.database}
							onChange={(e) => setInfoDetails(draft => {
								draft.database = e.target.value
							})}
						/>
						<Group>
							<Button color="light" onClick={closeEditingInfo}>
								Close
							</Button>
							<Spacer />
							<Button type="submit">
								Save
							</Button>
						</Group>
					</Stack>
				</Form>
			</Modal>
		</div>
	)
}
