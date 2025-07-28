import type { Binding, BindingTargetAny } from "~/bind";
import { Context } from "~/Context";
import { classToFactory } from "~/helpers/classToFactory";
import { extractPathNode } from "~/helpers/extractPathNode";
import { Resolver } from "~/Resolver";
import type { Factory } from "~/types/Factory";
import type { InjectableAny } from "~/types/Injectable";
import type { InjectableOptions } from "~/types/InjectableOptions";
import type { ResolutionCache } from "~/types/ResolutionCache";
import type { Deps, Resolved, ResolvedDeps } from "~/types/Resolved";

export interface BindingTargetWithCacheRef {
  target: BindingTargetAny;
  contextCache: ResolutionCache;
}

export class ContextImpl implements Context {
  private readonly parent: ContextImpl | null;
  private readonly leafName: string;
  private readonly bindingMap: Map<InjectableAny, BindingTargetWithCacheRef>;
  public readonly cache: ResolutionCache = new Map();

  constructor(
    name: string,
    bindings: Binding<unknown>[],
    parent?: ContextImpl,
  ) {
    this.leafName = name;
    this.parent = parent ?? null;
    const allBindings: Binding<unknown>[] = [
      {
        source: Context,
        target: { kind: "value", scope: "singleton", toValue: this },
      },
      ...bindings,
    ];
    this.bindingMap = new Map(
      allBindings.map(
        ({ source, target }) =>
          [source, { target, contextCache: this.cache }] as const,
      ),
    );
  }

  get name(): string {
    if (this.parent) {
      return `${this.parent.name}.${this.leafName}`;
    }
    return this.leafName;
  }

  resolve<T extends InjectableOptions<unknown>>(
    injectableOptions: T,
  ): Promise<Resolved<T>> {
    return new Resolver(this).resolve(injectableOptions, [
      extractPathNode(injectableOptions),
    ]);
  }

  async resolveDict<TDeps extends Deps>(
    deps: TDeps,
  ): Promise<ResolvedDeps<TDeps>> {
    return new Resolver(this).resolveDict(deps, []);
  }

  async resolveExternalClass<T>(aClass: abstract new () => T): Promise<T> {
    return this.resolveExternalFactory(classToFactory(aClass));
  }

  async resolveExternalFactory<T>(factory: Factory<T>): Promise<T> {
    const resolvedDeps = await this.resolveDict(factory.deps);
    return factory.run(resolvedDeps);
  }

  createChildContext(
    name: string,
    additionalBindings: Binding<unknown>[],
  ): Context {
    return new ContextImpl(name, additionalBindings, this);
  }

  getBinding(injectable: InjectableAny): BindingTargetWithCacheRef | undefined {
    const result = this.bindingMap.get(injectable);
    if (result === undefined && this.parent) {
      return this.parent.getBinding(injectable);
    }
    return result;
  }
}
