import classes from "./style.module.scss";
import clsx from "clsx";
import { Box, BoxProps } from "@mantine/core";
import { useEffect, useRef } from "react";
import { useSetting } from "~/hooks/config";
import { Compartment, EditorState, Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { editorBase } from "~/util/editor/extensions";
import { forceLinting } from "@codemirror/lint";
import { useInterfaceStore } from "~/stores/interface";

interface EditorRef {
	editor: EditorView;
	editable: Compartment;
}

export interface CodeEditorProps extends BoxProps {
	value?: string;
	extensions?: Extension[];
	readOnly?: boolean;
	autoFocus?: boolean;
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
		autoFocus,
		onMount,
		...rest
	} = props;

	const ref = useRef<HTMLDivElement | null>(null);
	const editorRef = useRef<EditorRef>();
	const [editorScale] = useSetting("appearance", "editorScale");

	const setHasEditorFocus = useInterfaceStore((s) => s.setHasEditorFocus);

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

		const handleFocus =  () => {
			setHasEditorFocus(true);
		};
		const handleBlur = () => {
			setHasEditorFocus(false);
		};

		editor.contentDOM.addEventListener("focus", handleFocus);
		editor.contentDOM.addEventListener("blur", handleBlur);

		if (autoFocus) {
			const timer = setInterval(() => {
				editor.focus();
				if(editor.hasFocus) clearInterval(timer);
			}, 50);
		}

		onMount?.(editor);

		return () => {
			editor.contentDOM.removeEventListener("focus", handleFocus);
			editor.contentDOM.removeEventListener("blur", handleBlur);
			editor.destroy();
			setHasEditorFocus(false);
		};
	}, []);

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
