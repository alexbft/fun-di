import type {
  InjectableOptions,
  OptionalTryCatchInjectable,
} from "~/types/InjectableOptions";

export function isOptionalTryCatchInjectable<T>(
  injectableOptions: InjectableOptions<T>,
): injectableOptions is OptionalTryCatchInjectable<T> {
  return (
    "type" in injectableOptions && injectableOptions.type === "optionalTryCatch"
  );
}
