import type { Injectable } from "~/types/Injectable";
import type { MultiInjectable } from "~/types/InjectableOptions";

export function multi<T>(injectable: Injectable<T>): MultiInjectable<T> {
  return {
    type: "multi",
    injectable,
  };
}
