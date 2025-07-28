import type { Binding } from "~/bind";
import type { Context } from "~/Context";
import { ContextImpl } from "~/ContextImpl";

export function createContext(
  name: string,
  bindings: Binding<unknown>[],
): Context {
  return new ContextImpl(name, bindings);
}
