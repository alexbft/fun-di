import type { Injectable } from "~/types/Injectable";

export type InjectableOptions<T> = Injectable<T> | DecoratedInjectable<T>;

export type DecoratedInjectable<T> =
  | OptionalInjectable<T>
  | DeferredInjectable<T>
  | ParentInjectable<T>
  | MultiInjectable<T>;

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

export type ParentInjectable<T> = {
  type: "parent";
  injectable: Injectable<T>;
};

export type MultiInjectable<T> = {
  type: "multi";
  injectable: Injectable<T>;
};
