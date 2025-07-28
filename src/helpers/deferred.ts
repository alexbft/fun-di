import type { Injectable } from "~/types/Injectable";
import type { DeferredInjectable } from "~/types/InjectableOptions";

export function deferred<T>(injectable: Injectable<T>): DeferredInjectable<T> {
  return {
    type: "deferred",
    injectable,
  };
}
