import "@ungap/with-resolvers";

import type { BindingTarget, BindingTargetAny, BindScope } from "~/bind";
import type { BindingTargetWithCacheRef, ContextImpl } from "~/ContextImpl";
import { BindingNotFoundError } from "~/errorClasses/BindingNotFoundError";
import { DependencyCycleError } from "~/errorClasses/DependencyCycleError";
import { FunDiError } from "~/errorClasses/FunDiError";
import { ResolutionRuntimeError } from "~/errorClasses/ResolutionRuntimeError";
import { extractPathNode } from "~/helpers/extractPathNode";
import { formatPath } from "~/helpers/formatPath";
import { isDeferredInjectable } from "~/helpers/isDeferredInjectable";
import { isOptionalInjectable } from "~/helpers/isOptionalInjectable";
import { uncapitalize } from "~/helpers/uncapitalize";
import type { Injectable } from "~/types/Injectable";
import type {
  InjectableOptions,
  InjectableOptionsAny,
} from "~/types/InjectableOptions";
import type { MaybePromise } from "~/types/MaybePromise";
import type { PathNode } from "~/types/PathNode";
import type { ResolutionCache } from "~/types/ResolutionCache";
import type {
  OptionsResolutionResult,
  ResolutionResult,
} from "~/types/ResolutionResult";
import type { Deps, Resolved, ResolvedDeps } from "~/types/Resolved";

export class Resolver {
  private readonly resolutionCache: ResolutionCache = new Map();
  private readonly abortController = new AbortController();

  constructor(private readonly context: ContextImpl) {}

  async resolveDict<TDeps extends Deps>(
    deps: TDeps,
    path: PathNode[],
  ): Promise<ResolvedDeps<TDeps>> {
    return this.unwrapResolutionResult(
      await this.resolveDictInternal(deps, path),
    );
  }

  private async resolveDictInternal<TDeps extends Deps>(
    deps: TDeps,
    path: PathNode[],
  ): Promise<ResolutionResult<ResolvedDeps<TDeps>>> {
    const failEarly =
      Promise.withResolvers<ResolutionResult<ResolvedDeps<TDeps>>>();
    let hasFailed = false;
    const entriesP = Object.entries(deps).map(
      async ([key, injectableOptions]) => {
        const resolutionResult = await this.resolveInjectableOptionsInternal(
          injectableOptions,
          this.addPathNode(path, extractPathNode(injectableOptions, key)),
        );
        if (resolutionResult.type !== "success") {
          hasFailed = true;
          failEarly.resolve(resolutionResult);
          if (!this.abortSignal.aborted) {
            this.abortController.abort(new FunDiError("Aborted"));
          }
          throw new FunDiError("Failed to resolve");
        }
        return [uncapitalize(key), resolutionResult.value] as const;
      },
    );
    const result = await Promise.race([
      Promise.all(entriesP).then(
        (entries): ResolutionResult<ResolvedDeps<TDeps>> => ({
          type: "success",
          value: Object.fromEntries(entries) as ResolvedDeps<TDeps>,
        }),
      ),
      failEarly.promise,
    ]);
    if (hasFailed) {
      return failEarly.promise;
    }
    return result;
  }

  async resolve<T extends InjectableOptions<unknown>>(
    injectableOptions: T,
    path: PathNode[],
  ): Promise<Resolved<T>> {
    return this.unwrapResolutionResult(
      await this.resolveInjectableOptionsInternal(injectableOptions, path),
    ) as Resolved<T>;
  }

  private async resolveInjectableOptionsInternal<
    T extends InjectableOptionsAny,
  >(
    injectableOptions: T,
    path: PathNode[],
  ): Promise<OptionsResolutionResult<T>> {
    if (isOptionalInjectable(injectableOptions)) {
      const result = await this.resolveInternal(
        injectableOptions.injectable,
        path,
      );
      if (result.type === "notFound") {
        return {
          type: "success",
          value: undefined,
        } as OptionsResolutionResult<T>;
      }
      return result;
    }
    if (isDeferredInjectable(injectableOptions)) {
      return {
        type: "success",
        value: Promise.resolve().then(() =>
          this.resolve(
            injectableOptions.injectable,
            // biome-ignore lint/style/noNonNullAssertion: obvious
            path.length > 0 ? [path.at(-1)!] : [],
          ),
        ),
      } as OptionsResolutionResult<T>;
    }
    return this.resolveInternal(injectableOptions, path);
  }

  private async resolveInternal<T>(
    injectable: Injectable<T>,
    path: PathNode[],
  ): Promise<ResolutionResult<T>> {
    if (this.abortSignal.aborted) {
      return {
        type: "runtimeError",
        error: this.abortSignal.reason,
        path,
      };
    }
    const binding = this.context.getBinding(injectable);
    if (!binding) {
      return {
        type: "notFound",
        path,
      };
    }
    return await (this.resolveBinding(injectable, binding, path) as Promise<
      ResolutionResult<T>
    >);
  }

  private resolveBinding<T>(
    injectable: Injectable<T>,
    binding: BindingTargetWithCacheRef,
    path: PathNode[],
  ): Promise<OptionsResolutionResult<InjectableOptions<T>>> {
    const scope =
      binding.target.scope === "dependent"
        ? this.getActualScopeForDependentBinding(binding.target, path)
        : binding.target.scope;
    switch (scope) {
      case "transient":
        return this.getBoundValue(binding.target, path);
      case "request":
        return this.getCachedValue(
          this.resolutionCache,
          injectable,
          binding.target,
          path,
        );
      case "singleton":
        return this.getCachedValue(
          binding.contextCache,
          injectable,
          binding.target,
          path,
        );
    }
  }

  // Visible for testing
  getActualScopeForDependentBinding(
    binding: BindingTarget<unknown>,
    path: PathNode[],
  ): Exclude<BindScope, "dependent"> {
    if (binding.scope !== "dependent") {
      throw new FunDiError("unexpected");
    }
    if (binding.kind !== "factory") {
      return "singleton";
    }
    const deps = binding.toFactory.deps;
    let resultScope: Exclude<BindScope, "dependent"> = "singleton";
    for (const [key, injectableOptions] of Object.entries(deps)) {
      const injectable =
        isOptionalInjectable(injectableOptions) ||
        isDeferredInjectable(injectableOptions)
          ? injectableOptions.injectable
          : injectableOptions;
      const dependencyBinding = this.context.getBinding(injectable);
      let dependencyScope = dependencyBinding?.target?.scope ?? "singleton";
      if (dependencyScope === "dependent") {
        if (isDeferredInjectable(injectableOptions)) {
          dependencyScope = "singleton";
        } else {
          dependencyScope = this.getActualScopeForDependentBinding(
            dependencyBinding?.target as BindingTargetAny,
            this.addPathNode(path, extractPathNode(injectable, key)),
          );
        }
      }
      if (resultScope === "singleton" && dependencyScope === "request") {
        resultScope = "request";
      }
      if (
        (resultScope === "singleton" || resultScope === "request") &&
        dependencyScope === "transient"
      ) {
        resultScope = "transient";
      }
    }
    return resultScope;
  }

  private async getBoundValue<T>(
    binding: BindingTarget<T>,
    path: PathNode[],
  ): Promise<OptionsResolutionResult<InjectableOptions<T>>> {
    switch (binding.kind) {
      case "factory": {
        const factoryDepsResult = await this.resolveDictInternal(
          binding.toFactory.deps,
          path,
        );
        if (factoryDepsResult.type !== "success") {
          return factoryDepsResult;
        }
        return await this.wrapResult(
          () => binding.toFactory.run(factoryDepsResult.value),
          path,
        );
      }
      case "injectable": {
        return await this.resolveInjectableOptionsInternal(
          binding.toInjectable,
          this.addPathNode(path, extractPathNode(binding.toInjectable)),
        );
      }
      case "value":
        return { type: "success", value: binding.toValue as T };
      case "provider":
        return await this.wrapResult(
          () => binding.toProvider.call(undefined),
          path,
        );
    }
  }

  private async getCachedValue<T>(
    cache: ResolutionCache,
    injectable: Injectable<T>,
    binding: BindingTarget<T>,
    path: PathNode[],
  ): Promise<OptionsResolutionResult<InjectableOptions<T>>> {
    const existing = cache.get(injectable);
    if (existing) {
      const result = await (existing as Promise<
        ResolutionResult<T | undefined>
      >);
      if (result.type !== "success") {
        return { ...result, path };
      }
      return result;
    }
    const result = this.getBoundValue<T>(binding, path);
    if (!this.abortSignal.aborted) {
      cache.set(injectable, result);
    }
    return result;
  }

  private addPathNode(path: PathNode[], newNode: PathNode): PathNode[] {
    const newPath = [...path, newNode];
    if (path.some((node) => node.injectable === newNode.injectable)) {
      throw new DependencyCycleError(
        `Cycle detected: ${formatPath(newPath)} in context "${this.context.name}"`,
      );
    }
    return newPath;
  }

  private async wrapResult<T>(
    result: () => MaybePromise<T>,
    path: PathNode[],
  ): Promise<ResolutionResult<T>> {
    try {
      return {
        type: "success",
        value: await result(),
      };
    } catch (error) {
      return {
        type: "runtimeError",
        path,
        error,
      };
    }
  }

  private unwrapResolutionResult<T>(resolutionResult: ResolutionResult<T>): T {
    switch (resolutionResult.type) {
      case "notFound":
        throw new BindingNotFoundError(
          `Binding not found for ${formatPath(resolutionResult.path)} in context "${this.context.name}"`,
        );
      case "runtimeError":
        throw new ResolutionRuntimeError(
          `An error occured while resolving ${formatPath(resolutionResult.path)} in context "${this.context.name}"`,
          { cause: resolutionResult.error },
        );
      default:
        return resolutionResult.value;
    }
  }

  private get abortSignal() {
    return this.abortController.signal;
  }
}
