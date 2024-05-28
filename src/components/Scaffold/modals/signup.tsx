import { Alert, Button, Group, Modal, PasswordInput, Stack, Table, Text, TextInput } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useLayoutEffect, useState } from "react";
import { Icon } from "~/components/Icon";
import { ModalTitle } from "~/components/ModalTitle";
import { Spacer } from "~/components/Spacer";
import { openConnection } from "~/connection";
import { SENSITIVE_SCOPE_FIELDS } from "~/constants";
import { useActiveConnection } from "~/hooks/connection";
import { useStable } from "~/hooks/stable";
import { useInterfaceStore } from "~/stores/interface";
import { iconWarning } from "~/util/icons";
import { useShallow } from 'zustand/react/shallow';

export function ScopeSignup() {
	const { closeScopeSignup, openConnectionEditor } = useInterfaceStore(
		useShallow(state => ({ closeScopeSignup: state.closeScopeSignup, openConnectionEditor: state.openConnectionEditor }))
	);

	const opened = useInterfaceStore((s) => s.showScopeSignup);
	const [loading, loadingHandle] = useDisclosure();
	const [error, setError] = useState("");

	const { id, connection } = useActiveConnection();

	const openEditor = useStable(() => {
		openConnectionEditor(id);
		closeScopeSignup();
	});

	const createAccount = useStable(() => {
		loadingHandle.open();

		openConnection({
			connection: {
				...connection,
				authMode: "scope-signup"
			}
		}).then(() => {
			closeScopeSignup();
		}).catch(err => {
			setError(err.message);
		}).finally(() => {
			loadingHandle.close();
		});
	});

	useLayoutEffect(() => {
		if (opened) {
			setError("");
		}
	}, [opened]);

	return (
		<Modal
			opened={opened}
			onClose={closeScopeSignup}
			title={<ModalTitle>Sign up to scope</ModalTitle>}
		>
			<Stack>
				{error && (
					<Alert
						color="red.5"
						icon={<Icon path={iconWarning} />}
						title="Connection error"
					>
						{error}
					</Alert>
				)}
				<Text>
					The provided scope details do not match any existing user. Confirm these scope fields and press "Sign up" below to create a new user.
				</Text>

				<Table>
					<Table.Thead>
						<Table.Tr>
							<Table.Th w="50%">Scope field</Table.Th>
							<Table.Th w="50%">Value</Table.Th>
						</Table.Tr>
					</Table.Thead>
					<Table.Tbody>
						{connection.scopeFields.map((field) => {
							const fieldName = field.subject.toLowerCase();
							const ValueInput = SENSITIVE_SCOPE_FIELDS.has(fieldName)
								? PasswordInput
								: TextInput;

							return (
								<Table.Tr key={field.subject}>
									<Table.Td c="bright">
										<Text fw={600}>
											{field.subject}
										</Text>
									</Table.Td>
									<Table.Td c="bright">
										<ValueInput
											size="xs"
											readOnly
											variant="unstyled"
											value={field.subject}
											spellCheck={false}
											styles={{
												input: {
													backgroundColor: "unset"
												}
											}}
										/>
									</Table.Td>
								</Table.Tr>
							);
						})}
					</Table.Tbody>
				</Table>

				<Group>
					<Button
						color="slate"
						variant="light"
						onClick={closeScopeSignup}
					>
						Close
					</Button>
					<Spacer />
					<Button
						color="surreal"
						variant="light"
						onClick={openEditor}
					>
						Edit details
					</Button>
					<Button
						type="submit"
						variant="gradient"
						loading={loading}
						onClick={createAccount}
					>
						Sign up
					</Button>
				</Group>
			</Stack>
		</Modal>
	);
}