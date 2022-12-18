import { Button, Checkbox, ColorScheme, Divider, Group, Modal, Paper, Select, Stack, Switch, Text, TextInput, Title, useMantineColorScheme } from "@mantine/core";
import { actions, store, useStoreValue } from "~/store";

import { Icon } from "../Icon";
import { Spacer } from "../Scaffold/Spacer";
import { mdiCog } from "@mdi/js";
import { updateConfig } from "~/util/helpers";
import { useIsLight } from "~/hooks/theme";
import { useStable } from "~/hooks/stable";
import { useState } from "react";

const THEMES = [
	{ label: 'Automatic', value: 'automatic' },
	{ label: 'Light', value: 'light' },
	{ label: 'Dark', value: 'dark' }
];

const DRIVERS = [
	{ label: 'Memory', value: 'memory' },
	{ label: 'File storage', value: 'file' },
	{ label: 'TiKV cluster', value: 'tikv' }
]

export function Settings() {
	const isLight = useIsLight();
	const colorScheme = useStoreValue(state => state.colorScheme);
	const autoConnect = useStoreValue(state => state.autoConnect);
	const tableSuggest = useStoreValue(state => state.tableSuggest);
	const wordWrap = useStoreValue(state => state.wordWrap);
	const localDriver = useStoreValue(state => state.localDriver);
	const localPath = useStoreValue(state => state.localStorage);
	const [showSettings, setShowSettings] = useState(false);

	const version = import.meta.env.VERSION;
	const author = import.meta.env.AUTHOR;

	const openSettings = useStable(() => {
		setShowSettings(true);
	});

	const closeSettings = useStable(() => {
		setShowSettings(false);
	});

	const setColorScheme = useStable((scheme: ColorScheme) => {
		store.dispatch(actions.setColorScheme(scheme));
		updateConfig();
	});

	const setAutoConnect = useStable((e: React.ChangeEvent<HTMLInputElement>) => {
		store.dispatch(actions.setAutoConnect(e.target.checked));
		updateConfig();	
	});

	const setTableSuggest = useStable((e: React.ChangeEvent<HTMLInputElement>) => {
		store.dispatch(actions.setTableSuggest(e.target.checked));
		updateConfig();
	});

	const setWordWrap = useStable((e: React.ChangeEvent<HTMLInputElement>) => {
		store.dispatch(actions.setWordWrap(e.target.checked));
		updateConfig();
	});

	const setLocalDriver = useStable((driver: string) => {
		store.dispatch(actions.setLocalDatabaseDriver(driver));
		updateConfig();
	});

	const setLocalPath = useStable((e: React.ChangeEvent<HTMLInputElement>) => {
		store.dispatch(actions.setLocalDatabaseStorage(e.target.value));
		updateConfig();
	});

	return (
		<>
			<Button
				color={isLight ? 'light.0' : 'dark.4'}
				onClick={openSettings}
				title="Settings"
				px="xs"
			>
				<Icon
					path={mdiCog}
					color={isLight ? 'light.8' : 'white'}
				/>
			</Button>

			<Modal
				opened={showSettings}
				onClose={closeSettings}
				size="lg"
				title={
					<Title size={16} color={isLight ? 'light.6' : 'white'}>
						Settings
					</Title>
				}
			>
				<Stack>
					<Checkbox
						label="Auto connect"
						checked={autoConnect}
						onChange={setAutoConnect}
					/>

					<Checkbox
						label="Suggest table names"
						checked={tableSuggest}
						onChange={setTableSuggest}
					/>

					<Checkbox
						label="Wrap query results"
						checked={wordWrap}
						onChange={setWordWrap}
					/>

					<Select
						data={THEMES}
						label="Theme"
						value={colorScheme}
						onChange={setColorScheme}
					/>

					<Select
						data={DRIVERS}
						label="Local database storage"
						value={localDriver}
						onChange={setLocalDriver}
					/>

					{localDriver === 'file' && (
						<TextInput
							label="Local database path"
							placeholder="/path/to/database"
							value={localPath}
							onChange={setLocalPath}
							autoComplete="off"
							spellCheck="false"
						/>
					)}

					{localDriver === 'tikv' && (
						<TextInput
							label="Local database cluster address (WIP)"
							placeholder="address:port"
							value={localPath}
							onChange={setLocalPath}
							autoComplete="off"
							spellCheck="false"
						/>
					)}

					<Group>
						<Button color="light" onClick={closeSettings}>
							Close
						</Button>
						<Spacer />
						<Text color={isLight ? 'light.4' : 'dark.3'}>
							Version {version} by {author}
						</Text>
					</Group>
				</Stack>
			</Modal>
		</>
	)
}