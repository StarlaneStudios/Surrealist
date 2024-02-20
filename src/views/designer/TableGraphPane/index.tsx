import classes from "./style.module.scss";
import { Icon } from "~/components/Icon";
import { ContentPane } from "~/components/Pane";
import { ActionIcon, Box, Button, Group, Kbd, Loader, Modal, Popover, Stack, Text, Title } from "@mantine/core";
import { mdiAdjust, mdiCog, mdiFullscreen, mdiHelpCircle, mdiImage, mdiPlus, mdiRefresh, mdiXml } from "@mdi/js";
import { ElementRef, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Background, ReactFlow, useEdgesState, useNodesState, useReactFlow, useStoreApi } from "reactflow";
import { InternalNode, NODE_TYPES, applyNodeLayout, buildFlowNodes, createSnapshot } from "./helpers";
import { DesignerNodeMode, TableDefinition } from "~/types";
import { useStable } from "~/hooks/stable";
import { useIsLight } from "~/hooks/theme";
import { useIsConnected } from "~/hooks/connection";
import { TableCreator } from "~/components/TableCreator";
import { ModalTitle } from "~/components/ModalTitle";
import { useActiveConnection } from "~/hooks/connection";
import { DESIGNER_NODE_MODES } from "~/constants";
import { useNodeMode } from "./hooks";
import { RadioSelect } from "~/components/RadioSelect";
import { adapter } from "~/adapter";
import { showNotification } from "@mantine/notifications";
import { sleep } from "radash";
import { useConfigStore } from "~/stores/config";
import { themeColor } from "~/util/mantine";
import { useSchema } from "~/hooks/schema";
import { useContextMenu } from "mantine-contextmenu";
import { useBoolean } from "~/hooks/boolean";

interface HelpTitleProps {
	isLight: boolean;
	children: React.ReactNode;
}

function HelpTitle({ isLight, children }: HelpTitleProps) {
	return (
		<Title order={2} size={14} c={isLight ? "slate.9" : "white"} fw={600}>
			{children}
		</Title>
	);
}

export interface TableGraphPaneProps {
	active: TableDefinition | null;
	tables: TableDefinition[];
	setActiveTable: (table: string) => void;
}

export function TableGraphPane(props: TableGraphPaneProps) {
	const { updateCurrentConnection } = useConfigStore.getState();
	const { showContextMenu } = useContextMenu();

	const schema = useSchema();
	const isViewActive = useConfigStore((s) => s.activeView == "designer");

	const [isComputing, setIsComputing] = useState(false);
	const [isExporting, setIsExporting] = useState(false);
	const [isCreating, isCreatingHandle] = useBoolean();
	const [showConfig, showConfigHandle] = useBoolean();
	const [showHelp, showHelpHandle] = useBoolean();
	const ref = useRef<ElementRef<"div">>(null);
	const isOnline = useIsConnected();
	const activeSession = useActiveConnection();
	const nodeMode = useNodeMode(activeSession);
	const isLight = useIsLight();

	const { fitView, getViewport, setViewport } = useReactFlow();
	const [nodes, setNodes, onNodesChange] = useNodesState([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState([]);

	const initialized = useRef(false);
	const flowStore = useStoreApi();

	const renderGraph = useStable(async () => {
		const [nodes, edges] = buildFlowNodes(props.tables);

		if (nodes.length === 0) {
			setIsComputing(false);
			return;
		}

		const doFit = !initialized.current;
		initialized.current = true;

		setNodes(nodes);
		setEdges(edges);
		setIsComputing(true);

		// This has to be rediculously high because MacOS webview is truly terrible
		// On chromium this could be as low as 3ms
		await sleep(300);

		const layoutNodes = [...flowStore.getState().nodeInternals.values()] as InternalNode[];

		applyNodeLayout(layoutNodes, edges).then(async changes => {
			onNodesChange(changes);

			if (doFit) {
				// Yet again, on chromium this could be 3ms
				await sleep(100);
				fitView();
			}

			setIsComputing(false);
		});
	});

	const saveImage = useStable(async (type: 'png' | 'svg') => {
		const viewport = getViewport();

		const isSuccess = await adapter.saveFile("Save snapshot", `snapshot.${type}`, [
			{
				name: "Image",
				extensions: [type],
			},
		], async () => {
			setIsExporting(true);

			await sleep(50);

			fitView();
			
			return await createSnapshot(ref.current!, type);
		});

		setIsExporting(false);
		setViewport(viewport);
		
		if (isSuccess) {
			showNotification({
				message: "Snapshot saved to disk"
			});
		}
	});

	const showBox = !isComputing && (!isOnline || props.tables.length === 0);

	const setNodeMode = useStable((mode: string) => {
		updateCurrentConnection({
			id: activeSession?.id,
			designerNodeMode: mode as DesignerNodeMode,
		});
	});

	useLayoutEffect(() => {
		if (isViewActive) {
			setIsComputing(true);
		}
	}, [isViewActive]);

	useLayoutEffect(() => {
		if (isViewActive) {
			setTimeout(() => {
				renderGraph();
			});
		}
	}, [schema]);

	useEffect(() => {
		renderGraph();
	}, [nodeMode]);

	useEffect(() => {
		setNodes(curr => {
			return curr.map(node => {
				return {
					...node,
					data: {
						...node.data,
						isSelected: node.id === props.active?.schema.name
					},
				};
			});
		});
	}, [props.active]);

	return (
		<ContentPane
			title="Table Graph"
			icon={mdiAdjust}
			style={{ overflow: 'hidden' }}
			rightSection={
				<Group wrap="nowrap">
					<ActionIcon title="Create table..." onClick={isCreatingHandle.open}>
						<Icon path={mdiPlus} />
					</ActionIcon>
					<Popover
						opened={showConfig}
						onChange={showConfigHandle.set}
						position="bottom-end"
						offset={{ crossAxis: -4, mainAxis: 8 }}
						shadow="sm"
					>
						<Popover.Target>
							<ActionIcon
								title="Graph Options"
								onClick={showConfigHandle.toggle}
							>
								<Icon path={mdiCog} />
							</ActionIcon>
						</Popover.Target>
						<Popover.Dropdown onMouseLeave={showConfigHandle.close}>
							<Stack pb={4}>
								<ModalTitle>
									Table graph options
								</ModalTitle>
								<RadioSelect
									label="Table appearance"
									data={DESIGNER_NODE_MODES}
									value={nodeMode}
									onChange={setNodeMode}
								/>
							</Stack>
						</Popover.Dropdown>
					</Popover>
					<ActionIcon title="Help" onClick={showHelpHandle.open}>
						<Icon path={mdiHelpCircle} />
					</ActionIcon>
				</Group>
			}>
			<div style={{ position: "relative", width: "100%", height: "100%" }}>
				{isViewActive && (
					<ReactFlow
						ref={ref}
						fitView
						nodes={nodes}
						edges={edges}
						nodeTypes={NODE_TYPES}
						nodesDraggable={false}
						nodesConnectable={false}
						edgesFocusable={false}
						proOptions={{ hideAttribution: true }}
						onNodesChange={onNodesChange}
						onEdgesChange={onEdgesChange}
						className={classes.diagram}
						style={{ opacity: isComputing ? 0 : 1 }}
						onNodeClick={(_ev, node) => {
							props.setActiveTable(node.id);
						}}
						onContextMenu={showContextMenu([
							{
								key: 'create',
								icon: <Icon path={mdiPlus} />,
								title: 'Create table...',
								onClick: isCreatingHandle.open
							},
							{
								key: 'view',
								icon: <Icon path={mdiFullscreen} />,
								title: 'Reset viewport',
								onClick: () => fitView()
							},
							{
								key: 'refresh',
								icon: <Icon path={mdiRefresh} />,
								title: 'Refresh',
								onClick: renderGraph
							},
							{ key: 'divider' },
							{
								key: 'download-png',
								icon: <Icon path={mdiImage} />,
								title: 'Export as PNG',
								onClick: () => saveImage('png')
							},
							{
								key: 'download-svg',
								icon: <Icon path={mdiXml} />,
								title: 'Export as SVG',
								onClick: () => saveImage('svg')
							},
						])}
					>
						<Background
							color={themeColor(isLight ? "slate.2": "slate.6")}
						/>
					</ReactFlow>
				)}

				{isExporting && (
					<Stack
						inset={0}
						pos="absolute"
						align="center"
						justify="center"
						bg="var(--mantine-color-body)"
						style={{ zIndex: 5 }}
					>
						<Loader />
						<Text fz="xl" fw={600}>
							Exporting graph...
						</Text>
					</Stack>
				)}

				{isComputing ? (
					<Stack
						inset={0}
						pos="absolute"
						align="center"
						justify="center"
						style={{ zIndex: 4, pointerEvents: 'none' }}
					>
						<Loader />
						<Text fz="xl" fw={600}>
							Visualizing schema...
						</Text>
					</Stack>
				) : showBox && (
					<Stack
						inset={0}
						pos="absolute"
						align="center"
						justify="center"
						gap="lg"
					>
						<Box ta="center">
							<Text fz="xl" fw={600}>
								No tables defined
							</Text>
							<Text>
								Get started by creating a table
							</Text>
						</Box>
						<Button
							variant="light"
							rightSection={<Icon path={mdiPlus} />}
							onClick={isCreatingHandle.open}
						>
							Create a table
						</Button>
					</Stack>
				)}
			</div>

			<Modal
				opened={showHelp}
				onClose={showHelpHandle.close}
				trapFocus={false}
				size="lg"
				title={<ModalTitle>Using the Table Graph</ModalTitle>}
			>
				<Text c={isLight ? "slate.7" : "slate.2"}>
					<HelpTitle isLight={isLight}>How do I use the table graph?</HelpTitle>

					<Text mt={8} mb="xl">
						The table graph will automatically render based on the tables in your database. You can click on a table to
						view its details and modify it's schema. Changes made to the schema will be reflected in the graph.
					</Text>

					<HelpTitle isLight={isLight}>Can I change how tables are displayed?</HelpTitle>

					<Text mt={8} mb="xl">
						Press the <Icon path={mdiCog} size="sm" /> button in the top right corner to open the graph options. Inside you
						can change the table layout and table appearance. These settings are saved per session, however you can configure
						default values in the Surrealist settings.
					</Text>

					<HelpTitle isLight={isLight}>Why are edges missing?</HelpTitle>

					<Text mt={8} mb="xl">
						Surrealist dermines edges by searching for correctly configured <Kbd>in</Kbd> and <Kbd>out</Kbd> fields. You
						can automatically create a new edge table by pressing the <Icon path={mdiPlus} /> button on the Table Graph
						panel. Keep in mind edges are only visible when the layout is set to Diagram.
					</Text>

					<HelpTitle isLight={isLight}>Can I save the graph as an image?</HelpTitle>

					<Text mt={8}>
						Press the save snapshot button in the options dropdown to save the current graph as a PNG
						image. This snapshot will use your current theme, position, and scale.
					</Text>
				</Text>
			</Modal>

			<TableCreator
				opened={isCreating}
				onClose={isCreatingHandle.close}
			/>
		</ContentPane>
	);
}
