import classes from "../../style.module.scss";
import { ActionIcon, Box, Button, Flex, Group, Menu, Modal, Stack, Text, TextInput, Tooltip } from "@mantine/core";
import { HTMLAttributes, MouseEvent, useMemo } from "react";
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
import { Entry, EntryProps } from "../../../Entry";
import { useContextMenu } from "mantine-contextmenu";
import { useIntent } from "~/hooks/url";
import { USER_ICONS } from "~/util/user-icons";
import { openConnection } from "~/connection";
import { useCompatHotkeys } from "~/hooks/hotkey";
import { Connection } from "~/types";
import { mdiFolderPlusOutline } from "@mdi/js";

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

export function Connections() {
	const { openConnectionCreator } = useInterfaceStore.getState();
	const { setActiveConnection, addConnectionGroup } = useConfigStore.getState();

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
			name: "New group",
			connections: []
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
										leftSection={<Icon path={mdiFolderPlusOutline} />}
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

					{groups.map((group) => (
						<Box>
							<Group mb={4}>
								<Text c="slate.2" fz="lg" fw={500}>
									{group.name}
								</Text>
								<Spacer />
							</Group>
							<Stack gap={6}>
								{group.connections.map((con) => (
									<ConnectionItem
										key={con.id}
										connection={con}
										active={connection?.id ?? ""}
										onClose={listingHandle.close}
									/>
								))}
							</Stack>
						</Box>
					))}

					<Box>
						<Group mb={4}>
							<Text c="slate.2" fz="lg" fw={500}>
								Connections
							</Text>
							<Spacer />
						</Group>
						<Stack gap={6}>
							{search && filtered.length === 0 ? (
								<Text c="dimmed">
									No results found
								</Text>
							) : filtered.length === 0 && (
								<Text c="dimmed">
									No connections configured yet
								</Text>
							)}
							{filtered.map((con) => (
								<ConnectionItem
									key={con.id}
									connection={con}
									active={connection?.id ?? ""}
									onClose={listingHandle.close}
								/>
							))}
						</Stack>
					</Box>
				</Stack>
			</Modal>
		</>
	);
}
