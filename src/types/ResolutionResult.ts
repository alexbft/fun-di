import type { InjectableOptionsAny } from "~/types/InjectableOptions";
import type { PathNode } from "~/types/PathNode";
import type { Resolved } from "~/types/Resolved";

export type ResolutionResult<T> =
  | { type: "success"; value: T }
  | { type: "notFound"; path: PathNode[] }
  | { type: "runtimeError"; path: PathNode[]; error: unknown };

export type OptionsResolutionResult<T extends InjectableOptionsAny> =
  ResolutionResult<Resolved<T>>;
