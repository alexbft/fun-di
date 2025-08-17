import type {
  InjectableOptions,
  ParentInjectable,
} from "~/types/InjectableOptions";

export function isParentInjectable<T>(
  injectableOptions: InjectableOptions<T>,
): injectableOptions is ParentInjectable<T> {
  return "type" in injectableOptions && injectableOptions.type === "parent";
}
