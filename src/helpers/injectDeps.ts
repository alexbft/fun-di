import { depsProperty } from "~/types/depsProperty";
import type { Deps, ResolvedDeps } from "~/types/Resolved";

export abstract class WithInjectedDeps<TDeps extends Deps> {
  protected readonly deps!: ResolvedDeps<TDeps>;

  protected abstract resolveDeps(): Promise<void>;

  constructor() {
    this.resolveDeps();
  }
}

export function injectDeps<TDeps extends Deps>(
  deps: TDeps,
): typeof WithInjectedDeps<TDeps> {
  abstract class WithInjectedDeps$ extends WithInjectedDeps<TDeps> {}
  Object.defineProperty(WithInjectedDeps$.prototype, depsProperty, {
    enumerable: false,
    writable: false,
    value: deps,
  });
  return WithInjectedDeps$;
}
