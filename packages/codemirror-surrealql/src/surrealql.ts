import { parser } from "lezer-surrealql";
import { continuedIndent, indentNodeProp, foldNodeProp, foldInside, LRLanguage, LanguageSupport } from "@codemirror/language";
import { parseMixed } from "@lezer/common";
import { parser as jsParser } from "@lezer/javascript";

type Scope = "default" | "permission";

export const surrealqlLanguage = LRLanguage.define({
	name: "surrealql",
	parser: parser.configure({
		props: [
			indentNodeProp.add({
				Object: continuedIndent({ except: /^\s*}/ }),
				Array: continuedIndent({ except: /^\s*]/ })
			}),
			foldNodeProp.add({
				"Object Array": foldInside
			})
		],
		wrap: parseMixed(node => {
			return node.name == "JavaScript" ? {parser: jsParser} : null;
		})
	}),
	languageData: {
		closeBrackets: { brackets: ["[", "{", '"', "'", "("] },
		indentOnInput: /^\s*[\]}]$/,
		commentTokens: { line: "--" },
	}
});

const defaultLanguage = surrealqlLanguage.configure({
	top: 'SurrealQL'
});

const permissionInputLanguage = surrealqlLanguage.configure({
	top: 'PermissionInput'
});

/**
 * The CodeMirror extension used to add support for the SurrealQL language
 */
export function surrealql(scope: Scope = 'default') {
	return new LanguageSupport(scope === 'permission' ? permissionInputLanguage : defaultLanguage);
}
