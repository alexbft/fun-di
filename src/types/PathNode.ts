import type { ContextImpl } from "~/ContextImpl";
import type { InjectableAny } from "~/types/Injectable";

export interface PathNode {
  name: string;
  injectable: InjectableAny;
  context: ContextImpl | null;
}
