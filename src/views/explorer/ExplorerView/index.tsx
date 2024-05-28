import { ExplorerPane } from "../ExplorerPane";
import { useState } from "react";
import { TablesPane } from "../TablesPane";
import { CreatorDrawer } from "../CreatorDrawer";
import { useDisclosure } from "@mantine/hooks";
import { Box, Button, Group, Text } from "@mantine/core";
import { DisconnectedEvent } from "~/util/global-events";
import { useEventSubscription } from "~/hooks/event";
import { useStable } from "~/hooks/stable";
import { useIntent } from "~/hooks/url";
import { Icon } from "~/components/Icon";
import { iconExplorer, iconOpen, iconPlus } from "~/util/icons";
import { useInterfaceStore } from "~/stores/interface";
import { useViewEffect } from "~/hooks/view";
import { syncDatabaseSchema } from "~/util/schema";
import { Panel, PanelGroup } from "react-resizable-panels";
import { PanelDragger } from "~/components/Pane/dragger";
import { usePanelMinSize } from "~/hooks/panels";
import { Introduction } from "~/components/Introduction";
import { adapter } from "~/adapter";
import { useIsConnected } from "~/hooks/connection";
import { useShallow } from 'zustand/react/shallow';

export function ExplorerView() {
	const { openTableCreator } = useInterfaceStore(
		useShallow(state => ({ openTableCreator: state.openTableCreator }))
	);

	const [activeTable, setActiveTable] = useState<string>();
	const [isCreating, isCreatingHandle] = useDisclosure();
	const [creatorTable, setCreatorTable] = useState<string>();

	const isConnected = useIsConnected();

	const openCreator = useStable((table?: string) => {
		setCreatorTable(table || activeTable);
		isCreatingHandle.open();
	});

	useEventSubscription(DisconnectedEvent, () => {
		isCreatingHandle.close();
		setActiveTable(undefined);
	});

	useIntent("explore-table", ({ table }) => {
		setActiveTable(table);
	});

	useViewEffect("explorer", () => {
		syncDatabaseSchema();
	});

	const [minSize, ref] = usePanelMinSize(275);

	return (
		<>
			<Box h="100%" ref={ref}>
				<PanelGroup
					direction="horizontal"
					style={{ opacity: minSize === 0 ? 0 : 1 }}
				>
					<Panel
						defaultSize={minSize}
						minSize={minSize}
						maxSize={35}
					>
						<TablesPane
							activeTable={activeTable}
							onTableSelect={setActiveTable}
							onCreateRecord={openCreator}
						/>
					</Panel>
					<PanelDragger />
					<Panel minSize={minSize}>
						{activeTable ? (
							<ExplorerPane
								activeTable={activeTable}
								onCreateRecord={openCreator}
							/>
						) : (
							<Introduction
								title="Explorer"
								icon={iconExplorer}
								snippet={{
									code: `
										-- Declare a new table
										DEFINE TABLE person;
										
										-- Fetch table records
										SELECT * FROM person;
									`
								}}
							>
								<Text>
									The explorer view provides an easy way to browse your tables and records without writing any queries.
								</Text>
								<Group>
									<Button
										flex={1}
										variant="gradient"
										leftSection={<Icon path={iconPlus} />}
										disabled={!isConnected}
										onClick={openTableCreator}
									>
										Create table
									</Button>
									<Button
										flex={1}
										color="slate"
										rightSection={<Icon path={iconOpen} />}
										onClick={() => adapter.openUrl("https://surrealdb.com/docs/surrealdb/surrealql/statements/define/table")}
									>
										Learn more
									</Button>
								</Group>
							</Introduction>
						)}
					</Panel>
				</PanelGroup>
			</Box>

			<CreatorDrawer
				opened={isCreating}
				table={creatorTable || ''}
				onClose={isCreatingHandle.close}
			/>
		</>
	);
}

export default ExplorerView;