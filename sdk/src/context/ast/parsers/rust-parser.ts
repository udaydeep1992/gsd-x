/**
 * GSD-X Tree-sitter Rust AST Parser
 *
 * Extracts structs, enums, traits, impl blocks, functions, methods, modules,
 * use declarations, and structural call/implementation relationships.
 */

import * as crypto from 'crypto';
import { LanguageParser } from '../parser-interface';
import { AstParseResult, AstRelationship, SymbolNode, Visibility } from '../types';

export class RustParser implements LanguageParser {
  public readonly language = 'rust' as const;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parserInstance: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(parserInstance: any) {
    this.parserInstance = parserInstance;
  }

  public parse(source: string, filePath: string): AstParseResult {
    const symbols: SymbolNode[] = [];
    const relationships: AstRelationship[] = [];
    const imports: string[] = [];
    const references: string[] = [];
    const errors: string[] = [];

    try {
      const tree = this.parserInstance.parse(source);
      const root = tree.rootNode;
      const lines = source.split('\n');

      // Helper to compute SHA-256
      const computeHash = (text: string) => crypto.createHash('sha256').update(text).digest('hex');

      // Helper to extract doc comments preceding a node
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const extractDocComment = (node: any): string | undefined => {
        let prev = node.previousNamedSibling;
        const docs: string[] = [];
        while (prev && prev.type === 'line_comment') {
          const t = prev.text.trim();
          if (t.startsWith('///') || t.startsWith('//!')) {
            docs.unshift(t.replace(/^\/\/\/[ \t]?/, '').replace(/^\/\/![ \t]?/, ''));
          }
          prev = prev.previousNamedSibling;
        }
        return docs.length > 0 ? docs.join('\n') : undefined;
      };

      // Helper for visibility
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const getVisibility = (node: any): Visibility => {
        for (let i = 0; i < node.childCount; i++) {
          const child = node.child(i);
          if (child && child.type === 'visibility_modifier') {
            return 'public';
          }
        }
        return 'private';
      };

      // Extract calls within a function body
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const extractCalls = (bodyNode: any, callerId: string) => {
        if (!bodyNode) return;
        const queue = [bodyNode];
        while (queue.length > 0) {
          const curr = queue.shift();
          if (!curr) continue;
          if (curr.type === 'call_expression') {
            const fnChild = curr.child(0);
            if (fnChild) {
              const callText = fnChild.text;
              references.push(callText);
              relationships.push({
                sourceId: callerId,
                targetId: callText,
                kind: 'calls',
              });
            }
          }
          for (let i = 0; i < curr.childCount; i++) {
            const c = curr.child(i);
            if (c) queue.push(c);
          }
        }
      };

      // Recursive AST traversal
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const traverse = (node: any, currentNamespace = '', currentParentSymbol = '') => {
        if (!node) return;

        switch (node.type) {
          case 'use_declaration': {
            imports.push(node.text.trim());
            break;
          }

          case 'mod_item': {
            const nameNode = node.childForFieldName('name') || node.children.find((c: any) => c.type === 'identifier');
            const modName = nameNode ? nameNode.text : 'anonymous_mod';
            const qualifiedName = currentNamespace ? `${currentNamespace}::${modName}` : modName;
            const startLine = node.startPosition.row + 1;
            const endLine = node.endPosition.row + 1;
            const id = `${filePath}:${qualifiedName}:${startLine}`;

            symbols.push({
              id,
              name: modName,
              qualifiedName,
              kind: 'module',
              language: 'rust',
              filePath,
              startLine,
              endLine,
              startByte: node.startIndex,
              endByte: node.endIndex,
              signature: `mod ${modName}`,
              parentSymbol: currentParentSymbol || undefined,
              namespace: currentNamespace || undefined,
              visibility: getVisibility(node),
              documentation: extractDocComment(node),
              imports: [],
              references: [],
              dependencies: [],
              hash: computeHash(node.text),
            });

            // Recurse inside module body
            const body = node.childForFieldName('body') || node.children.find((c: any) => c.type === 'declaration_list');
            if (body) {
              for (let i = 0; i < body.childCount; i++) {
                traverse(body.child(i), qualifiedName, modName);
              }
            }
            return;
          }

          case 'struct_item': {
            const nameNode = node.childForFieldName('name') || node.children.find((c: any) => c.type === 'type_identifier');
            const structName = nameNode ? nameNode.text : 'AnonymousStruct';
            const qualifiedName = currentNamespace ? `${currentNamespace}::${structName}` : structName;
            const startLine = node.startPosition.row + 1;
            const endLine = node.endPosition.row + 1;
            const id = `${filePath}:${qualifiedName}:${startLine}`;

            const firstLine = lines[node.startPosition.row]?.trim() || `struct ${structName}`;
            const signature = firstLine.replace(/\{[\s\S]*$/, '').trim();

            symbols.push({
              id,
              name: structName,
              qualifiedName,
              kind: 'struct',
              language: 'rust',
              filePath,
              startLine,
              endLine,
              startByte: node.startIndex,
              endByte: node.endIndex,
              signature,
              parentSymbol: currentParentSymbol || undefined,
              namespace: currentNamespace || undefined,
              visibility: getVisibility(node),
              documentation: extractDocComment(node),
              imports: [],
              references: [],
              dependencies: [],
              hash: computeHash(node.text),
            });
            break;
          }

          case 'enum_item': {
            const nameNode = node.childForFieldName('name') || node.children.find((c: any) => c.type === 'type_identifier');
            const enumName = nameNode ? nameNode.text : 'AnonymousEnum';
            const qualifiedName = currentNamespace ? `${currentNamespace}::${enumName}` : enumName;
            const startLine = node.startPosition.row + 1;
            const endLine = node.endPosition.row + 1;
            const id = `${filePath}:${qualifiedName}:${startLine}`;

            const firstLine = lines[node.startPosition.row]?.trim() || `enum ${enumName}`;
            const signature = firstLine.replace(/\{[\s\S]*$/, '').trim();

            symbols.push({
              id,
              name: enumName,
              qualifiedName,
              kind: 'enum',
              language: 'rust',
              filePath,
              startLine,
              endLine,
              startByte: node.startIndex,
              endByte: node.endIndex,
              signature,
              parentSymbol: currentParentSymbol || undefined,
              namespace: currentNamespace || undefined,
              visibility: getVisibility(node),
              documentation: extractDocComment(node),
              imports: [],
              references: [],
              dependencies: [],
              hash: computeHash(node.text),
            });
            break;
          }

          case 'trait_item': {
            const nameNode = node.childForFieldName('name') || node.children.find((c: any) => c.type === 'type_identifier');
            const traitName = nameNode ? nameNode.text : 'AnonymousTrait';
            const qualifiedName = currentNamespace ? `${currentNamespace}::${traitName}` : traitName;
            const startLine = node.startPosition.row + 1;
            const endLine = node.endPosition.row + 1;
            const id = `${filePath}:${qualifiedName}:${startLine}`;

            const firstLine = lines[node.startPosition.row]?.trim() || `trait ${traitName}`;
            const signature = firstLine.replace(/\{[\s\S]*$/, '').trim();

            symbols.push({
              id,
              name: traitName,
              qualifiedName,
              kind: 'trait',
              language: 'rust',
              filePath,
              startLine,
              endLine,
              startByte: node.startIndex,
              endByte: node.endIndex,
              signature,
              parentSymbol: currentParentSymbol || undefined,
              namespace: currentNamespace || undefined,
              visibility: getVisibility(node),
              documentation: extractDocComment(node),
              imports: [],
              references: [],
              dependencies: [],
              hash: computeHash(node.text),
            });
            break;
          }

          case 'impl_item': {
            // Check if trait implementation: impl Trait for TargetType
            const traitNode = node.childForFieldName('trait');
            const typeNode = node.childForFieldName('type');
            const traitName = traitNode ? traitNode.text : undefined;
            const typeName = typeNode ? typeNode.text : 'AnonymousType';

            const implId = `${filePath}:impl_${typeName}_${traitName || 'self'}:${node.startPosition.row + 1}`;

            if (traitName) {
              relationships.push({
                sourceId: typeName,
                targetId: traitName,
                kind: 'implements',
                metadata: { filePath, line: node.startPosition.row + 1 },
              });
            }

            // Methods inside impl body
            const body = node.childForFieldName('body') || node.children.find((c: any) => c.type === 'declaration_list');
            if (body) {
              for (let i = 0; i < body.childCount; i++) {
                const child = body.child(i);
                if (child && child.type === 'function_item') {
                  const fnNameNode = child.childForFieldName('name') || child.children.find((c: any) => c.type === 'identifier');
                  const fnName = fnNameNode ? fnNameNode.text : 'anonymous_fn';
                  const qualifiedName = `${typeName}::${fnName}`;
                  const startLine = child.startPosition.row + 1;
                  const endLine = child.endPosition.row + 1;
                  const fnId = `${filePath}:${qualifiedName}:${startLine}`;

                  const firstLine = lines[child.startPosition.row]?.trim() || `fn ${fnName}`;
                  const signature = firstLine.replace(/\{[\s\S]*$/, '').trim();

                  symbols.push({
                    id: fnId,
                    name: fnName,
                    qualifiedName,
                    kind: 'method',
                    language: 'rust',
                    filePath,
                    startLine,
                    endLine,
                    startByte: child.startIndex,
                    endByte: child.endIndex,
                    signature,
                    parentSymbol: typeName,
                    namespace: currentNamespace || undefined,
                    visibility: getVisibility(child),
                    documentation: extractDocComment(child),
                    imports: [],
                    references: [],
                    dependencies: [typeName],
                    hash: computeHash(child.text),
                  });

                  relationships.push({
                    sourceId: fnId,
                    targetId: typeName,
                    kind: 'belongs_to',
                  });

                  // Extract calls inside method
                  const fnBody = child.childForFieldName('body') || child.children.find((c: any) => c.type === 'block');
                  if (fnBody) {
                    extractCalls(fnBody, fnId);
                  }
                }
              }
            }
            return;
          }

          case 'function_item': {
            const nameNode = node.childForFieldName('name') || node.children.find((c: any) => c.type === 'identifier');
            const fnName = nameNode ? nameNode.text : 'anonymous_fn';
            const qualifiedName = currentNamespace ? `${currentNamespace}::${fnName}` : fnName;
            const startLine = node.startPosition.row + 1;
            const endLine = node.endPosition.row + 1;
            const id = `${filePath}:${qualifiedName}:${startLine}`;

            const firstLine = lines[node.startPosition.row]?.trim() || `fn ${fnName}`;
            const signature = firstLine.replace(/\{[\s\S]*$/, '').trim();

            symbols.push({
              id,
              name: fnName,
              qualifiedName,
              kind: 'function',
              language: 'rust',
              filePath,
              startLine,
              endLine,
              startByte: node.startIndex,
              endByte: node.endIndex,
              signature,
              parentSymbol: currentParentSymbol || undefined,
              namespace: currentNamespace || undefined,
              visibility: getVisibility(node),
              documentation: extractDocComment(node),
              imports: [],
              references: [],
              dependencies: [],
              hash: computeHash(node.text),
            });

            // Extract calls inside function
            const body = node.childForFieldName('body') || node.children.find((c: any) => c.type === 'block');
            if (body) {
              extractCalls(body, id);
            }
            break;
          }
        }

        // Traverse remaining children
        for (let i = 0; i < node.childCount; i++) {
          const child = node.child(i);
          if (child && child.type !== 'impl_item' && child.type !== 'mod_item') {
            traverse(child, currentNamespace, currentParentSymbol);
          }
        }
      };

      for (let i = 0; i < root.childCount; i++) {
        traverse(root.child(i));
      }
    } catch (err) {
      errors.push(`Rust AST parse error in ${filePath}: ${err instanceof Error ? err.message : String(err)}`);
    }

    return { symbols, relationships, imports, references, errors };
  }
}
