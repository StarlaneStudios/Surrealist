import classes from "./style.module.scss";
import clsx from "clsx";
import { Box, BoxProps } from "@mantine/core";
import { useEffect, useRef } from "react";
import { useSetting } from "~/hooks/config";
import { Compartment, EditorState, Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { editorBase, userEditorKeymap } from "~/util/editor/extensions";
import { forceLinting } from "@codemirror/lint";

interface EditorRef {
	editor: EditorView;
	editable: Compartment;
}

export interface CodeEditorProps extends BoxProps {
	value?: string;
	extensions?: Extension[];
	readOnly?: boolean;
	autoFocus?: boolean;
	userKeymap?: boolean;
	onMount?: (editor: EditorView) => void;
	onChange?: (value: string) => void;
}

export function CodeEditor(props: CodeEditorProps) {
	const {
		value,
		onChange,
		extensions,
		className,
		readOnly,
		userKeymap,
		autoFocus,
		onMount,
		...rest
	} = props;

	const ref = useRef<HTMLDivElement | null>(null);
	const editorRef = useRef<EditorRef>();
	const [editorScale] = useSetting("appearance", "editorScale");
	const [editorKeymap] = useSetting("behavior", "editorKeymap");

	const textSize = Math.floor(15 * (editorScale / 100));

	useEffect(() => {
		const editable = new Compartment();
		const editableExt = editable.of(EditorState.readOnly.of(!!readOnly));

		const changeHandler = EditorView.updateListener.of((update) => {
			if (update.docChanged) {
				onChange?.(update.state.doc.toString());
			}
		});

		const initialState = EditorState.create({
			doc: value,
			extensions: [
				userEditorKeymap(
					!userKeymap || readOnly ? 'default': editorKeymap
				),
				editorBase(),
				changeHandler,
				editableExt,
				extensions || [],
			]
		});

		const editor = new EditorView({
			state: initialState,
			parent: ref.current!,
			scrollTo: EditorView.scrollIntoView(0),
		});

		editorRef.current = {
			editor,
			editable
		};

		if (autoFocus) {
			const timer = setInterval(() => {
				editor.focus();
				if(editor.hasFocus) clearInterval(timer);
			}, 50);
		}

		onMount?.(editor);

		return () => {
			editor.destroy();
		};
	}, [editorKeymap]);

	useEffect(() => {
		const { editor } = editorRef.current!;

		if (value == editor.state.doc.toString()) {
			return;
		}

		const transaction = editor.state.update({
			changes: {
				from: 0,
				to: editor.state.doc.length,
				insert: value
			},
			effects: [
				EditorView.scrollIntoView(0)
			]
		});

		editor.dispatch(transaction);
		forceLinting(editor);
	}, [value]);

	useEffect(() => {
		const { editor, editable } = editorRef.current!;
		const editableExt = EditorState.readOnly.of(!!readOnly);

		editor.dispatch({
			effects: editable.reconfigure(editableExt)
		});
	}, [readOnly]);

	return (
		<Box
			ref={ref}
			className={clsx(classes.root, className)}
			fz={textSize}
			{...rest}
		/>
	);
}
