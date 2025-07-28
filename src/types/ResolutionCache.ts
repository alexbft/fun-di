import type { InjectableAny } from "~/types/Injectable";
import type { ResolutionResult } from "~/types/ResolutionResult";

export type ResolutionCache = Map<
  InjectableAny,
  Promise<ResolutionResult<unknown>>
>;
