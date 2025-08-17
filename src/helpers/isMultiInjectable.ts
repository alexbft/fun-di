import type {
  InjectableOptions,
  MultiInjectable,
} from "~/types/InjectableOptions";

export function isMultiInjectable<T>(
  injectableOptions: InjectableOptions<T>,
): injectableOptions is MultiInjectable<T> {
  return "type" in injectableOptions && injectableOptions.type === "multi";
}
