import type {
	InjectableOptions,
	OptionalInjectable,
} from "~/types/InjectableOptions";

export function isOptionalInjectable<T>(
	injectableOptions: InjectableOptions<T>,
): injectableOptions is OptionalInjectable<T> {
	return "type" in injectableOptions && injectableOptions.type === "optional";
}
