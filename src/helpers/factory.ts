import { extractName } from "~/helpers/extractPathNode";
import type { Factory } from "~/types/Factory";
import type { MaybePromise } from "~/types/MaybePromise";
import type { Deps, ResolvedDeps } from "~/types/Resolved";

export function factory<TOutput, TDeps extends Deps>(
  deps: TDeps,
  run: (resolvedDeps: ResolvedDeps<TDeps>) => MaybePromise<TOutput>,
): Factory<TOutput, TDeps> {
  const result = { deps, run } as Factory<TOutput, TDeps>;
  if (run.name) {
    result.displayName = run.name;
  }
  result.toString = function () {
    return `Factory(${extractName(this) ?? ""})`;
  };
  return result;
}
