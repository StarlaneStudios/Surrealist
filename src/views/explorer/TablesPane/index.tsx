import classes from "./style.module.scss";
import { ActionIcon, Badge, Divider, ScrollArea, Stack, Text, TextInput, Tooltip } from "@mantine/core";
import { useMemo } from "react";
import { useStable } from "~/hooks/stable";
import { Icon } from "~/components/Icon";
import { ContentPane } from "~/components/Pane";
import { useIsLight } from "~/hooks/theme";
import { useInputState } from "@mantine/hooks";
import { extractEdgeRecords, syncDatabaseSchema } from "~/util/schema";
import { useHasSchemaAccess, useTables } from "~/hooks/schema";
import { sort } from "radash";
import { useActiveConnection, useIsConnected } from "~/hooks/connection";
import { Spacer } from "~/components/Spacer";
import { useConfigStore } from "~/stores/config";
import { Importer } from "../Importer";
import { Exporter } from "../Exporter";
import { useContextMenu } from "mantine-contextmenu";
import { iconDelete, iconExplorer, iconPin, iconPinOff, iconPlus, iconRelation, iconSearch, iconTable } from "~/util/icons";
import { Entry } from "~/components/Entry";
import { useInterfaceStore } from "~/stores/interface";
import { useConfirmation } from "~/providers/Confirmation";
import { tb } from "~/util/helpers";
import { executeQuery } from "~/connection";
import { useShallow } from 'zustand/react/shallow';

export interface TablesPaneProps {
	activeTable: string | undefined;
	onTableSelect: (table: string) => void;
	onCreateRecord: (table: string) => void;
}

export function TablesPane({ activeTable, onTableSelect, onCreateRecord }: TablesPaneProps) {
	const { openTableCreator } = useInterfaceStore(
		useShallow(state => ({ openTableCreator: state.openTableCreator }))
	);

	const toggleTablePin = useConfigStore((s) => s.toggleTablePin);
	const isLight = useIsLight();
	const [search, setSearch] = useInputState("");
	const hasAccess = useHasSchemaAccess();
	const connection = useActiveConnection();
	const isConnected = useIsConnected();
	const schema = useTables();

	const { showContextMenu } = useContextMenu();

	const isPinned = useStable((table: string) => {
		return connection.pinnedTables.includes(table);
	});

	const tablesFiltered = useMemo(() => {
		const needle = search.toLowerCase();
		const tables = search ? schema.filter((table) => table.schema.name.toLowerCase().includes(needle)) : schema;

		return sort(tables, (table) => {
			const [isEdge] = extractEdgeRecords(table);
			const pinned = isPinned(table.schema.name);

			return Number(isEdge) - (pinned ? 999 : 0);
		});
	}, [schema, search, isPinned]);

	const togglePinned = useStable((table: string) => {
		if (table && connection) {
			toggleTablePin(table);
		}
	});

	const removeTable = useConfirmation({
		message: "You are about to remove this table and all data contained within it. This action cannot be undone.",
		confirmText: "Remove",
		onConfirm:  async (table: string) => {
			await executeQuery(`REMOVE TABLE ${tb(table)}`);
			await syncDatabaseSchema({
				tables: [table]
			});

			if (activeTable == table) {
				onTableSelect("");
			}
		}
	});

	return (
		<ContentPane
			title="Tables"
			icon={iconExplorer}
			style={{ flexShrink: 0 }}
			leftSection={
				schema.length > 0 && (
					<Badge
						color={isLight ? "slate.0" : "slate.9"}
						radius="sm"
						c="inherit"
					>
						{schema.length}
					</Badge>
				)
			}
			rightSection={
				<Tooltip label="New table">
					<ActionIcon
						onClick={openTableCreator}
						aria-label="Create new table"
						disabled={!isConnected}
					>
						<Icon path={iconPlus} />
					</ActionIcon>
				</Tooltip>
			}
		>
			<Stack
				pos="absolute"
				top={0}
				left={12}
				right={12}
				bottom={12}
				gap={0}
			>
				<ScrollArea
					classNames={{
						viewport: classes.scroller
					}}
				>
					<Stack gap="xs" pb="md">
						{isConnected && schema.length > 0 && (
							<TextInput
								placeholder="Search tables..."
								leftSection={<Icon path={iconSearch} />}
								value={search}
								spellCheck={false}
								onChange={setSearch}
								variant="unstyled"
								autoFocus
							/>
						)}

						{isConnected ? (tablesFiltered.length === 0 && (
							<Text c="slate" ta="center" mt="lg">
								{hasAccess ? "No tables found" : "Unsupported auth mode"}
							</Text>
						)) : (
							<Text c="slate" ta="center" mt="lg">
								Not connected
							</Text>
						)}

						{tablesFiltered.map((table) => {
							const isActive = activeTable == table.schema.name;
							const isPinned = connection.pinnedTables.includes(table.schema.name);
							const [isEdge] = extractEdgeRecords(table);

							return (
								<Entry
									key={table.schema.name}
									isActive={isActive}
									onClick={() => onTableSelect(table.schema.name)}
									onContextMenu={showContextMenu([
										{
											key: 'open',
											title: "View table records",
											icon: <Icon path={iconTable} />,
											onClick: () => onTableSelect(table.schema.name)
										},
										{
											key: 'new',
											title: "Create new record",
											icon: <Icon path={iconPlus} />,
											onClick: () => onCreateRecord(table.schema.name)
										},
										{
											key: 'pin',
											title: isPinned ? "Unpin table" : "Pin table",
											icon: <Icon path={isPinned ? iconPinOff : iconPin} />,
											onClick: () => togglePinned(table.schema.name)
										},
										{
											key: 'remove',
											title: "Remove table",
											color: "pink.7",
											icon: <Icon path={iconDelete} />,
											onClick: () => removeTable(table.schema.name)
										}
									])}
									leftSection={
										<Icon path={isEdge ? iconRelation : iconTable} />
									}
									rightSection={
										isPinned && (
											<Icon
												title="Pinned table"
												path={iconPin}
												size="sm"
											/>
										)
									}
								>
									<Text
										style={{
											textOverflow: 'ellipsis',
											overflow: 'hidden'
										}}
									>
										{table.schema.name}
									</Text>
								</Entry>
							);
						})}
					</Stack>
				</ScrollArea>
				<Spacer />
				<Divider mb="xs" />
				<Exporter />
				<Importer />
			</Stack>
		</ContentPane>
	);
}
