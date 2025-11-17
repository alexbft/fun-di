import type { Injectable } from "~/types/Injectable";
import type { OptionalTryCatchInjectable } from "~/types/InjectableOptions";

export function optionalTryCatch<T>(
  injectable: Injectable<T>,
): OptionalTryCatchInjectable<T> {
  return {
    type: "optionalTryCatch",
    injectable,
  };
}
