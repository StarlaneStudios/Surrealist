import { Checkbox, Kbd, Select } from "@mantine/core";
import { adapter, isDesktop } from "~/adapter";
import { useCheckbox } from "~/hooks/events";
import { SettingsSection } from "../utilities";
import { useSetting } from "~/hooks/config";
import { EDITOR_KEYMAPS } from "~/constants";

const CAT = "behavior";

export function BehaviourTab() {
	const [updateChecker, setUpdateChecker] = useSetting(CAT, "updateChecker");
	const [tableSuggest, setTableSuggest] = useSetting(CAT, "tableSuggest");
	const [variableSuggest, setVariableSuggest] = useSetting(CAT, "variableSuggest");
	const [queryErrorChecker, setQueryErrorChecker] = useSetting(CAT, "queryErrorChecker");
	const [windowPinned, setWindowPinned] = useSetting(CAT, "windowPinned");
	const [autoConnect, setAutoConnect] = useSetting(CAT, "autoConnect");
	const [editorKeymap, setEditorKeymap] = useSetting(CAT, "editorKeymap");

	const updateUpdateChecker = useCheckbox(setUpdateChecker);
	const updateTableSuggest = useCheckbox(setTableSuggest);
	const updateVariableSuggest = useCheckbox(setVariableSuggest);
	const updateQueryErrorChecker = useCheckbox(setQueryErrorChecker);
	const updateWindowPinned = useCheckbox(setWindowPinned);
	const updateAutoConnect = useCheckbox(setAutoConnect);

	return (
		<>
			<SettingsSection>
				{adapter.isUpdateCheckSupported && (
					<Checkbox
						label="Always check for updates"
						checked={updateChecker}
						onChange={updateUpdateChecker}
					/>
				)}

				{isDesktop && (
					<Checkbox
						label={<>Always on top <Kbd size="xs">F10</Kbd></>}
						checked={windowPinned}
						onChange={updateWindowPinned}
					/>
				)}

				<Checkbox
					label="Automatically connect to the database"
					checked={autoConnect}
					onChange={updateAutoConnect}
				/>
			</SettingsSection>

			<SettingsSection label="Query view">
				<Checkbox
					label="Auto complete table names"
					checked={tableSuggest}
					onChange={updateTableSuggest}
				/>

				<Checkbox
					label="Auto complete configured variables"
					checked={variableSuggest}
					onChange={updateVariableSuggest}
				/>

				<Checkbox
					label="Validate query for errors"
					checked={queryErrorChecker}
					onChange={updateQueryErrorChecker}
				/>

				<Select
					label="Editor keymap"
					data={EDITOR_KEYMAPS}
					value={editorKeymap}
					onChange={setEditorKeymap as any}
				/>

			</SettingsSection>
		</>
	);
}
