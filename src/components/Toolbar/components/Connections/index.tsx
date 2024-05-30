import classes from "../../style.module.scss";
import { ActionIcon, Box, Button, Flex, Group, Menu, Modal, Stack, Text, TextInput, Tooltip } from "@mantine/core";
import { HTMLAttributes, MouseEvent, ReactNode, useMemo } from "react";
import { useConnection, useConnections } from "~/hooks/connection";
import { Icon } from "../../../Icon";
import { useDatabaseStore } from "~/stores/database";
import { useStable } from "~/hooks/stable";
import { iconChevronDown, iconCircle, iconCopy, iconDelete, iconEdit, iconFolderPlus, iconPlus, iconSearch, iconSurreal } from "~/util/icons";
import { Spacer } from "../../../Spacer";
import { useInterfaceStore } from "~/stores/interface";
import { useConfigStore } from "~/stores/config";
import { SANDBOX } from "~/constants";
import { useDisclosure, useInputState } from "@mantine/hooks";
import { Y_SLIDE_TRANSITION, newId, showError, updateTitle } from "~/util/helpers";
import { Entry, EntryProps } from "../../../Entry";
import { useContextMenu } from "mantine-contextmenu";
import { useIntent } from "~/hooks/url";
import { USER_ICONS } from "~/util/user-icons";
import { openConnection } from "~/connection";
import { useCompatHotkeys } from "~/hooks/hotkey";
import { Connection } from "~/types";
import { EditableText } from "~/components/EditableText";
import { group } from "radash";

const UNGROUPED = Symbol("ungrouped");

interface ConnectionItemProps extends EntryProps, Omit<HTMLAttributes<HTMLButtonElement>, 'style' | 'color'> {
	connection: Connection;
	active: string;
	onClose: () => void;
}

function ConnectionItem({
	connection,
	active,
	onClose,
	...other
}: ConnectionItemProps) {
	const { showContextMenu } = useContextMenu();
	const { openConnectionEditor} = useInterfaceStore.getState();
	const { setActiveConnection, addConnection, removeConnection } = useConfigStore.getState();
	const isActive = connection.id === active;

	const activate = useStable(() => {
		setActiveConnection(connection.id);
		updateTitle();
		onClose();
	});

	const modify = useStable((e: MouseEvent) => {
		e.stopPropagation();
		onClose();
		openConnectionEditor(connection.id);
	});

	return (
		<Entry
			key={connection.id}
			isActive={isActive}
			className={classes.connection}
			onClick={activate}
			leftSection={
				<Icon path={USER_ICONS[connection.icon ?? 0]} />
			}
			rightSection={
				<ActionIcon
					component="div"
					className={classes.connectionOptions}
					onClick={modify}
					aria-label="Edit connection"
				>
					<Icon path={iconEdit} />
				</ActionIcon>
			}
			onContextMenu={showContextMenu([
				{
					key: "edit",
					title: "Edit",
					icon: <Icon path={iconEdit} />,
					onClick: modify,
				},
				{
					key: "duplicate",
					title: "Duplicate",
					icon: <Icon path={iconCopy} />,
					onClick: () => addConnection({
						...connection,
						id: newId()
					}),
				},
				{
					key: "delete",
					title: "Delete connection",
					color: "pink.7",
					icon: <Icon path={iconDelete} />,
					onClick: () => removeConnection(connection.id),
				}
			])}
			{...other}
		>
			<Text truncate>
				{connection.name}
			</Text>
		</Entry>
	);
}

interface ConnectionListProps {
	title: ReactNode;
	connections: Connection[];
	active: string;
	className?: string;
	onClose: () => void;
}

function ConnectionList({
	title,
	connections,
	active,
	className,
	onClose
}: ConnectionListProps) {
	const connectionList = useMemo(() => {
		return connections.sort((a, b) => a.name.localeCompare(b.name));
	}, [connections]);

	return (
		<Box className={className}>
			<Group mb={4}>
				{title}
			</Group>
			{connectionList.length === 0 ? (
				<Text c="slate" fz="sm" mt={-2}>
					No connections
				</Text>
			) : (
				<Stack gap={6} mih={10}>
					{connectionList.map((con) => (
						<ConnectionItem
							key={con.id}
							connection={con}
							active={active}
							onClose={onClose}
						/>
					))}
				</Stack>
			)}
		</Box>
	);
}

export function Connections() {
	const { openConnectionCreator } = useInterfaceStore.getState();
	const { setActiveConnection, addConnectionGroup, updateConnectionGroup, removeConnectionGroup } = useConfigStore.getState();

	const [isListing, listingHandle] = useDisclosure();
	const [search, setSearch] = useInputState("");
	const connections = useConnections();
	const connection = useConnection();

	const groups = useConfigStore((s) => s.connectionGroups);
	const isConnected = useDatabaseStore((s) => s.isConnected);
	const isConnecting = useDatabaseStore((s) => s.isConnecting);
	const remoteVersion = useDatabaseStore((s) => s.version);

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

	const newConnection = useStable(() => {
		listingHandle.close();
		openConnectionCreator();
	});

	const newGroup = useStable(() => {
		addConnectionGroup({
			id: newId(),
			name: `Group ${groups.length + 1}`
		});
	});

	const openSandbox = useStable(() => {
		setActiveConnection(SANDBOX);
		updateTitle();
		listingHandle.close();
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

	const groupsList = useMemo(() => {
		return groups.sort((a, b) => a.name.localeCompare(b.name));
	}, [groups]);

	const grouped = group(filtered, (con) => con.group ?? UNGROUPED) || {};
	const ungrouped = grouped[UNGROUPED] ?? [];

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
				<Stack gap="xl">
					<Box>
						<Flex gap="sm">
							<TextInput
								placeholder="Search..."
								value={search}
								spellCheck={false}
								onChange={setSearch}
								variant="unstyled"
								autoFocus
								flex={1}
								styles={{
									input: {
										border: "1px solid var(--mantine-color-slate-6)"
									}
								}}
								leftSection={
									<Icon path={iconSearch} />
								}
							/>
							<Menu position="right-start">
								<Menu.Target>
									<ActionIcon
										aria-label="Add..."
										size={36}
										radius="md"
									>
										<Icon path={iconPlus} />
									</ActionIcon>
								</Menu.Target>
								<Menu.Dropdown>
									<Menu.Item
										leftSection={<Icon path={iconPlus} />}
										onClick={newConnection}
									>
										New Connection
									</Menu.Item>
									<Menu.Item
										leftSection={<Icon path={iconFolderPlus} />}
										onClick={newGroup}
									>
										New Group
									</Menu.Item>
								</Menu.Dropdown>
							</Menu>
						</Flex>

						<Entry
							mt="md"
							isActive={isSandbox}
							leftSection={
								<Group gap="xs">
									<Icon path={iconSurreal} size={1.2} noStroke />
									Sandbox
								</Group>
							}
							onClick={openSandbox}
						/>
					</Box>

					{groupsList.map((group) => (
						<ConnectionList
							key={group.id}
							connections={grouped[group.id] ?? []}
							active={connection?.id ?? ""}
							onClose={listingHandle.close}
							className={classes.group}
							title={
								<>
									<EditableText
										value={group.name}
										onChange={(name) => updateConnectionGroup({ id: group.id, name })}
										c="bright"
										fz="lg"
										fw={500}
									/>
									<Spacer />
									<Tooltip
										label="Remove group"
									>
										<ActionIcon
											className={classes.groupRemove}
											aria-label="Remove group"
											onClick={() => removeConnectionGroup(group.id)}
											variant="subtle"
											size="sm"
										>
											<Icon path={iconDelete} size="sm" />
										</ActionIcon>
									</Tooltip>
								</>
							}
						/>
					))}

					{(ungrouped.length > 0 || groups.length === 0) && (
						<ConnectionList
							connections={ungrouped}
							active={connection?.id ?? ""}
							onClose={listingHandle.close}
							title={
								<Text c="bright" fz="lg" fw={500}>
									Connections
								</Text>
							}
						/>
					)}
				</Stack>
			</Modal>
		</>
	);
}
