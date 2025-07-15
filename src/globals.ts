import type { Binding } from "~/bind";
import type { Context } from "~/Context";
import { ContextImpl } from "~/ContextImpl";

let _globalContext: Context | null = null;

export function getGlobalContext(): Context | null {
	return _globalContext;
}

export function setGlobalContext(context: Context): void {
	_globalContext = context;
}

export function createContext(
	name: string,
	bindings: Binding<unknown>[],
): Context {
	return new ContextImpl(name, bindings);
}
