import { Monaco } from "@monaco-editor/react";
import { editor, languages } from "monaco-editor";
import { adapter } from "~/adapter";
import { actions, store } from "~/store";

export const LIGHT_THEME = "surrealist-light";
export const DARK_THEME = "surrealist-dark";

const tablePrefixes = ["FROM ", "UPDATE ", "CREATE ", "DELETE ", "INTO "];

export const baseEditorConfig: editor.IStandaloneEditorConstructionOptions = {
	scrollBeyondLastLine: false,
	overviewRulerLanes: 0,
	fontFamily: "JetBrains Mono",
	renderLineHighlight: "none",
	lineDecorationsWidth: 12,
	lineNumbersMinChars: 1,
	glyphMargin: false,
	automaticLayout: true,
	minimap: {
		enabled: false,
	},
};

let global: Monaco;

export function getMonaco() {
	return global;
}

export function initializeEditor(monaco: Monaco) {
	global = monaco;

	monaco.editor.defineTheme(LIGHT_THEME, {
		base: "vs",
		inherit: true,
		rules: [
			{ token: "keyword", foreground: "#e600a4" },
			{ token: "param", foreground: "#e67a15" },
			{ token: "comment", foreground: "#606475" },
			{ token: "fancy", foreground: "#09b8ac" },
			{ token: "function", foreground: "#9565cf" },
		],
		colors: {
			"editorLineNumber.foreground": "#9BA9C6",
			"editorLineNumber.activeForeground": "#465671",
		},
	});

	monaco.editor.defineTheme(DARK_THEME, {
		base: "vs-dark",
		inherit: true,
		rules: [
			{ token: "keyword", foreground: "#e600a4" },
			{ token: "param", foreground: "#e67a15" },
			{ token: "comment", foreground: "#606475" },
			{ token: "fancy", foreground: "#09b8ac" },
			{ token: "function", foreground: "#cb96ff" },
		],
		colors: {
			"editor.background": "#1a1b1e",
			"editorLineNumber.foreground": "#465671",
			"editorLineNumber.activeForeground": "#9BA9C6",
		},
	});

	monaco.languages.register({ id: "surrealql" });

	monaco.languages.setMonarchTokensProvider("surrealql", {
		ignoreCase: true,
		keywords: [
			"AFTER",
			"ANALYZE",
			"ANALYZER",
			"ASC",
			"AS",
			"ASSERT",
			"BEFORE",
			"BEGIN",
			"BM25",
			"CANCEL",
			"COLUMNS",
			"COMMIT",
			"CONTENT",
			"CREATE",
			"DATABASE",
			"DB",
			"DEFINE",
			"DELETE",
			"DESC",
			"DESCRIBE",
			"DIFF",
			"DROP",
			"ELSE",
			"END",
			"ES256",
			"ES384",
			"ES512",
			"EVENT",
			"EXPLAIN",
			"FETCH",
			"FIELD",
			"FILTERS",
			"FOR",
			"FROM",
			"FUNCTION",
			"GROUP",
			"BY",
			"HIGHLIGHTS",
			"HS256",
			"HS384",
			"HS512",
			"IF",
			"INDEX",
			"INFO",
			"INSERT",
			"IGNORE",
			"INTO",
			"KILL",
			"LET",
			"LIMIT",
			"LIVE",
			"USER",
			"ROLES",
			"LOGIN",
			"MERGE",
			"NAMESPACE",
			"NS",
			"ON",
			"DUPLICATE",
			"KEY",
			"UPDATE",
			"ORDER",
			"PASSHASH",
			"PASSWORD",
			"PERMISSIONS",
			"PS256",
			"PS384",
			"PS512",
			"RELATE",
			"REMOVE",
			"REPLACE",
			"RETURN",
			"RS256",
			"RS384",
			"RS512",
			"SCHEMAFULL",
			"SCHEMALESS",
			"SCOPE",
			"SEARCH",
			"SELECT",
			"SESSION",
			"SET",
			"SIGNIN",
			"SIGNUP",
			"SLEEP",
			"SPLIT",
			"ON",
			"START",
			"AT",
			"TABLE",
			"TOKENIZERS",
			"THEN",
			"TIMEOUT",
			"TOKEN",
			"TYPE",
			"UNIQUE",
			"UPDATE",
			"USE",
			"VALUE",
			"VALUES",
			"VERSION",
			"WHEN",
			"WHERE",
			"AND",
			"OR",
			"IS",
			"NOT",
			"CONTAINSALL",
			"CONTAINSANY",
			"CONTAINSNONE",
			"CONTAINSSOME",
			"CONTAINSNOT",
			"CONTAINS",
			"ALLINSIDE",
			"ANYINSIDE",
			"NONEINSIDE",
			"SOMEINSIDE",
			"NOTINSIDE",
			"NOT IN",
			"INSIDE",
			"OUTSIDE",
			"INTERSECTS",
		],
		tokenizer: {
			root: [
				[/(count|(\w+::)+\w+)(?=\()/, "function"],
				[/["'].*?["']/, "string"],
				[/\/.*?[^\\]\/|<future>/, "fancy"],
				[/(\/\/|#|--).+/, "comment"],
				[/\$\w+/, "param"],
				[
					/\b\w+\b/,
					{
						cases: {
							"@keywords": "keyword",
							"@default": "variable",
						},
					},
				],
			],
		},
	});

	// table intellisense
	monaco.languages.registerCompletionItemProvider("surrealql", {
		triggerCharacters: [" "],
		provideCompletionItems: async (model, position, context) => {
			const { tableSuggest } = store.getState().config;
			const surreal = adapter.getSurreal();

			if (!tableSuggest || !surreal) {
				return;
			}

			const linePrefix = model.getLineContent(position.lineNumber).slice(0, Math.max(0, position.column));
			const isAuto = context.triggerKind === languages.CompletionTriggerKind.TriggerCharacter;

			if (isAuto && !tablePrefixes.some((pre) => linePrefix.toUpperCase().endsWith(pre))) {
				return;
			}

			try {
				const response = await surreal.querySingle("INFO FOR DB");
				const result = response[0].result;

				if (!result) {
					return {
						suggestions: [],
					};
				}

				const tables = Object.keys(result.tables ?? result.tb);
				const suggestions = tables.map((table) => ({
					label: table,
					insertText: table,
					kind: languages.CompletionItemKind.Class,
					range: monaco.Range.fromPositions(position, position),
				}));

				return {
					suggestions,
				};
			} catch {
				return {
					suggestions: [],
				};
			}
		},
	});

	// variable intellisense
	monaco.languages.registerCompletionItemProvider("surrealql", {
		triggerCharacters: ["$"],
		provideCompletionItems(_, position, context) {
			const { config } = store.getState();
			const tab = config.tabs.find((tab) => tab.id == config.activeTab);

			if (!tab) {
				return;
			}

			const variables = JSON.parse(tab.variables);
			const variableNames = Object.keys(variables);

			if (variableNames.length === 0) {
				return;
			}

			const isAuto = context.triggerKind === languages.CompletionTriggerKind.TriggerCharacter;
			const suggestions: languages.CompletionItem[] = variableNames.map((variableName) => ({
				label: `$${variableName}`,
				insertText: (isAuto ? "" : "$") + variableName,
				detail: `${variables[variableName]}`,
				kind: languages.CompletionItemKind.Variable,
				range: monaco.Range.fromPositions(position, position),
			}));

			return {
				suggestions,
			};
		},
	});

	store.dispatch(actions.setMonacoLoaded());
}

/**
 * Configure an editor to run queries on Ctrl+Enter or F9
 * and support commenting with Ctrl+/
 *
 * @param editor The editor instance
 * @param onExecute The execute callback
 */
export function configureQueryEditor(editor: editor.IStandaloneCodeEditor, onExecute: () => void) {
	editor.addAction({
		id: "run-query",
		label: "Run Query",
		keybindings: [global.KeyMod.CtrlCmd | global.KeyCode.Enter, global.KeyCode.F9],
		run: () => onExecute(),
	});

	editor.addAction({
		id: "comment-query",
		label: "Comment Query",
		keybindings: [global.KeyMod.CtrlCmd | global.KeyCode.Slash],
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
			};

			const text = model.getValueInRange(range);
			const lines = text.split("\n");

			if (!lines) {
				return;
			}

			const hasComment = lines.some((line) => line.trim().startsWith("#"));

			const comment = lines
				.map((line) => {
					return hasComment ? line.replace(/^# /, "") : `# ${line}`;
				})
				.join("\n");

			editor.executeEdits("comment-query", [
				{
					range,
					text: comment,
				},
			]);
		},
	});
}
