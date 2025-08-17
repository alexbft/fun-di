import type { Binding } from "~/bind";
import type { ResolutionResult } from "~/types/ResolutionResult";

export type ResolutionCache = Map<
  Binding<unknown>,
  Promise<ResolutionResult<unknown>>
>;
