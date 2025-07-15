import { FunDiError } from "~/errorClasses/FunDiError";
import { getGlobalContext } from "~/globals";
import { extractName } from "~/helpers/extractPathNode";
import type { Factory } from "~/types/Factory";
import type { MaybePromise } from "~/types/MaybePromise";
import type { Deps, ResolvedDeps } from "~/types/Resolved";

export function factory<TOutput, TDeps extends Deps>(
	deps: TDeps,
	run: (resolvedDeps: ResolvedDeps<TDeps>) => MaybePromise<TOutput>,
): Factory<TOutput, TDeps> {
	const result = (async () => {
		const globalContext = getGlobalContext();
		if (!globalContext) {
			throw new FunDiError("Global context is not set");
		}
		const resolvedDeps = await globalContext.resolveDict(result.deps);
		return result.run(resolvedDeps);
	}) as Factory<TOutput, TDeps>;
	(result as { deps: TDeps }).deps = deps;
	result.run = run;
	if (run.name) {
		result.displayName = run.name;
	}
	result.toString = function () {
		return `Factory(${extractName(this) ?? ""})`;
	};
	return result;
}
