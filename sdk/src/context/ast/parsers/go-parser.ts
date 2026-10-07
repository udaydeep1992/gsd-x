/**
 * GSD-X Tree-sitter Go AST Parser
 *
 * Extracts packages, structs, interfaces, functions, methods (with receivers),
 * imports, and structural call/receiver relationships.
 */

import * as crypto from 'crypto';
import { LanguageParser } from '../parser-interface';
import { AstParseResult, AstRelationship, SymbolNode, Visibility } from '../types';

export class GoParser implements LanguageParser {
  public readonly language = 'go' as const;

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

      let currentPackage = '';

      const computeHash = (text: string) => crypto.createHash('sha256').update(text).digest('hex');

      // Go visibility: Uppercase = exported (public), lowercase = unexported (private)
      const getGoVisibility = (name: string): Visibility => {
        if (!name) return 'private';
        const first = name.charAt(0);
        return first === first.toUpperCase() && first !== first.toLowerCase() ? 'public' : 'private';
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const extractDocComment = (node: any): string | undefined => {
        let prev = node.previousNamedSibling;
        const docs: string[] = [];
        while (prev && prev.type === 'comment') {
          const t = prev.text.trim();
          docs.unshift(t.replace(/^\/\/[ \t]?/, '').replace(/^\/\*[ \t]?/, '').replace(/\*\/$/, ''));
          prev = prev.previousNamedSibling;
        }
        return docs.length > 0 ? docs.join('\n') : undefined;
      };

      // Extract calls in block
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const extractCalls = (blockNode: any, callerId: string) => {
        if (!blockNode) return;
        const queue = [blockNode];
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const traverse = (node: any) => {
        if (!node) return;

        switch (node.type) {
          case 'package_clause': {
            const pkgId = node.children.find((c: any) => c.type === 'package_identifier');
            if (pkgId) {
              currentPackage = pkgId.text;
              const startLine = node.startPosition.row + 1;
              const endLine = node.endPosition.row + 1;
              symbols.push({
                id: `${filePath}:pkg:${currentPackage}:${startLine}`,
                name: currentPackage,
                qualifiedName: currentPackage,
                kind: 'module',
                language: 'go',
                filePath,
                startLine,
                endLine,
                startByte: node.startIndex,
                endByte: node.endIndex,
                signature: `package ${currentPackage}`,
                visibility: 'public',
                documentation: extractDocComment(node),
                imports: [],
                references: [],
                dependencies: [],
                hash: computeHash(node.text),
              });
            }
            break;
          }

          case 'import_declaration': {
            imports.push(node.text.trim());
            break;
          }

          case 'type_declaration': {
            for (let i = 0; i < node.childCount; i++) {
              const child = node.child(i);
              if (child && child.type === 'type_spec') {
                const nameNode = child.childForFieldName('name') || child.children.find((c: any) => c.type === 'type_identifier');
                const typeName = nameNode ? nameNode.text : 'AnonymousType';
                const typeBody = child.childForFieldName('type');
                const isStruct = typeBody && typeBody.type === 'struct_type';
                const isInterface = typeBody && typeBody.type === 'interface_type';

                const kind = isStruct ? 'struct' : isInterface ? 'interface' : 'type';
                const qualifiedName = currentPackage ? `${currentPackage}.${typeName}` : typeName;
                const startLine = child.startPosition.row + 1;
                const endLine = child.endPosition.row + 1;
                const id = `${filePath}:${qualifiedName}:${startLine}`;

                const firstLine = lines[child.startPosition.row]?.trim() || `type ${typeName}`;
                const signature = firstLine.replace(/\{[\s\S]*$/, '').trim();

                symbols.push({
                  id,
                  name: typeName,
                  qualifiedName,
                  kind,
                  language: 'go',
                  filePath,
                  startLine,
                  endLine,
                  startByte: child.startIndex,
                  endByte: child.endIndex,
                  signature,
                  namespace: currentPackage || undefined,
                  visibility: getGoVisibility(typeName),
                  documentation: extractDocComment(node),
                  imports: [],
                  references: [],
                  dependencies: [],
                  hash: computeHash(child.text),
                });
              }
            }
            break;
          }

          case 'method_declaration': {
            const nameNode = childFieldOrType(node, 'name', 'field_identifier');
            const methodName = nameNode ? nameNode.text : 'anonymous_method';

            // Extract receiver (e.g. (u *User) -> User)
            let receiverType = '';
            const receiverNode = node.childForFieldName('receiver');
            if (receiverNode) {
              const recText = receiverNode.text;
              const match = recText.match(/\*?([a-zA-Z0-9_$]+)\s*\)/);
              if (match) receiverType = match[1];
            }

            const qualifiedName = receiverType ? `${receiverType}.${methodName}` : methodName;
            const startLine = node.startPosition.row + 1;
            const endLine = node.endPosition.row + 1;
            const methodId = `${filePath}:${qualifiedName}:${startLine}`;

            const firstLine = lines[node.startPosition.row]?.trim() || `func ${methodName}`;
            const signature = firstLine.replace(/\{[\s\S]*$/, '').trim();

            symbols.push({
              id: methodId,
              name: methodName,
              qualifiedName,
              kind: 'method',
              language: 'go',
              filePath,
              startLine,
              endLine,
              startByte: node.startIndex,
              endByte: node.endIndex,
              signature,
              parentSymbol: receiverType || undefined,
              namespace: currentPackage || undefined,
              visibility: getGoVisibility(methodName),
              documentation: extractDocComment(node),
              imports: [],
              references: [],
              dependencies: receiverType ? [receiverType] : [],
              hash: computeHash(node.text),
            });

            if (receiverType) {
              relationships.push({
                sourceId: methodId,
                targetId: receiverType,
                kind: 'belongs_to',
              });
            }

            // Extract calls
            const body = node.childForFieldName('body');
            if (body) {
              extractCalls(body, methodId);
            }
            break;
          }

          case 'function_declaration': {
            const nameNode = childFieldOrType(node, 'name', 'identifier');
            const fnName = nameNode ? nameNode.text : 'anonymous_fn';
            const qualifiedName = currentPackage ? `${currentPackage}.${fnName}` : fnName;
            const startLine = node.startPosition.row + 1;
            const endLine = node.endPosition.row + 1;
            const fnId = `${filePath}:${qualifiedName}:${startLine}`;

            const firstLine = lines[node.startPosition.row]?.trim() || `func ${fnName}`;
            const signature = firstLine.replace(/\{[\s\S]*$/, '').trim();

            symbols.push({
              id: fnId,
              name: fnName,
              qualifiedName,
              kind: 'function',
              language: 'go',
              filePath,
              startLine,
              endLine,
              startByte: node.startIndex,
              endByte: node.endIndex,
              signature,
              namespace: currentPackage || undefined,
              visibility: getGoVisibility(fnName),
              documentation: extractDocComment(node),
              imports: [],
              references: [],
              dependencies: [],
              hash: computeHash(node.text),
            });

            const body = node.childForFieldName('body');
            if (body) {
              extractCalls(body, fnId);
            }
            break;
          }
        }

        for (let i = 0; i < node.childCount; i++) {
          const child = node.child(i);
          if (child && child.type !== 'block') {
            traverse(child);
          }
        }
      };

      for (let i = 0; i < root.childCount; i++) {
        traverse(root.child(i));
      }
    } catch (err) {
      errors.push(`Go AST parse error in ${filePath}: ${err instanceof Error ? err.message : String(err)}`);
    }

    return { symbols, relationships, imports, references, errors };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function childFieldOrType(node: any, fieldName: string, typeName: string): any {
  return node.childForFieldName(fieldName) || node.children.find((c: any) => c.type === typeName);
}
