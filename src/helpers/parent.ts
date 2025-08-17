import type { Injectable } from "~/types/Injectable";
import type { ParentInjectable } from "~/types/InjectableOptions";

export function parent<T>(injectable: Injectable<T>): ParentInjectable<T> {
  return {
    type: "parent",
    injectable,
  };
}
