import type {
	DeferredInjectable,
	InjectableOptions,
} from "~/types/InjectableOptions";

export function isDeferredInjectable<T>(
	injectableOptions: InjectableOptions<T>,
): injectableOptions is DeferredInjectable<T> {
	return "type" in injectableOptions && injectableOptions.type === "deferred";
}
