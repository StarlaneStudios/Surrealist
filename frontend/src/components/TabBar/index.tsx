import { TogglePinned } from "$/go/backend/Surrealist";
import { Group, Button, Modal, TextInput } from "@mantine/core";
import { mdiPlus, mdiPinOff, mdiPin, mdiHistory, mdiStar } from "@mdi/js";
import { useState } from "react";
import { useStable } from "~/hooks/stable";
import { useIsLight } from "~/hooks/theme";
import { store, actions, useStoreValue } from "~/store";
import { updateConfig, updateTitle } from "~/util/helpers";
import { Form } from "../Form";
import { Icon } from "../Icon";
import { LocalDatabase } from "../LocalDatabase";
import { Spacer } from "../Spacer";
import { Settings } from "../Settings";
import { ViewTab } from "../ViewTab";

export interface TabBarProps {
	openConnection: () => void;
	closeConnection: () => void;
	onCreateTab: () => void;
	onSwitchTab: () => void;
}

export function TabBar(props: TabBarProps) {
	const isLight = useIsLight();
	const isPinned = useStoreValue(state => state.isPinned);
	const activeTab = useStoreValue(state => state.activeTab);
	const tabList = useStoreValue(state => state.config.tabs);
	const enableListing = useStoreValue(state => state.config.enableListing);
	const queryListing = useStoreValue(state => state.config.queryListing);

	const [ editingTab, setEditingTab ] = useState<string|null>(null);
	const [ tabName, setTabName ] = useState('');
	
	const removeTab = useStable((id: string) => {
		store.dispatch(actions.removeTab(id));

		updateTitle();
		updateConfig();
	})
	
	const openTabEditor = useStable((tabId: string) => {
		const tab = tabList.find(tab => tab.id == tabId);
		
		if (!tab) {
			return;
		}
		
		setTabName(tab.name);
		setEditingTab(tab.id);
	});
	
	const closeEditingTab = useStable(() => {
		setEditingTab(null);
	});
	
	const saveTabName = useStable(() => {
		store.dispatch(actions.updateTab({
			id: editingTab!,
			name: tabName
		}));

		updateTitle();
		updateConfig();
		closeEditingTab();
	});

	const selectTab = useStable((id: string) => {
		store.dispatch(actions.setActiveTab(id));

		props.onSwitchTab();
		updateTitle();
	});

	const togglePinned = useStable(() => {
		store.dispatch(actions.togglePinned());

		TogglePinned();
		updateTitle();
	});

	const toggleHistory = useStable(() => {
		if (queryListing !== 'history') {
			store.dispatch(actions.setQueryListingMode('history'));
			store.dispatch(actions.setShowQueryListing(true));
		} else {
			store.dispatch(actions.setShowQueryListing(!enableListing));
		}
		
		updateConfig();
	});

	const toggleFavorites = useStable(() => {
		if (queryListing !== 'favorites') {
			store.dispatch(actions.setQueryListingMode('favorites'));
			store.dispatch(actions.setShowQueryListing(true));
		} else {
			store.dispatch(actions.setShowQueryListing(!enableListing));
		}

		updateConfig();
	});

	return (
		<Group
			p="xs"
			spacing="sm"
			bg={isLight ? 'white' : 'dark.7'}
			align="start"
			noWrap
		>

			<Group>
				{tabList.map(tab => (
					<ViewTab
						id={tab.id}
						key={tab.id}
						active={tab.id == activeTab}
						onDismiss={() => removeTab(tab.id)}
						onRename={() => openTabEditor(tab.id)}
						onActivate={() => selectTab(tab.id)}
					>
						{tab.name}
					</ViewTab>
				))}

				<Button
					px="xs"
					variant="subtle"
					color="light"
					leftIcon={<Icon path={mdiPlus} />}
					onClick={props.onCreateTab}
				>
					New tab
				</Button>
			</Group>

			<Spacer />

			<LocalDatabase
				openConnection={props.openConnection}
				closeConnection={props.closeConnection}
			/>

			<Button
				px="xs"
				color={isLight ? 'light.0' : 'dark.4'}
				title="Toggle history"
				onClick={toggleHistory}
			>
				<Icon
					path={mdiHistory}
					color={isLight ? 'light.8' : 'white'}
				/>
			</Button>

			<Button
				px="xs"
				color={isLight ? 'light.0' : 'dark.4'}
				title="Toggle favorites"
				onClick={toggleFavorites}
			>
				<Icon
					path={mdiStar}
					color={isLight ? 'light.8' : 'white'}
				/>
			</Button>
			
			<Button
				px="xs"
				color={isLight ? 'light.0' : 'dark.4'}
				title={isPinned ? 'Unpin window' : 'Pin window'}
				onClick={togglePinned}
			>
				<Icon
					path={isPinned ? mdiPinOff : mdiPin}
					color={isLight ? 'light.8' : 'white'}
				/>
			</Button>

			<Settings />

			<Modal
				opened={!!editingTab}
				onClose={closeEditingTab}
				withCloseButton={false}
			>
				<Form onSubmit={saveTabName}>
					<Group>
						<TextInput
							style={{ flex: 1 }}
							placeholder="Enter tab name"
							value={tabName}
							onChange={e => setTabName(e.target.value)}
							autoFocus
							onFocus={e => e.target.select()}
						/>
						<Button type="submit">
							Rename
						</Button>
					</Group>
				</Form>
			</Modal>
		
		</Group>
	);
}