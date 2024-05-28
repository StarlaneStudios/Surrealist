import surrealistIcon from "~/assets/images/logo.webp";
import { MouseEvent } from "react";
import { Notifications } from "@mantine/notifications";
import { ActionIcon, Box, Group, Image, MantineProvider, Paper, Text, Transition } from "@mantine/core";
import { useStable } from "~/hooks/stable";
import { Icon } from "../Icon";
import { adapter } from "~/adapter";
import { useInterfaceStore } from "~/stores/interface";
import { Scaffold } from "../Scaffold";
import { ErrorBoundary } from "react-error-boundary";
import { MANTINE_THEME } from "~/util/mantine";
import { useColorScheme, useIsLight } from "~/hooks/theme";
import { ContextMenuProvider } from "mantine-contextmenu";
import { InspectorProvider } from "~/providers/Inspector";
import { iconClose } from "~/util/icons";
import { FeatureFlagsProvider } from "~/providers/FeatureFlags";
import { ConfirmationProvider } from "~/providers/Confirmation";
import { useUrlHandler } from "~/hooks/url";
import { AppErrorHandler } from "./error";
import { useConfigStore } from "~/stores/config";
import { SANDBOX } from "~/constants";
import {
	QueryClient,
	QueryClientProvider,
} from '@tanstack/react-query';
import { useShallow } from 'zustand/react/shallow';

const queryClient = new QueryClient();

export function App() {
	const { setActiveConnection } = useConfigStore(
		useShallow(state => ({ setActiveConnection: state.setActiveConnection }))
	);
	const { hideAvailableUpdate } = useInterfaceStore(
		useShallow(state => ({ hideAvailableUpdate: state.hideAvailableUpdate }))
	);

	const isLight = useIsLight();
	const colorScheme = useColorScheme();
	const update = useInterfaceStore((s) => s.availableUpdate);
	const showUpdate = useInterfaceStore((s) => s.showAvailableUpdate);

	const closeUpdate = useStable((e?: MouseEvent) => {
		e?.stopPropagation();
		hideAvailableUpdate();
	});

	const openRelease = useStable(() => {
		adapter.openUrl(`https://github.com/surrealdb/surrealist/releases/tag/v${update}`);
		closeUpdate();
	});

	const handleReset = useStable(() => {
		setActiveConnection(SANDBOX);
	});

	useUrlHandler();

	return (
		<FeatureFlagsProvider>
			<QueryClientProvider client={queryClient}>
				<MantineProvider
					withCssVariables
					theme={MANTINE_THEME}
					forceColorScheme={colorScheme}
				>
					<Notifications />

					<ContextMenuProvider
						borderRadius="md"
						shadow={isLight ? "xs" : "0 6px 12px 2px rgba(0, 0, 0, 0.25)"}
						submenuDelay={250}
					>
						<ConfirmationProvider>
							<InspectorProvider>
								<ErrorBoundary
									FallbackComponent={AppErrorHandler}
									onReset={handleReset}
								>
									<Scaffold />
								</ErrorBoundary>
							</InspectorProvider>
						</ConfirmationProvider>
					</ContextMenuProvider>

					<Transition
						mounted={showUpdate}
						duration={250}
						transition="slide-up"
						timingFunction="ease"
					>
						{(styles) => (
							<Paper
								onClick={openRelease}
								style={{ ...styles, cursor: "pointer" }}
								pos="fixed"
								bg="#2f2f40"
								bottom={20}
								left={20}
								p="xs"
							>
								<Group gap="sm">
									<Image
										src={surrealistIcon}
										style={{ pointerEvents: "none" }}
										height={32}
										width={32}
										mx={4}
									/>
									<Box miw={200}>
										<Text c="white">New release available</Text>
										<Text c="gray.5">Version {update} is available</Text>
									</Box>
									<ActionIcon
										aria-label="Close update notification"
										onClick={closeUpdate}
									>
										<Icon path={iconClose} />
									</ActionIcon>
								</Group>
							</Paper>
						)}
					</Transition>
				</MantineProvider>
			</QueryClientProvider>
		</FeatureFlagsProvider>
	);
}