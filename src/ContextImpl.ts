import type { Binding, BindingAny, BindingTargetAny } from "~/bind";
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

type BindingWithCacheRef = BindingAny & { contextCache: ResolutionCache };

export class ContextImpl implements Context {
	public readonly name: string;
	private readonly bindingMap: Map<InjectableAny, BindingTargetWithCacheRef>;
	public readonly cache: ResolutionCache = new Map();

	constructor(
		name: string,
		bindings: Binding<unknown>[],
		parentBindings?: BindingWithCacheRef[],
	) {
		this.name = name;
		const allBindings: BindingWithCacheRef[] = [
			...(parentBindings ?? []),
			...bindings.map((binding) => ({ ...binding, contextCache: this.cache })),
		];
		this.bindingMap = new Map(
			allBindings.map(
				({ source, target, contextCache }) =>
					[source, { target, contextCache }] as const,
			),
		);
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

	async resolveExternalClass<T>(aClass: new () => T): Promise<T> {
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
		return new ContextImpl(name, additionalBindings, this.bindings);
	}

	get bindings(): BindingWithCacheRef[] {
		const result = [...this.bindingMap.entries()];
		return result.map(([source, target]) => ({ source, ...target }));
	}

	getBinding(injectable: InjectableAny): BindingTargetWithCacheRef | undefined {
		if (injectable === Context) {
			return {
				target: {
					scope: "transient",
					kind: "value",
					toValue: this,
				},
				contextCache: this.cache,
			};
		}
		return this.bindingMap.get(injectable);
	}
}
