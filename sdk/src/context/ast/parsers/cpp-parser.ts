/**
 * GSD-X Tree-sitter C++ AST Parser
 *
 * Extracts namespaces, classes, structs, functions, methods, templates,
 * includes, inheritance, and structural call relationships.
 */

import * as crypto from 'crypto';
import { LanguageParser } from '../parser-interface';
import { AstParseResult, AstRelationship, SymbolNode, Visibility } from '../types';

export class CppParser implements LanguageParser {
  public readonly language = 'cpp' as const;

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

      const computeHash = (text: string) => crypto.createHash('sha256').update(text).digest('hex');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const extractDocComment = (node: any): string | undefined => {
        let prev = node.previousNamedSibling;
        const docs: string[] = [];
        while (prev && (prev.type === 'comment' || prev.type === 'line_comment')) {
          const t = prev.text.trim();
          docs.unshift(t.replace(/^\/\/[ \t]?/, '').replace(/^\/\*[ \t]?/, '').replace(/\*\/$/, ''));
          prev = prev.previousNamedSibling;
        }
        return docs.length > 0 ? docs.join('\n') : undefined;
      };

      // Extract calls in compound statement
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const traverse = (node: any, currentNamespace = '', currentClass = '', currentVisibility: Visibility = 'public') => {
        if (!node) return;

        switch (node.type) {
          case 'preproc_include': {
            imports.push(node.text.trim());
            break;
          }

          case 'namespace_definition': {
            const nameNode = node.childForFieldName('name') || node.children.find((c: any) => c.type === 'namespace_identifier' || c.type === 'identifier');
            const nsName = nameNode ? nameNode.text : 'anonymous_namespace';
            const qualifiedName = currentNamespace ? `${currentNamespace}::${nsName}` : nsName;
            const startLine = node.startPosition.row + 1;
            const endLine = node.endPosition.row + 1;

            symbols.push({
              id: `${filePath}:${qualifiedName}:${startLine}`,
              name: nsName,
              qualifiedName,
              kind: 'namespace',
              language: 'cpp',
              filePath,
              startLine,
              endLine,
              startByte: node.startIndex,
              endByte: node.endIndex,
              signature: `namespace ${nsName}`,
              namespace: currentNamespace || undefined,
              visibility: 'public',
              documentation: extractDocComment(node),
              imports: [],
              references: [],
              dependencies: [],
              hash: computeHash(node.text),
            });

            const body = node.childForFieldName('body') || node.children.find((c: any) => c.type === 'declaration_list');
            if (body) {
              for (let i = 0; i < body.childCount; i++) {
                traverse(body.child(i), qualifiedName, currentClass, 'public');
              }
            }
            return;
          }

          case 'class_specifier':
          case 'struct_specifier': {
            const isClass = node.type === 'class_specifier';
            const nameNode = node.childForFieldName('name') || node.children.find((c: any) => c.type === 'type_identifier');
            const typeName = nameNode ? nameNode.text : 'AnonymousType';
            const qualifiedName = currentNamespace ? `${currentNamespace}::${typeName}` : typeName;
            const startLine = node.startPosition.row + 1;
            const endLine = node.endPosition.row + 1;
            const classId = `${filePath}:${qualifiedName}:${startLine}`;

            const firstLine = lines[node.startPosition.row]?.trim() || `${isClass ? 'class' : 'struct'} ${typeName}`;
            const signature = firstLine.replace(/\{[\s\S]*$/, '').trim();

            symbols.push({
              id: classId,
              name: typeName,
              qualifiedName,
              kind: isClass ? 'class' : 'struct',
              language: 'cpp',
              filePath,
              startLine,
              endLine,
              startByte: node.startIndex,
              endByte: node.endIndex,
              signature,
              namespace: currentNamespace || undefined,
              visibility: currentVisibility,
              documentation: extractDocComment(node),
              imports: [],
              references: [],
              dependencies: [],
              hash: computeHash(node.text),
            });

            // Base class / inheritance
            for (let i = 0; i < node.childCount; i++) {
              const child = node.child(i);
              if (child && child.type === 'base_class_clause') {
                const baseTypes = child.children.filter((c: any) => c.type === 'type_identifier');
                for (const bt of baseTypes) {
                  relationships.push({
                    sourceId: typeName,
                    targetId: bt.text,
                    kind: 'inherits',
                  });
                }
              }
            }

            // Member declarations with visibility tracking
            const body = node.childForFieldName('body') || node.children.find((c: any) => c.type === 'field_declaration_list');
            if (body) {
              let memberVis: Visibility = isClass ? 'private' : 'public';
              for (let i = 0; i < body.childCount; i++) {
                const member = body.child(i);
                if (!member) continue;
                if (member.type === 'access_specifier') {
                  const t = member.text.toLowerCase();
                  if (t.includes('public')) memberVis = 'public';
                  else if (t.includes('protected')) memberVis = 'protected';
                  else if (t.includes('private')) memberVis = 'private';
                } else {
                  traverse(member, currentNamespace, typeName, memberVis);
                }
              }
            }
            return;
          }

          case 'function_definition': {
            const declarator = node.childForFieldName('declarator');
            let fnName = 'anonymous_fn';
            if (declarator) {
              // Can be function_declarator or qualified_identifier
              const idNode = declarator.children.find((c: any) => c.type === 'identifier' || c.type === 'field_identifier')
                || declarator.childForFieldName('declarator');
              fnName = idNode ? idNode.text : declarator.text.replace(/\([\s\S]*$/, '').trim();
            }

            const isMethod = !!currentClass || fnName.includes('::');
            const qualifiedName = currentClass
              ? `${currentClass}::${fnName}`
              : currentNamespace
              ? `${currentNamespace}::${fnName}`
              : fnName;
            const startLine = node.startPosition.row + 1;
            const endLine = node.endPosition.row + 1;
            const fnId = `${filePath}:${qualifiedName}:${startLine}`;

            const firstLine = lines[node.startPosition.row]?.trim() || `void ${fnName}()`;
            const signature = firstLine.replace(/\{[\s\S]*$/, '').trim();

            symbols.push({
              id: fnId,
              name: fnName,
              qualifiedName,
              kind: isMethod ? 'method' : 'function',
              language: 'cpp',
              filePath,
              startLine,
              endLine,
              startByte: node.startIndex,
              endByte: node.endIndex,
              signature,
              parentSymbol: currentClass || undefined,
              namespace: currentNamespace || undefined,
              visibility: currentVisibility,
              documentation: extractDocComment(node),
              imports: [],
              references: [],
              dependencies: currentClass ? [currentClass] : [],
              hash: computeHash(node.text),
            });

            if (currentClass) {
              relationships.push({
                sourceId: fnId,
                targetId: currentClass,
                kind: 'belongs_to',
              });
            }

            // Extract calls inside body
            const body = node.childForFieldName('body') || node.children.find((c: any) => c.type === 'compound_statement');
            if (body) {
              extractCalls(body, fnId);
            }
            return;
          }

          case 'field_declaration': {
            // Function prototype inside class body
            const declarator = node.children.find((c: any) => c.type === 'function_declarator');
            if (declarator) {
              const nameNode = declarator.children.find((c: any) => c.type === 'field_identifier' || c.type === 'identifier');
              const methodName = nameNode ? nameNode.text : declarator.text.replace(/\([\s\S]*$/, '').trim();
              const qualifiedName = currentClass ? `${currentClass}::${methodName}` : methodName;
              const startLine = node.startPosition.row + 1;
              const endLine = node.endPosition.row + 1;
              const methodId = `${filePath}:${qualifiedName}:${startLine}`;

              symbols.push({
                id: methodId,
                name: methodName,
                qualifiedName,
                kind: 'method',
                language: 'cpp',
                filePath,
                startLine,
                endLine,
                startByte: node.startIndex,
                endByte: node.endIndex,
                signature: node.text.replace(/;$/, '').trim(),
                parentSymbol: currentClass || undefined,
                namespace: currentNamespace || undefined,
                visibility: currentVisibility,
                documentation: extractDocComment(node),
                imports: [],
                references: [],
                dependencies: currentClass ? [currentClass] : [],
                hash: computeHash(node.text),
              });

              if (currentClass) {
                relationships.push({
                  sourceId: methodId,
                  targetId: currentClass,
                  kind: 'belongs_to',
                });
              }
            }
            break;
          }
        }

        for (let i = 0; i < node.childCount; i++) {
          const child = node.child(i);
          if (child && child.type !== 'compound_statement') {
            traverse(child, currentNamespace, currentClass, currentVisibility);
          }
        }
      };

      for (let i = 0; i < root.childCount; i++) {
        traverse(root.child(i));
      }
    } catch (err) {
      errors.push(`C++ AST parse error in ${filePath}: ${err instanceof Error ? err.message : String(err)}`);
    }

    return { symbols, relationships, imports, references, errors };
  }
}
