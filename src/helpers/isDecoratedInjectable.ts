import type {
  DecoratedInjectable,
  InjectableOptions,
} from "~/types/InjectableOptions";

export function isDecoratedInjectable<T>(
  injectableOptions: InjectableOptions<T>,
): injectableOptions is DecoratedInjectable<T> {
  return (
    "type" in injectableOptions &&
    (injectableOptions.type === "optional" ||
      injectableOptions.type === "deferred" ||
      injectableOptions.type === "parent" ||
      injectableOptions.type === "multi")
  );
}
