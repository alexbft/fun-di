import { BindingError } from "~/errorClasses/BindingError";
import { classToFactory } from "~/helpers/classToFactory";
import { isClass } from "~/helpers/isClass";
import { isFactory } from "~/helpers/isFactory";
import type { Factory } from "~/types/Factory";
import type { Injectable } from "~/types/Injectable";
import type { InjectableOptions } from "~/types/InjectableOptions";
import type { MaybePromise } from "~/types/MaybePromise";
import type { Resolved } from "~/types/Resolved";

export type BindScope = "singleton" | "request" | "transient" | "dependent";

export type BindOptions<T> =
  | { toInjectable: InjectableOptions<T> }
  | { toValue: T }
  | { scope?: BindScope; toProvider: () => MaybePromise<T> }
  | { scope?: BindScope; toFactory?: Factory<T> }
  | { scope?: BindScope; toClass?: abstract new () => T };

type BindingTo<T> =
  | { kind: "injectable"; toInjectable: InjectableOptions<T> }
  | { kind: "value"; toValue: T }
  | { kind: "provider"; toProvider: () => MaybePromise<T> }
  | { kind: "factory"; toFactory: Factory<T> };

export type BindingTarget<T> = {
  scope: BindScope;
} & BindingTo<T>;

// biome-ignore lint/suspicious/noExplicitAny: internal only
export type BindingTargetAny = BindingTarget<any>;

export interface Binding<T> {
  source: Injectable<T>;
  target: BindingTarget<T>;
}

// biome-ignore lint/suspicious/noExplicitAny: internal only
export type BindingAny = Binding<any>;

function bind<T extends Injectable<unknown>>(
  injectable: T,
  options: BindOptions<Resolved<T>>,
): Binding<Resolved<T>>;
function bind<T extends Factory<unknown>>(selfBound: T): Binding<Resolved<T>>;
function bind<T extends abstract new () => unknown>(
  selfBound: T,
): Binding<Resolved<T>>;
function bind<T>(
  injectable: Injectable<T>,
  options?: BindOptions<T>,
): Binding<T> {
  const bindingTarget = parseBindOptions(injectable, options);
  return { source: injectable, target: bindingTarget };
}

export { bind };

function parseBindOptions<T>(
  injectable: Injectable<T>,
  maybeOptions: BindOptions<T> | undefined,
): BindingTarget<T> {
  const options = maybeOptions ?? {};
  if ("toValue" in options) {
    return {
      scope: "singleton",
      kind: "value",
      toValue: options.toValue,
    };
  }
  if ("toInjectable" in options) {
    if (options.toInjectable === injectable) {
      throw new BindingError(
        "Cannot self-reference when binding to an injectable",
      );
    }
    return {
      scope: "transient",
      kind: "injectable",
      toInjectable: options.toInjectable,
    };
  }
  if ("toProvider" in options) {
    return {
      scope: options.scope ?? "singleton",
      kind: "provider",
      toProvider: options.toProvider,
    };
  }
  let factory: Factory<T> | undefined;
  if ("toFactory" in options) {
    factory = options.toFactory;
  } else if ("toClass" in options && options.toClass) {
    factory = classToFactory(options.toClass);
  }
  if (!factory) {
    if (isClass(injectable)) {
      factory = classToFactory(injectable);
    } else {
      if (!isFactory(injectable)) {
        throw new BindingError(
          "Only class injectable or factory can be self-bound",
        );
      }
      factory = injectable;
    }
  }
  return {
    scope: options.scope ?? "dependent",
    kind: "factory",
    toFactory: factory,
  };
}
