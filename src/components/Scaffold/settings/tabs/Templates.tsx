import { Entry } from "~/components/Entry";
import { SettingsSection } from "../utilities";
import { useSetting } from "~/hooks/config";
import { Icon } from "~/components/Icon";
import { iconCheck, iconDelete, iconFile, iconPlus } from "~/util/icons";
import { Button, Group, Modal, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { ConnectionDetails } from "~/components/ConnectionDetails";
import { useImmer } from "use-immer";
import { Connection, Template } from "~/types";
import { createBaseConnectionOptions } from "~/util/defaults";
import { Form } from "~/components/Form";
import { Spacer } from "~/components/Spacer";
import { useStable } from "~/hooks/stable";
import { newId } from "~/util/helpers";

const CAT = "templates";
const PLACEHOLDER: Connection = {
	id: "",
	name: "New template",
	icon: 0,
	queries: [],
	activeQuery: "",
	connection: createBaseConnectionOptions(),
	pinnedTables: [],
	diagramMode: "fields",
	diagramDirection: "ltr",
	diagramShowLinks: false,
	queryHistory: []
};

export function TemplatesTab() {
	const [templates, setTemplates] = useSetting(CAT, "list");
	const [details, setDetails] = useImmer<Connection>(PLACEHOLDER);
	const [showEditor, showEditorHandle] = useDisclosure();

	const openCreator = useStable(() => {
		showEditorHandle.open();
		setDetails(PLACEHOLDER);
	});

	const openEditor = useStable((template: Template) => {
		showEditorHandle.open();
		setDetails({
			...PLACEHOLDER,
			id: template.id,
			name: template.name,
			icon: template.icon,
			connection: template.values
		});
	});

	const saveTemplate = useStable(() => {
		const draft = [...templates];

		const template: Template = {
			id: details.id,
			name: details.name,
			icon: details.icon,
			values: details.connection
		};

		if (details.id) {
			const index = draft.findIndex((t) => t.id === details.id);

			if (index >= 0) {
				draft[index] = template;
			}
		} else {
			draft.push({
				...template,
				id: newId()
			});
		}

		setTemplates(draft);
		showEditorHandle.close();
	});

	const deleteConnection = useStable(() => {
		const draft = [...templates];
		const index = draft.findIndex((t) => t.id === details.id);

		if (index >= 0) {
			draft.splice(index, 1);
			setTemplates(draft);
			showEditorHandle.close();
		}
	});

	return (
		<>
			<SettingsSection>
				<Text mb="xs">
					Templates simplify the process of creating new connections by pre-filling common connection details.
				</Text>

				{templates.map((template) => (
					<Entry
						key={template.id}
						variant="filled"
						onClick={() => openEditor(template)}
						leftSection={
							<Icon path={iconFile} />
						}
					>
						{template.name}
					</Entry>
				))}

				<Entry
					variant="subtle"
					onClick={openCreator}
					leftSection={
						<Icon path={iconPlus} />
					}
				>
					New template
				</Entry>

			</SettingsSection>

			<Modal
				opened={showEditor}
				onClose={showEditorHandle.close}
				trapFocus={false}
				size="lg"
			>
				<Form onSubmit={saveTemplate}>
					<ConnectionDetails
						value={details}
						onChange={setDetails}
					/>

					<Group mt="lg">
						<Button
							color="slate"
							variant="light"
							onClick={showEditorHandle.close}
						>
							Close
						</Button>
						<Spacer />
						{details.id && (
							<Button
								color="pink.9"
								onClick={deleteConnection}
								leftSection={<Icon path={iconDelete} />}
							>
								Remove
							</Button>
						)}
						<Button
							type="submit"
							variant="gradient"
							rightSection={<Icon path={details.id ? iconCheck : iconPlus} />}
						>
							{details.id ? "Save" : "Create"}
						</Button>
					</Group>
				</Form>
			</Modal>
		</>
	);
}
