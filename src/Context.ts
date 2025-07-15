import type { Binding } from "~/bind";
import { injectable } from "~/helpers/injectable";
import type { Injectable } from "~/types/Injectable";
import type { InjectableOptions } from "~/types/InjectableOptions";
import type { Deps, Resolved, ResolvedDeps } from "~/types/Resolved";

export interface Context {
	get name(): string;
	createChildContext(
		name: string,
		additionalBindings: Binding<unknown>[],
	): Context;
	resolve<T extends InjectableOptions<unknown>>(
		injectableOptions: T,
	): Promise<Resolved<T>>;
	resolveDict<TDeps extends Deps>(deps: TDeps): Promise<ResolvedDeps<TDeps>>;
}

export const Context: Injectable<Context> = injectable<Context>("Context");
