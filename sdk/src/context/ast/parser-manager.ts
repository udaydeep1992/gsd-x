/**
 * GSD-X Tree-sitter Parser Manager & Language Dispatcher
 *
 * Manages web-tree-sitter WebAssembly runtimes, lazy-loads language grammars,
 * and routes source files to their respective AST extractors with graceful fallback.
 */

import * as path from 'path';
import * as fs from 'fs';
import { AstLanguage, AstParseResult } from './types';
import { LanguageParser } from './parser-interface';
import { RustParser } from './parsers/rust-parser';
import { GoParser } from './parsers/go-parser';
import { CppParser } from './parsers/cpp-parser';
import { FallbackParser } from './parsers/fallback-parser';

export class ParserManager {
  private static initialized = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static ParserConstructor: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static loadedLanguages: Map<string, any> = new Map();
  private static parsers: Map<string, LanguageParser> = new Map();

  /**
   * Initializes the WebAssembly Tree-sitter runtime once.
   */
  public static async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Resolve web-tree-sitter
      const ParserModule = require('web-tree-sitter');
      this.ParserConstructor = ParserModule.default || ParserModule;

      await this.ParserConstructor.init();
      this.initialized = true;
    } catch (err) {
      // If WebAssembly initialization fails, system operates in resilient fallback mode
      this.initialized = false;
    }
  }

  /**
   * Detects the programming language from file extension.
   */
  public static detectLanguage(filePath: string): AstLanguage {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.rs':
        return 'rust';
      case '.go':
        return 'go';
      case '.cpp':
      case '.cc':
      case '.cxx':
      case '.hpp':
      case '.h':
        return 'cpp';
      case '.c':
        return 'c';
      case '.ts':
      case '.tsx':
      case '.cts':
      case '.mts':
        return 'typescript';
      case '.js':
      case '.jsx':
      case '.cjs':
      case '.mjs':
        return 'javascript';
      case '.py':
        return 'python';
      default:
        return 'unknown';
    }
  }

  /**
   * Retrieves or instantiates the language parser for a given language.
   */
  public static async getParser(language: AstLanguage): Promise<LanguageParser> {
    if (this.parsers.has(language)) {
      return this.parsers.get(language)!;
    }

    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized || !this.ParserConstructor) {
      const fallback = new FallbackParser(language);
      this.parsers.set(language, fallback);
      return fallback;
    }

    try {
      const wasmPath = this.resolveWasmPath(language);
      if (wasmPath && fs.existsSync(wasmPath)) {
        let lang = this.loadedLanguages.get(language);
        if (!lang) {
          lang = await this.ParserConstructor.Language.load(wasmPath);
          this.loadedLanguages.set(language, lang);
        }

        const parserInstance = new this.ParserConstructor();
        parserInstance.setLanguage(lang);

        let parser: LanguageParser;
        switch (language) {
          case 'rust':
            parser = new RustParser(parserInstance);
            break;
          case 'go':
            parser = new GoParser(parserInstance);
            break;
          case 'cpp':
          case 'c':
            parser = new CppParser(parserInstance);
            break;
          default:
            parser = new FallbackParser(language);
        }

        this.parsers.set(language, parser);
        return parser;
      }
    } catch {
      // Fallback on WASM load error
    }

    const fallback = new FallbackParser(language);
    this.parsers.set(language, fallback);
    return fallback;
  }

  /**
   * Parses source code using the appropriate AST parser.
   */
  public static async parse(source: string, filePath: string): Promise<AstParseResult> {
    const lang = this.detectLanguage(filePath);
    const parser = await this.getParser(lang);
    try {
      return parser.parse(source, filePath);
    } catch (err) {
      // Graceful failover to fallback parser on unhandled syntax error
      const fallback = new FallbackParser(lang);
      const res = fallback.parse(source, filePath);
      res.errors.push(`Tree-sitter parse failed, used fallback: ${err instanceof Error ? err.message : String(err)}`);
      return res;
    }
  }

  private static resolveWasmPath(language: AstLanguage): string | null {
    let wasmFileName = '';
    switch (language) {
      case 'rust':
        wasmFileName = 'tree-sitter-rust.wasm';
        break;
      case 'go':
        wasmFileName = 'tree-sitter-go.wasm';
        break;
      case 'cpp':
        wasmFileName = 'tree-sitter-cpp.wasm';
        break;
      case 'c':
        wasmFileName = 'tree-sitter-c.wasm';
        break;
      default:
        return null;
    }

    // Attempt resolution from node_modules/tree-sitter-wasms/out
    try {
      const wasmPkgDir = path.dirname(require.resolve('tree-sitter-wasms/package.json'));
      return path.join(wasmPkgDir, 'out', wasmFileName);
    } catch {
      // Try relative from project root
      const fallback = path.join(process.cwd(), 'node_modules', 'tree-sitter-wasms', 'out', wasmFileName);
      if (fs.existsSync(fallback)) return fallback;
    }

    return null;
  }
}
