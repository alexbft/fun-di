/** biome-ignore-all lint/suspicious/noExplicitAny: magic */
import { FunDiError } from "~/errorClasses/FunDiError";
import { getGlobalContext } from "~/globals";
import { depsProperty } from "~/types/depsProperty";
import type { Deps, ResolvedDeps } from "~/types/Resolved";
import { resolveDeps } from "~/types/resolveDeps";

export class WithInjectedDeps<TDeps extends Deps> {
	protected readonly deps!: ResolvedDeps<TDeps>;

	constructor() {
		(this as any)[resolveDeps]();
	}
}

(WithInjectedDeps.prototype as any)[resolveDeps] = function (this: any) {
	const globalContext = getGlobalContext();
	if (!globalContext) {
		throw new FunDiError("Global context is not set");
	}
	globalContext.resolveDict(this[depsProperty]).then((resolvedDeps) => {
		this.deps = resolvedDeps;
	});
};

export function injectDeps<TDeps extends Deps>(
	deps: TDeps,
): typeof WithInjectedDeps<TDeps> {
	const result = class WithInjectedDeps$ extends WithInjectedDeps<TDeps> {};
	Object.defineProperty(result.prototype, depsProperty, {
		enumerable: false,
		writable: false,
		value: deps,
	});
	return result;
}
