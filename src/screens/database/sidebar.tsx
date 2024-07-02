import surrealistLogo from "~/assets/images/logo.webp";
import { Stack, Divider, Image, Group } from "@mantine/core";
import { Fragment, useMemo } from "react";
import { isBrowser } from "~/adapter";
import { iconDownload, iconCog, iconSearch } from "~/util/icons";
import { VIEW_MODES } from "~/constants";
import { useStable } from "~/hooks/stable";
import { useConfigStore } from "~/stores/config";
import { ViewMode } from "~/types";
import { useFeatureFlags } from "~/util/feature-flags";
import { useIsLight } from "~/hooks/theme";
import { useConnection } from "~/hooks/connection";
import { NavigationIcon } from "~/components/NavigationIcon";
import { Shortcut } from "~/components/Shortcut";
import { Spacer } from "~/components/Spacer";
import { SurrealistLogo } from "~/components/SurrealistLogo";
import { ScreenState } from "~/components/Screen";
import { dispatchIntent } from "~/hooks/url";

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
	state: ScreenState;
}

export function DatabaseSidebar({
	state
}: SidebarProps) {
	const { setActiveView } = useConfigStore.getState();
	const [flags] = useFeatureFlags();

	const isLight = useIsLight();
	const connection = useConnection();
	const activeView = useConfigStore((s) => s.activeView);

	const setViewMode = useStable((id: ViewMode) => {
		setActiveView(id);
		state.sidebarHandle.close();
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

	const openSettings = useStable(() => dispatchIntent("open-settings"));
	const openCommands = useStable(() => dispatchIntent("open-command-palette"));
	const openDownload = useStable(() => dispatchIntent("open-desktop-download"));

	return (
		<>
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
									withTooltip={state.sidebarMode === "compact"}
									onClick={() => setViewMode(info.id)}
									onMouseEnter={state.sidebarHandle.open}
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
						onClick={openDownload}
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
					onClick={openCommands}
				/>

				<NavigationIcon
					name="Settings"
					icon={iconCog}
					onClick={openSettings}
				/>
			</Stack>
		</>
	);
}