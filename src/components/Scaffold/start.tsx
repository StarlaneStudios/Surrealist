import classes from "./style.module.scss";
import primarySphere from "~/assets/images/primary-sphere.webp";
import secondarySphere from "~/assets/images/secondary-sphere.webp";
import connection from "~/assets/images/start/connection.webp";
import sandbox from "~/assets/images/start/sandbox.webp";
import cloud from "~/assets/images/start/cloud.webp";
import { Box, Center, Group, Stack, UnstyledButton } from "@mantine/core";
import { useInterfaceStore } from "~/stores/interface";
import { useConfigStore } from "~/stores/config";
import { useStable } from "~/hooks/stable";
import { SANDBOX } from "~/constants";
import { adapter } from "~/adapter";
import { useDatabaseStore } from "~/stores/database";
import { useShallow } from 'zustand/react/shallow';

export function StartScreen() {
	const { setActiveConnection } = useConfigStore(
		useShallow(state => ({ setActiveConnection: state.setActiveConnection }))
	);
	const { openConnectionCreator } = useInterfaceStore(
		useShallow(state => ({ openConnectionCreator: state.openConnectionCreator }))
	);
	const { isConnecting } = useDatabaseStore();

	const openSandbox = useStable(() => {
		setActiveConnection(SANDBOX);
	});

	const openCloud = useStable(() => {
		adapter.openUrl("https://surrealdb.com/cloud");
	});

	return (
		<Box
			pos="absolute"
			inset={0}
			className={classes.start}
		>
			<div
				className={classes.primarySphere}
				style={{
					backgroundImage: `url(${primarySphere})`
				}}
			/>

			<div
				className={classes.secondarySphere}
				style={{
					backgroundImage: `url(${secondarySphere})`
				}}
			/>

			<Center
				h="100%"
			>
				<Group align="stretch">
					<Stack>
						<UnstyledButton
							className={classes.startBox}
							w={320}
							h={226}
							onClick={openConnectionCreator}
							style={{ border: '1px solid rgba(255, 255, 255, 0.05' }}
						>
							<Box style={{ backgroundImage: `url(${connection})` }} />
						</UnstyledButton>
						<UnstyledButton
							className={classes.startBox}
							w={320}
							h={226}
							onClick={openSandbox}
							style={{ border: '1px solid rgba(255, 255, 255, 0.05' }}
							disabled={isConnecting}
						>
							<Box style={{ backgroundImage: `url(${sandbox})` }} />
						</UnstyledButton>
					</Stack>
					<Box>
						<UnstyledButton
							className={classes.startBox}
							w={657}
							h={464}
							onClick={openCloud}
							disabled={isConnecting}
						>
							<Box style={{ backgroundImage: `url(${cloud})` }} />
						</UnstyledButton>
					</Box>
				</Group>
			</Center>
		</Box>
	);
}
