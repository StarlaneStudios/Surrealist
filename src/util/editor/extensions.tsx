import { linter } from "@codemirror/lint";
import { surrealqlLanguage } from "codemirror-surrealql";
import { getSetting } from "../config";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap, CompletionSource } from "@codemirror/autocomplete";
import { keymap, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, lineNumbers, highlightActiveLineGutter, EditorView } from "@codemirror/view";
import { syntaxHighlighting, indentOnInput, bracketMatching, foldGutter, foldKeymap, codeFolding, indentUnit } from "@codemirror/language";
import { indentationMarkers } from '@replit/codemirror-indentation-markers';
import { themeColor } from "../mantine";
import { EditorState, Extension, SelectionRange } from "@codemirror/state";
import { acceptWithTab, runQuery } from "./keybinds";
import { DARK_STYLE, LIGHT_STYLE } from "./theme";
import { useDatabaseStore } from "~/stores/database";
import { getActiveQuery } from "../connection";
import { tryParseParams } from "../helpers";
import { validateQuery } from "../surrealql";
import { EditorKeymap } from "~/types";
import { vim } from "@replit/codemirror-vim";

/**
 * The color scheme used within editors
 */
export const colorTheme = () => [
	syntaxHighlighting(DARK_STYLE, { fallback: true }),
	syntaxHighlighting(LIGHT_STYLE, { fallback: true }),
];

/**
 * Shared base configuration for all dedicated editors
 */
export const editorBase = (): Extension => [
	lineNumbers(),
	highlightActiveLineGutter(),
	highlightSpecialChars(),
	history(),
	codeFolding(),
	foldGutter(),
	drawSelection(),
	dropCursor(),
	indentOnInput(),
	bracketMatching(),
	closeBrackets(),
	autocompletion(),
	rectangularSelection(),
	crosshairCursor(),
	colorTheme(),
	indentationMarkers({
		colors: {
			light: themeColor('slate'),
			dark: themeColor('slate'),
			activeLight: themeColor('slate'),
			activeDark: themeColor('slate'),
		}
	}),
	highlightSelectionMatches({
		highlightWordAroundCursor: true,
		wholeWords: true
	}),
	keymap.of([
		runQuery,
		acceptWithTab,
		indentWithTab,
		...closeBracketsKeymap,
		...defaultKeymap,
		...searchKeymap,
		...historyKeymap,
		...foldKeymap,
		...completionKeymap
	]),
	indentUnit.of("    "),
	EditorState.allowMultipleSelections.of(true),
	EditorView.lineWrapping,
];

/**
 * Shared base configuration for all input editors
 */
export const inputBase = (): Extension => [
	highlightSpecialChars(),
	history(),
	drawSelection(),
	indentOnInput(),
	bracketMatching(),
	closeBrackets(),
	colorTheme(),
	keymap.of([
		...closeBracketsKeymap,
		...historyKeymap,
	]),
	indentUnit.of("    "),
	EditorView.lineWrapping,
];

/**
 * SurrealQL error linting
 */
export const surqlLinting = (): Extension => linter(view => {
	const isEnabled = getSetting("behavior", "queryErrorChecker");
	const content = view.state.doc.toString();

	if (!isEnabled || !content) {
		return [];
	}

	const message = validateQuery(content) || "";
	const match = message.match(/parse error: (failed to parse query at line (\d+) column (\d+).+)\n/i);

	if (match) {
		const reason = match[1].trim();
		const lineNumber = Number.parseInt(match[2]);
		const column = Number.parseInt(match[3]);

		const position = view.state.doc.line(lineNumber).from + column - 1;
		const word = view.state.wordAt(position);

		return [word ? {
			from: word.from,
			to: word.to,
			message: reason,
			severity: "error",
			source: "SurrealQL"
		} : {
			from: position,
			to: position + 1,
			message: reason,
			severity: "error",
			source: "SurrealQL"
		}];
	}

	return [];
});

const TABLE_SOURCE: CompletionSource = (context) => {
	const match = context.matchBefore(/(from|update|create|delete|into) \w*/i);
	const tables = useDatabaseStore.getState().databaseSchema?.tables || [];
	const names = tables.map(table => table.schema.name);

	if (!match) {
		return null;
	}

	return {
		from: match.from + match.text.indexOf(' ') + 1,
		validFor: /\w+$/,
		options: names.map(table => ({
			label: table,
			type: "class"
		}))
	};
};

/**
 * An extension used to autocomplete table names
 */
export const surqlTableCompletion = (): Extension => {
	return surrealqlLanguage.data.of({
		autocomplete: TABLE_SOURCE
	});
};

const VARIABLE_SOURCE: CompletionSource = (context) => {
	const match = context.matchBefore(/\$\w*/i);
	const query = getActiveQuery();

	if (!match || !query) {
		return null;
	}

	const variables = Object.keys(tryParseParams(query.variables));

	return {
		from: match.from,
		validFor: /\$\w+$/,
		options: variables.map(variable => ({
			label: '$' + variable,
			type: "variable"
		}))
	};
};

/**
 * An extension used to autocomplete query variables
 */
export const surqlVariableCompletion = (): Extension => {
	return surrealqlLanguage.data.of({
		autocomplete: VARIABLE_SOURCE
	});
};

export const userEditorKeymap = (keymap: EditorKeymap): Extension => {
	switch (keymap) {
		case "vim": {
			return vim({
				status: true
			});
		}
		case "default": {
			return [];
		}
	}
};

/**
 * An extension that reports on selection changes
 */
export const selectionChanged = (cb: (ranges: SelectionRange) => void): Extension => {
	return EditorView.updateListener.of((update) => {
		if (update.selectionSet) {
			cb(update.state.selection.main);
		}
	});
};
