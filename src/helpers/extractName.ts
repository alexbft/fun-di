import type { InjectableAny } from "~/types/Injectable";

export function extractName(injectable: InjectableAny): string | undefined {
  let name = injectable.displayName;
  if (!name && typeof injectable === "function") {
    name = injectable.name;
  }
  return name;
}
