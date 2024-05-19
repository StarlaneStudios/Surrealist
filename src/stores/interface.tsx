import { ColorScheme } from "~/types";
import { create } from "zustand";

interface LiveMessage {
	id: string;
	action: string;
	queryId: string;
	timestamp: number;
	data: any;
}

export type InterfaceStore = {
	title: string;
	colorPreference: ColorScheme;
	colorScheme: ColorScheme;
	availableUpdate: string;
	showAvailableUpdate: boolean;
	showConnectionEditor: boolean;
	isCreatingConnection: boolean;
	editingConnectionId: string;
	showTableCreator: boolean;
	liveTabs: Set<string>;
	liveQueryMessages: Record<string, LiveMessage[]>;
	showScopeSignup: boolean;
	showChangelogAlert: boolean;
	hasReadChangelog: boolean;
	hasEditorFocus: boolean;

	setWindowTitle: (title: string) => void;
	setColorPreference: (preference: ColorScheme) => void;
	setColorScheme: (scheme: ColorScheme) => void;
	setAvailableUpdate: (availableUpdate: string) => void;
	hideAvailableUpdate: () => void;
	openConnectionCreator: () => void;
	openConnectionEditor: (editingId: string) => void;
	closeConnectionEditor: () => void;
	setIsLive: (id: string, live: boolean) => void;
	openTableCreator: () => void;
	closeTableCreator: () => void;
	pushLiveQueryMessage: (id: string, message: LiveMessage) => void;
	clearLiveQueryMessages: (id: string) => void;
	openScopeSignup: () => void;
	closeScopeSignup: () => void;
	showChangelog: () => void;
	readChangelog: () => void;
	setHasEditorFocus: (hasFocus: boolean) => void;
};

export const useInterfaceStore = create<InterfaceStore>((set) => ({
	title: "",
	colorPreference: "dark",
	colorScheme: "dark",
	availableUpdate: "",
	showAvailableUpdate: false,
	showConnectionEditor: false,
	isCreatingConnection: false,
	editingConnectionId: "",
	showTableCreator: false,
	liveTabs: new Set<string>(),
	liveQueryMessages: {},
	showScopeSignup: false,
	showChangelogAlert: false,
	hasReadChangelog: false,
	hasEditorFocus: false,

	setWindowTitle: (title) => set(() => ({ title })),

	setColorPreference: (themePreference) => set(() => ({
		colorPreference: themePreference
	})),

	setColorScheme: (colorScheme) => set(() => ({
		colorScheme,
	})),

	setAvailableUpdate: (availableUpdate) => set(() => ({
		availableUpdate,
		showAvailableUpdate: true,
	})),

	hideAvailableUpdate: () => set(() => ({
		showAvailableUpdate: false,
	})),

	openConnectionCreator: () => set(() => ({
		editingConnectionId: "",
		showConnectionEditor: true,
		isCreatingConnection: true,
	})),

	openConnectionEditor: (editingId) => set(() => ({
		editingConnectionId: editingId,
		showConnectionEditor: true,
		isCreatingConnection: false,
	})),

	closeConnectionEditor: () => set(() => ({
		showConnectionEditor: false,
	})),

	openTableCreator: () => set(() => ({
		showTableCreator: true,
	})),

	closeTableCreator: () => set(() => ({
		showTableCreator: false,
	})),

	setIsLive: (id, live) => set((state) => {
		const liveTabs = new Set(state.liveTabs);

		if (live) {
			liveTabs.add(id);
		} else {
			liveTabs.delete(id);
		}

		return {
			liveTabs
		};
	}),

	pushLiveQueryMessage: (id, message) => set((state) => ({
		liveQueryMessages: {
			...state.liveQueryMessages,
			[id]: [
				message,
				...(state.liveQueryMessages[id] || []).slice(0, 50)
			]
		}
	})),

	clearLiveQueryMessages: (id) => set((state) => {
		const liveQueryMessages = { ...state.liveQueryMessages };

		delete liveQueryMessages[id];

		return {
			liveQueryMessages
		};
	}),

	openScopeSignup: () => set(() => ({
		showScopeSignup: true,
	})),

	closeScopeSignup: () => set(() => ({
		showScopeSignup: false,
	})),

	showChangelog: () => set(() => ({
		showChangelogAlert: true,
	})),

	readChangelog: () => set(() => ({
		hasReadChangelog: true,
	})),

	setHasEditorFocus: (hasFocus) => set(() => ({
		hasEditorFocus: hasFocus,
	})),
}));
