import type { ResolutionPath } from "~/ResolutionPath";
import type { InjectableOptionsAny } from "~/types/InjectableOptions";
import type { Resolved } from "~/types/Resolved";

export type ResolutionResult<T> =
  | { type: "success"; value: T }
  | { type: "notFound"; path: ResolutionPath }
  | { type: "runtimeError"; path: ResolutionPath; error: unknown };

export type OptionsResolutionResult<T extends InjectableOptionsAny> =
  ResolutionResult<Resolved<T>>;
