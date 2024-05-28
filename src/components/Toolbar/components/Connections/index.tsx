import classes from "../../style.module.scss";
import { ActionIcon, Box, Button, Group, Modal, Stack, Text, TextInput, Tooltip } from "@mantine/core";
import { useMemo } from "react";
import { useConnection, useConnections } from "~/hooks/connection";
import { Icon } from "../../../Icon";
import { useDatabaseStore } from "~/stores/database";
import { useStable } from "~/hooks/stable";
import { iconChevronDown, iconCircle, iconCopy, iconDelete, iconEdit, iconPlus, iconSearch, iconSurreal } from "~/util/icons";
import { Spacer } from "../../../Spacer";
import { useInterfaceStore } from "~/stores/interface";
import { useConfigStore } from "~/stores/config";
import { SANDBOX } from "~/constants";
import { useDisclosure, useInputState } from "@mantine/hooks";
import { Y_SLIDE_TRANSITION, newId, showError, updateTitle } from "~/util/helpers";
import { Entry } from "../../../Entry";
import { useContextMenu } from "mantine-contextmenu";
import { useIntent } from "~/hooks/url";
import { USER_ICONS } from "~/util/user-icons";
import { openConnection } from "~/connection";
import { useCompatHotkeys } from "~/hooks/hotkey";
import { useShallow } from 'zustand/react/shallow';

export function Connections() {
	const { openConnectionCreator, openConnectionEditor } = useInterfaceStore(
		useShallow(state => ({ openConnectionCreator: state.openConnectionCreator, openConnectionEditor: state.openConnectionEditor }))
	);
	const { setActiveConnection, addConnection, removeConnection } = useConfigStore(
		useShallow(state => ({
			setActiveConnection: state.setActiveConnection,
			addConnection: state.addConnection,
			removeConnection: state.removeConnection,
		}))
	);
	const { showContextMenu } = useContextMenu();

	const [isListing, listingHandle] = useDisclosure();
	const [search, setSearch] = useInputState("");
	const connections = useConnections();
	const connection = useConnection();

	const isConnected = useDatabaseStore((s) => s.isConnected);
	const isConnecting = useDatabaseStore((s) => s.isConnecting);
	const remoteVersion = useDatabaseStore((s) => s.version);

	const createNew = useStable(() => {
		listingHandle.close();
		openConnectionCreator();
	});

	const activate = useStable((id: string) => {
		listingHandle.close();
		setActiveConnection(id);
		updateTitle();
	});

	const editConnection = useStable((id: string, e: React.MouseEvent) => {
		e.stopPropagation();
		listingHandle.close();
		openConnectionEditor(id);
	});

	const filtered = useMemo(() => {
		const needle = search.trim().toLocaleLowerCase();

		return connections.filter((con) =>
			con.name.toLowerCase().includes(needle)
			|| con.connection.hostname.toLowerCase().includes(needle)
		);
	}, [connections, search]);

	const connect = useStable(() => {
		openConnection().catch(err => {
			showError({
				title: 'Connection failed',
				subtitle: err.message
			});
		});
	});

	const duplicateConnection = useStable((id: string) => {
		const con = connections.find((c) => c.id === id);

		if (con) {
			addConnection({
				...con,
				id: newId()
			});
		}
	});

	const isSandbox = connection?.id === SANDBOX;

	useIntent("open-connections", ({ search }) => {
		if (search) {
			setSearch(search);
		}

		listingHandle.open();
	});

	useCompatHotkeys([
		["mod+L", listingHandle.open]
	]);

	return (
		<>
			{connection ? (
				<Button.Group>
					<Button
						variant="light"
						color="slate"
						onClick={listingHandle.toggle}
						leftSection={isSandbox ? (
							<Icon path={iconSurreal} size={1.2} noStroke />
						) : (
							<Icon path={USER_ICONS[connection.icon ?? 0]} size={0.85} mt={-0} />
						)}
						rightSection={
							isConnected && (
								<Tooltip
									label={
										<Stack gap={0}>
											<Group gap="xs">
												<Text c="slate.1">Version:</Text>
												<Text>{remoteVersion}</Text>
											</Group>
											<Group gap="xs">
												<Text c="slate.1">Protocol:</Text>
												<Text>{connection.connection.protocol}</Text>
											</Group>
										</Stack>
									}
								>
									<div>
										<Icon
											path={iconCircle}
											size="xl"
											mr={-4}
											color="green"
										/>
									</div>
								</Tooltip>
							)
						}
					>
						<Text truncate fw={600} maw={200}>
							{connection.name}
						</Text>
					</Button>
					{!isConnected && (
						<Button
							variant="gradient"
							onClick={connect}
							loading={isConnecting}
						>
							Connect
						</Button>
					)}
				</Button.Group>
			) : (
				<Button
					variant="light"
					color="slate"
					onClick={listingHandle.toggle}
					rightSection={
						<Icon path={iconChevronDown} />
					}
				>
					Select a connection
				</Button>
			)}

			<Modal
				opened={isListing}
				onClose={listingHandle.close}
				transitionProps={{ transition: Y_SLIDE_TRANSITION }}
				centered={false}
			>
				<Stack>
					<TextInput
						placeholder="Search..."
						value={search}
						spellCheck={false}
						onChange={setSearch}
						variant="outline"
						color="red"
						autoFocus
						leftSection={
							<Icon path={iconSearch} />
						}
					/>

					{!search && (
						<Entry
							isActive={isSandbox}
							leftSection={
								<Group gap="xs">
									<Icon path={iconSurreal} size={1.2} noStroke />
									Sandbox
								</Group>
							}
							onClick={() => activate(SANDBOX)}
						/>
					)}

					<Box>
						<Group mb={4}>
							<Text c="slate.2" fz="lg">
								Connections
							</Text>
							<Spacer />
							<ActionIcon
								mr={7}
								onClick={createNew}
								aria-label="Create new connection"
							>
								<Icon path={iconPlus} />
							</ActionIcon>
						</Group>
						<Stack gap="sm">
							{search && filtered.length === 0 ? (
								<Text c="dimmed">
									No results found
								</Text>
							) : filtered.length === 0 && (
								<Text c="dimmed">
									No connections configured yet
								</Text>
							)}

							{filtered.map((con) => {
								const isActive = connection?.id === con.id;

								return (
									<Entry
										key={con.id}
										isActive={isActive}
										className={classes.connection}
										onClick={() => activate(con.id)}
										leftSection={
											<Icon path={USER_ICONS[con.icon ?? 0]} />
										}
										rightSection={
											<ActionIcon
												component="div"
												className={classes.connectionOptions}
												onClick={(e) => editConnection(con.id, e)}
												aria-label="Edit connection"
											>
												<Icon path={iconEdit} />
											</ActionIcon>
										}
										onContextMenu={showContextMenu([
											{
												key: "duplicate",
												title: "Duplicate",
												icon: <Icon path={iconCopy} />,
												onClick: () => duplicateConnection(con.id),
											},
											{
												key: "delete",
												title: "Delete connection",
												color: "pink.7",
												icon: <Icon path={iconDelete} />,
												onClick: () => removeConnection(con.id),
											}
										])}
									>
										<Text truncate>
											{con.name}
										</Text>
									</Entry>
								);
							})}
						</Stack>
					</Box>
				</Stack>
			</Modal>
		</>
	);
}
