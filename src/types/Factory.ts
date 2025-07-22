import type { ObjectInjectable } from "~/types/Injectable";
import type { MaybePromise } from "~/types/MaybePromise";
import type { Deps, ResolvedDeps } from "~/types/Resolved";

export interface Factory<TResult, TDeps extends Deps = Deps>
	extends ObjectInjectable<TResult> {
	get deps(): TDeps;
	run(resolvedDeps: ResolvedDeps<TDeps>): MaybePromise<TResult>;
}
