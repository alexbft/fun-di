import type { Injectable } from "~/types/Injectable";

export type InjectableOptions<T> =
  | Injectable<T>
  | OptionalInjectable<T>
  | DeferredInjectable<T>;

// biome-ignore lint/suspicious/noExplicitAny: internal only
export type InjectableOptionsAny = InjectableOptions<any>;

export type OptionalInjectable<T> = {
  type: "optional";
  injectable: Injectable<T>;
};

export type DeferredInjectable<T> = {
  type: "deferred";
  injectable: Injectable<T>;
};
