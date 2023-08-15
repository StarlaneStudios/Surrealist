import classes from "./style.module.scss";
import {
	ActionIcon,
	Box,
	Button,
	Collapse,
	Divider,
	Group,
	Modal,
	Paper,
	ScrollArea,
	SimpleGrid,
	Stack,
	Text,
	Textarea,
	TextInput,
	Title,
	useMantineTheme,
} from "@mantine/core";
import { mdiChevronDown, mdiChevronUp, mdiClose, mdiMagnify, mdiPencil, mdiPlay, mdiPlus, mdiStar } from "@mdi/js";
import { Fragment, useMemo, useState } from "react";
import { useIsLight } from "~/hooks/theme";
import { actions, store, useStoreValue } from "~/store";
import { useStable } from "~/hooks/stable";
import { useInputState } from "@mantine/hooks";
import { FavoritesEntry, SurrealistTab } from "~/types";
import { useActiveTab } from "~/hooks/environment";
import { uid } from "radash";
import { updateConfig } from "~/util/helpers";
import { Sortable } from "~/components/Sortable";
import { Panel } from "~/components/Panel";
import { Icon } from "~/components/Icon";
import { Spacer } from "~/components/Spacer";
import { Form } from "~/components/Form";

export interface FavoritesPaneProps {
	onExecuteQuery: () => void;
}

export function FavoritesPane(props: FavoritesPaneProps) {
	const isLight = useIsLight();
	const activeTab = useActiveTab();
	const entries = useStoreValue((state) => state.config.queryFavorites);
	const query = activeTab?.query?.trim() || "";

	const [search, setSearch] = useInputState("");
	const [activeEntry, setActiveEntry] = useState("");
	const [queryName, setQueryName] = useInputState("");
	const [queryText, setQueryText] = useInputState("");
	const [isEditing, setIsEditing] = useState(false);
	const [editingId, setEditingId] = useState("");

	const openSaveBox = useStable(() => {
		setIsEditing(true);
		setQueryName("");
		setQueryText(query);
		setEditingId("");
	});

	const closeSaving = useStable(() => {
		setIsEditing(false);
	});

	const saveQuery = useStable(() => {
		setIsEditing(false);

		store.dispatch(
			actions.saveFavoritesEntry({
				id: editingId || uid(5),
				name: queryName,
				query: queryText,
			})
		);
	});

	const filtered = useMemo(() => {
		const needle = search.toLowerCase();
		return entries.filter(
			(entry) => entry.name.toLowerCase().includes(needle) || entry.query.toLowerCase().includes(needle)
		);
	}, [search, entries]);

	const activateEntry = useStable((id: string) => {
		setActiveEntry(id);
	});

	const openEditor = useStable((id: string) => {
		const entry = entries.find((entry) => entry.id === id);

		if (!entry) {
			return;
		}

		setIsEditing(true);
		setQueryName(entry.name);
		setQueryText(entry.query);
		setEditingId(id);
	});

	const deleteEntry = useStable(() => {
		setIsEditing(false);
		store.dispatch(actions.removeFavoritesEntry(editingId));
	});

	const saveOrder = useStable((favorites: FavoritesEntry[]) => {
		store.dispatch(actions.setFavorites(favorites));
	});

	const closeActive = useStable(() => {
		setActiveEntry("");
	});

	const historyList = useMemo(() => {
		if (filtered.length === 0) {
			return (
				<Text align="center" mt="sm">
					No results found
				</Text>
			);
		}

		return (
			<Sortable
				items={filtered}
				onSorting={closeActive}
				onSorted={saveOrder}
				constraint={{
					distance: 12,
				}}>
				{({ index, item, handleProps }) => (
					<Fragment key={index}>
						<FavoriteRow
							entry={item}
							isActive={activeEntry === item.id}
							isLight={isLight}
							activeTab={activeTab}
							enableDrag={!search}
							handleProps={handleProps}
							onExecuteQuery={props.onExecuteQuery}
							onActivate={activateEntry}
							onEdit={openEditor}
						/>
						{index !== filtered.length - 1 && <Divider color={isLight ? "light.0" : "dark.5"} />}
					</Fragment>
				)}
			</Sortable>
		);
	}, [activeEntry, activeTab, filtered, isLight]);

	return (
		<Panel
			title="Saved queries"
			icon={mdiStar}
			rightSection={<FavoritesActions activeTab={activeTab} onCreate={openSaveBox} />}>
			<ScrollArea
				style={{
					position: "absolute",
					inset: 12,
					top: 0,
				}}>
				<TextInput
					placeholder="Search queries..."
					icon={<Icon path={mdiMagnify} />}
					value={search}
					onChange={setSearch}
					mb="lg"
				/>

				<Stack spacing="sm">{historyList}</Stack>
			</ScrollArea>

			<Modal
				opened={isEditing}
				onClose={closeSaving}
				trapFocus={false}
				title={
					<Title size={16} color={isLight ? "light.6" : "white"}>
						{editingId ? "Edit query" : "Save query"}
					</Title>
				}>
				<Form onSubmit={saveQuery}>
					<Stack>
						<TextInput placeholder="Enter query name" value={queryName} onChange={setQueryName} autoFocus />
						<Textarea placeholder="SELECT * FROM ..." value={queryText} onChange={setQueryText} minRows={8} />
						<Group>
							<Button color={isLight ? "light.5" : "light.3"} variant="light" onClick={closeSaving}>
								Close
							</Button>
							<Spacer />
							{editingId && (
								<Button color="red.6" variant="subtle" onClick={deleteEntry}>
									Delete
								</Button>
							)}
							<Button type="submit">Save</Button>
						</Group>
					</Stack>
				</Form>
			</Modal>
		</Panel>
	);
}

interface HistoryRowProps {
	isActive: boolean;
	entry: FavoritesEntry;
	isLight: boolean;
	activeTab: SurrealistTab | undefined;
	enableDrag: boolean;
	handleProps: Record<string, any>;
	onExecuteQuery: () => void;
	onActivate: (id: string) => void;
	onEdit: (id: string) => void;
}

function FavoriteRow(props: HistoryRowProps) {
	const { isActive, activeTab, entry, isLight, enableDrag, handleProps, onExecuteQuery, onActivate, onEdit } = props;

	const theme = useMantineTheme();

	const editQuery = useStable(() => {
		onEdit(entry.id);
	});

	const executeQuery = useStable(() => {
		store.dispatch(
			actions.updateTab({
				id: activeTab?.id,
				query: entry.query,
			})
		);

		setTimeout(onExecuteQuery, 0);
	});

	const handleClick = useStable((e: any) => {
		e.preventDefault();

		if (isActive) {
			onActivate("");
		} else {
			onActivate(entry.id);
		}
	});

	const openQuery = useStable(() => {
		store.dispatch(
			actions.openTabCreator({
				name: entry.name.slice(0, 25),
				query: entry.query,
			})
		);
	});

	return (
		<Box
			color={isLight ? "light.0" : "dark.4"}
			className={classes.entry}
			style={{ borderColor: theme.fn.themeColor(isLight ? "light.0" : "dark.3") }}>
			<Group
				mb="sm"
				noWrap
				className={classes.entryHeader}
				onClick={handleClick}
				title="Drag to reorder"
				{...(enableDrag ? handleProps : {})}>
				<Text c="surreal" weight={500}>
					{entry.name}
				</Text>
				<Spacer />
				<Icon path={isActive ? mdiChevronDown : mdiChevronUp} style={{ flexShrink: 0 }} />
			</Group>

			<Collapse in={isActive}>
				<Paper withBorder p="xs">
					<Text
						ff="JetBrains Mono"
						c={isLight ? "black" : "white"}
						className={classes.queryText}
						lineClamp={8}
						weight={600}>
						{entry.query}
					</Text>
				</Paper>

				<SimpleGrid cols={3} mt="xs" pb="xs" spacing="xs">
					<Button size="xs" variant="light" color="violet" radius="sm" title="Edit query" onClick={editQuery}>
						<Icon path={mdiPencil} color="violet" />
					</Button>
					<Button size="xs" variant="light" color="pink" radius="sm" title="Run query" onClick={executeQuery}>
						<Icon path={mdiPlay} color="pink" />
					</Button>
					<Button size="xs" variant="light" color="blue" radius="sm" title="Open in new session" onClick={openQuery}>
						<Icon path={mdiPlus} color="blue" />
					</Button>
				</SimpleGrid>
			</Collapse>
		</Box>
	);
}

interface FavoritesActionsProps {
	activeTab: SurrealistTab | undefined;
	onCreate: () => void;
}

function FavoritesActions(props: FavoritesActionsProps) {
	const query = props.activeTab?.query?.trim() || "";
	const canSave = query.length > 0;

	const hideFavorites = useStable(() => {
		store.dispatch(actions.setShowQueryListing(false));
		updateConfig();
	});

	return (
		<Group align="center">
			{canSave && (
				<ActionIcon onClick={props.onCreate} title="Save current query">
					<Icon color="light.4" path={mdiPlus} />
				</ActionIcon>
			)}
			<ActionIcon onClick={hideFavorites} title="Hide favorites">
				<Icon color="light.4" path={mdiClose} />
			</ActionIcon>
		</Group>
	);
}
