import type { Injectable } from "~/types/Injectable";
import type {
  DeferredInjectable,
  InjectableOptions,
  MultiInjectable,
  OptionalInjectable,
  OptionalTryCatchInjectable,
  ParentInjectable,
} from "~/types/InjectableOptions";
import type { ResolveResult } from "~/types/ResolveResult";

export type Resolved<T> = T extends Injectable<infer U>
  ? U
  : ResolveDecoratedInjectable<T>;

type ResolveDecoratedInjectable<T> = T extends OptionalInjectable<infer U>
  ? U | undefined
  : T extends DeferredInjectable<infer U>
    ? Promise<U>
    : T extends ParentInjectable<infer U>
      ? U
      : T extends MultiInjectable<infer U>
        ? U[]
        : T extends OptionalTryCatchInjectable<infer U>
          ? ResolveResult<U>
          : never;

export type Deps = Record<string, InjectableOptions<unknown>>;

export type ResolvedDeps<T extends Deps> = {
  [K in keyof T as K extends string ? Uncapitalize<K> : never]: Resolved<T[K]>;
};
