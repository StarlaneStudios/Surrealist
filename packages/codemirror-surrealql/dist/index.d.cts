import { LRLanguage, LanguageSupport } from '@codemirror/language';

type Scope = "default" | "permission";
declare const surrealqlLanguage: LRLanguage;
/**
 * The CodeMirror extension used to add support for the SurrealQL language
 */
declare function surrealql(scope?: Scope): LanguageSupport;

export { surrealql, surrealqlLanguage };
