import type { ContextImpl } from "~/ContextImpl";
import { DependencyCycleError } from "~/errorClasses/DependencyCycleError";
import { extractName } from "~/helpers/extractName";
import { isDecoratedInjectable } from "~/helpers/isDecoratedInjectable";
import { isParentInjectable } from "~/helpers/isParentInjectable";
import type { InjectableOptionsAny } from "~/types/InjectableOptions";
import type { PathNode } from "~/types/PathNode";

export interface AddPathOptions {
  injectableOptions: InjectableOptionsAny;
  alias?: string;
}

export class ResolutionPath {
  private readonly rootContext: ContextImpl;
  private readonly nodes: PathNode[];

  static root(context: ContextImpl): ResolutionPath {
    return new ResolutionPath(context, []);
  }

  private constructor(context: ContextImpl, nodes: PathNode[]) {
    this.rootContext = context;
    this.nodes = nodes;
  }

  get context(): ContextImpl | null {
    return this.nodes.at(-1)?.context ?? this.rootContext;
  }

  private buildNewNode({ injectableOptions, alias }: AddPathOptions): PathNode {
    const injectable = isDecoratedInjectable(injectableOptions)
      ? injectableOptions.injectable
      : injectableOptions;
    const context = isParentInjectable(injectableOptions)
      ? (this.context?.parent ?? null)
      : this.context;
    const name = alias ?? extractName(injectable) ?? "[no name]";
    return { injectable, context, name };
  }

  add(options: AddPathOptions): ResolutionPath {
    const newNode = this.buildNewNode(options);
    const result = new ResolutionPath(this.rootContext, [
      ...this.nodes,
      newNode,
    ]);
    if (
      this.nodes.some(
        (node) =>
          node.injectable === newNode.injectable &&
          node.context === newNode.context,
      )
    ) {
      throw new DependencyCycleError(`Cycle detected: ${result.render()}`);
    }
    return result;
  }

  truncateToLastNode(): ResolutionPath {
    const newNodes =
      this.nodes.length > 0 ? [this.nodes[this.nodes.length - 1]] : [];
    return new ResolutionPath(this.rootContext, newNodes);
  }

  render(): string {
    function renderNodeGroup(context: ContextImpl | null, nodes: PathNode[]) {
      return `${context?.name ?? "null"} (${nodes.map((node) => node.name).join(" -> ")})`;
    }

    const parts: string[] = [];
    let buf: PathNode[] = [];
    let curContext: ContextImpl | null = null;
    for (const node of this.nodes) {
      if (node.context !== curContext) {
        if (buf.length > 0) {
          parts.push(renderNodeGroup(curContext, buf));
        }
        curContext = node.context;
        buf = [node];
      } else {
        buf.push(node);
      }
    }
    if (buf.length > 0) {
      parts.push(renderNodeGroup(curContext, buf));
    }

    return parts.join(" -> ");
  }

  toString(): string {
    return `ResolutionPath(${this.render()})`;
  }
}
