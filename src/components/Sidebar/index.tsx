import classes from "./style.module.scss";
import clsx from "clsx";
import surrealistLogo from "~/assets/images/logo.webp";
import { ScrollArea, Stack, Divider, Image, Flex, Group } from "@mantine/core";
import { Fragment, useLayoutEffect, useMemo } from "react";
import { adapter, isBrowser, isDesktop } from "~/adapter";
import { iconDownload, iconCog, iconSearch } from "~/util/icons";
import { NavigationIcon } from "../NavigationIcon";
import { Spacer } from "../Spacer";
import { VIEW_MODES } from "~/constants";
import { useStable } from "~/hooks/stable";
import { useConfigStore } from "~/stores/config";
import { SidebarMode, ViewMode } from "~/types";
import { useFeatureFlags } from "~/util/feature-flags";
import { updateTitle } from "~/util/helpers";
import { useIsLight } from "~/hooks/theme";
import { SurrealistLogo } from "../SurrealistLogo";
import { useConnection } from "~/hooks/connection";
import { useHover } from "@mantine/hooks";
import { useBoolean } from "~/hooks/boolean";
import { Shortcut } from "../Shortcut";
import { useShallow } from 'zustand/react/shallow';

const NAVIGATION: ViewMode[][] = [
	[
		"query",
		"explorer",
		"designer",
		"authentication",
	],
	[
		"functions",
		"models",
	],
	[
		"documentation",
	],
];

export interface SidebarProps {
	mode: SidebarMode;
	onToggleDownload: () => void;
	onTogglePalette: () => void;
	onToggleSettings: () => void;
}

export function Sidebar({
	mode,
	onToggleDownload,
	onTogglePalette,
	onToggleSettings,
}: SidebarProps) {
	const { setActiveView } = useConfigStore(
		useShallow(state => ({ setActiveView: state.setActiveView }))
	);

	const [flags] = useFeatureFlags();
	const [expanded, expandedHandle] = useBoolean();

	const isLight = useIsLight();
	const connection = useConnection();
	const activeView = useConfigStore((s) => s.activeView);
	const { ref, hovered } = useHover();

	useLayoutEffect(() => {
		expandedHandle.set(hovered);
	}, [expandedHandle, hovered]);

	const setViewMode = useStable((id: ViewMode) => {
		updateTitle();
		setActiveView(id);
		expandedHandle.close();
	});

	const navigation = useMemo(() => {
		return NAVIGATION.flatMap((row) => {
			const items = row.flatMap((id) => {
				const info = VIEW_MODES[id];

				return (!info || !info.disabled?.(flags) !== true) ? [] : [info];
			});

			return items.length > 0 ? [items] : [];
		});
	}, [flags]);

	const shouldExpand = connection && mode === "expandable" && expanded;
	const nudgeSidebar = adapter.platform === "darwin" && isDesktop;

	return (
		<ScrollArea
			scrollbars="y"
			type="never"
			pos="fixed"
			component="aside"
			top={0}
			left={0}
			bottom={0}
			pt={nudgeSidebar ? 28 : 0}
			bg={connection ? (isLight ? "slate.0" : "slate.9") : undefined}
			viewportRef={ref}
			className={clsx(
				classes.root,
				shouldExpand && classes.expanded,
				mode === "wide" && classes.wide
			)}
		>
			<Flex
				direction="column"
				h="100%"
				px={16}
			>
				<Group
					h={64}
					wrap="nowrap"
					align="center"
					gap="lg"
					style={{ flexShrink: 0 }}
				>
					<Image src={surrealistLogo} w={42} />
					<SurrealistLogo h={21} style={{ flexShrink: 0 }} />
				</Group>
				<Stack
					gap="sm"
					mt={9}
					pb={18}
					component="nav"
					flex={1}
				>
					{connection && navigation.map((items, i) => (
						<Fragment key={i}>
							{items.map(info => (
								<Group
									key={info.id}
									gap="lg"
									wrap="nowrap"
								>
									<NavigationIcon
										name={info.name}
										isActive={info.id === activeView}
										icon={info.anim || info.icon}
										withTooltip={mode === "compact"}
										onClick={() => setViewMode(info.id)}
										onMouseEnter={expandedHandle.open}
									/>
								</Group>
							))}
							{i < navigation.length - 1 && (
								<Divider color={isLight ? "white" : "slate.7"} />
							)}
						</Fragment>
					))}

					<Spacer />

					{isBrowser && (
						<NavigationIcon
							name="Download App"
							icon={iconDownload}
							onClick={onToggleDownload}
						/>
					)}

					<NavigationIcon
						name={
							<Group wrap="nowrap">
								Search
								<Shortcut value="mod K" />
							</Group>
						}
						icon={iconSearch}
						onClick={onTogglePalette}
					/>

					<NavigationIcon
						name="Settings"
						icon={iconCog}
						onClick={onToggleSettings}
					/>
				</Stack>
			</Flex>
		</ScrollArea>
	);
}