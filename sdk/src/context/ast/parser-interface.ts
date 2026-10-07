/**
 * GSD-X Language Parser Contract
 *
 * All language-specific AST extractors implement this interface.
 */

import { AstParseResult, AstLanguage } from './types';

export interface LanguageParser {
  readonly language: AstLanguage;
  parse(source: string, filePath: string): AstParseResult;
}
