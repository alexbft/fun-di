import type { Binding } from "~/bind";
import { Context } from "~/Context";
import { classToFactory } from "~/helpers/classToFactory";
import { groupBy } from "~/helpers/groupBy";
import { ResolutionPath } from "~/ResolutionPath";
import { Resolver } from "~/Resolver";
import type { Factory } from "~/types/Factory";
import type { InjectableAny } from "~/types/Injectable";
import type { InjectableOptions } from "~/types/InjectableOptions";
import type { ResolutionCache } from "~/types/ResolutionCache";
import type { Deps, Resolved, ResolvedDeps } from "~/types/Resolved";

export interface BindingWithCacheRef {
  binding: Binding<unknown>;
  contextCache: ResolutionCache;
}

export class ContextImpl implements Context {
  public readonly parent: ContextImpl | null;
  private readonly leafName: string;
  private readonly bindingMap: Map<InjectableAny, Set<Binding<unknown>>>;
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
    this.bindingMap = groupBy(
      allBindings.toReversed(),
      (binding) => binding.source,
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
    return new Resolver().resolve(
      injectableOptions,
      ResolutionPath.root(this).add({ injectableOptions }),
    );
  }

  async resolveDict<TDeps extends Deps>(
    deps: TDeps,
  ): Promise<ResolvedDeps<TDeps>> {
    return new Resolver().resolveDict(deps, ResolutionPath.root(this));
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

  getBinding(injectable: InjectableAny): BindingWithCacheRef | undefined {
    const result = this.bindingMap.get(injectable);
    if (result === undefined && this.parent) {
      return this.parent.getBinding(injectable);
    }
    if (result === undefined) {
      return result;
    }
    const first = result.values().next().value;
    if (!first) {
      return undefined;
    }
    return {
      binding: first,
      contextCache: this.cache,
    };
  }

  private getAllBindingsInternal(
    injectable: InjectableAny,
  ): Map<Binding<unknown>, ResolutionCache> {
    const result = this.parent
      ? this.parent.getAllBindingsInternal(injectable)
      : new Map<Binding<unknown>, ResolutionCache>();
    const thisBindings = this.bindingMap.get(injectable);
    if (thisBindings) {
      const thisBindingsAsList = [...thisBindings];
      thisBindingsAsList.reverse();
      for (const binding of thisBindingsAsList) {
        result.set(binding, this.cache);
      }
    }
    return result;
  }

  getAllBindings(injectable: InjectableAny): BindingWithCacheRef[] {
    return [...this.getAllBindingsInternal(injectable).entries()].map(
      ([binding, cache]) => ({
        binding,
        contextCache: cache,
      }),
    );
  }
}
