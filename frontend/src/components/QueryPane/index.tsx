import Editor from "@monaco-editor/react";
import {editor, KeyCode, KeyMod} from "monaco-editor";
import {mdiDatabase} from "@mdi/js";
import {useStable} from "~/hooks/stable";
import {useActiveTab} from "~/hooks/tab";
import {actions, store} from "~/store";
import {updateConfig} from "~/util/helpers";
import {Panel} from "../Panel";
import {useMemo} from "react";
import {baseEditorConfig} from "~/util/editor";
import {useIsLight} from "~/hooks/theme";
import { useHotkeys } from "@mantine/hooks";

export interface QueryPaneProps {
    isConnected: boolean;
    onExecuteQuery: () => void;
}

export function QueryPane(props: QueryPaneProps) {
    const activeTab = useActiveTab();
    const isLight = useIsLight();

    if (!activeTab) {
        throw new Error('This should not happen');
    }

    const setQuery = useStable((content: string | undefined) => {
        store.dispatch(actions.updateTab({
            id: activeTab.id,
            query: content || ''
        }));

        updateConfig();
    });

    const setEditor = useStable((editor: editor.IStandaloneCodeEditor) => {
        editor.addAction({
            id: 'run-query',
            label: 'Run Query',
            keybindings: [
                KeyMod.CtrlCmd | KeyCode.Enter,
                KeyCode.F9
            ],
            run: () => {
                props.onExecuteQuery();
            }
        });

        editor.addAction({
            id: 'comment-query',
            label: 'Comment Query',
            keybindings: [
                KeyMod.CtrlCmd | KeyCode.Slash
            ],
            run: (editor) => {
                const selection = editor.getSelection();
				const model = editor.getModel();

                if (!selection || !model) {
                    return;
                }

                const range = {
                    startLineNumber: selection.startLineNumber,
                    startColumn: 0,
                    endLineNumber: selection.endLineNumber,
                    endColumn: model.getLineMaxColumn(selection.endLineNumber),
                }
                               
                const text = model.getValueInRange(range);
                const lines = text.split('\n');

                if(!lines) {
                    return;
                }

				const hasComment = lines.some(line => line.trim().startsWith('#'));

                const comment = lines.map(line => {
					return hasComment ? line.replace(/^# /, '') : `# ${line}`;
				}).join('\n');

                editor.executeEdits('comment-query', [{
                    range,
                    text: comment
                }]);
            }
        });
    });

    const options = useMemo<editor.IStandaloneEditorConstructionOptions>(() => {
        return {
            ...baseEditorConfig,
            quickSuggestions: false,
            wordBasedSuggestions: false,
            wrappingStrategy: 'advanced',
            wordWrap: 'on',
        }
    }, []);

	useHotkeys([
		['F9', props.onExecuteQuery],
		['mod+Enter', props.onExecuteQuery],
	])

    return (
        <Panel
            title="Query"
            icon={mdiDatabase}
        >
            <div
                style={{
                    position: 'absolute',
                    insetBlock: 0,
                    insetInline: 24
                }}
            >
                <Editor
                    onMount={setEditor}
                    theme={isLight ? 'surrealist' : 'surrealist-dark'}
                    value={activeTab?.query}
                    onChange={setQuery}
                    options={options}
                    language="surrealql"
                />
            </div>
        </Panel>
    )
}