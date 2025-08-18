import "@ungap/with-resolvers";

import type {
  Binding,
  BindingTarget,
  BindingTargetAny,
  BindScope,
} from "~/bind";
import type { BindingWithCacheRef } from "~/ContextImpl";
import { BindingNotFoundError } from "~/errorClasses/BindingNotFoundError";
import { FunDiError } from "~/errorClasses/FunDiError";
import { ResolutionRuntimeError } from "~/errorClasses/ResolutionRuntimeError";
import { isDecoratedInjectable } from "~/helpers/isDecoratedInjectable";
import { isDeferredInjectable } from "~/helpers/isDeferredInjectable";
import { isMultiInjectable } from "~/helpers/isMultiInjectable";
import { isOptionalInjectable } from "~/helpers/isOptionalInjectable";
import { isParentInjectable } from "~/helpers/isParentInjectable";
import { lazyPromise } from "~/helpers/lazyPromise";
import { uncapitalize } from "~/helpers/uncapitalize";
import type { ResolutionPath } from "~/ResolutionPath";
import type { Injectable } from "~/types/Injectable";
import type {
  InjectableOptions,
  InjectableOptionsAny,
} from "~/types/InjectableOptions";
import type { MaybePromise } from "~/types/MaybePromise";
import type { ResolutionCache } from "~/types/ResolutionCache";
import type {
  OptionsResolutionResult,
  ResolutionResult,
} from "~/types/ResolutionResult";
import type { Deps, Resolved, ResolvedDeps } from "~/types/Resolved";

export class Resolver {
  private readonly resolutionCache: ResolutionCache = new Map();
  private readonly abortController = new AbortController();

  async resolveDict<TDeps extends Deps>(
    deps: TDeps,
    path: ResolutionPath,
  ): Promise<ResolvedDeps<TDeps>> {
    return this.unwrapResolutionResult(
      await this.resolveDictInternal(deps, path),
    );
  }

  private async resolveDictInternal<TDeps extends Deps>(
    deps: TDeps,
    path: ResolutionPath,
  ): Promise<ResolutionResult<ResolvedDeps<TDeps>>> {
    const failEarly =
      Promise.withResolvers<ResolutionResult<ResolvedDeps<TDeps>>>();
    let hasFailed = false;
    const entriesP = Object.entries(deps).map(
      async ([key, injectableOptions]) => {
        const resolutionResult = await this.resolveInjectableOptionsInternal(
          injectableOptions,
          path.add({ injectableOptions, alias: key }),
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
    path: ResolutionPath,
  ): Promise<Resolved<T>> {
    return this.unwrapResolutionResult(
      await this.resolveInjectableOptionsInternal(injectableOptions, path),
    ) as Resolved<T>;
  }

  private async resolveInjectableOptionsInternal<
    T extends InjectableOptionsAny,
  >(
    injectableOptions: T,
    path: ResolutionPath,
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
        value: lazyPromise(() =>
          this.resolve(injectableOptions.injectable, path.truncateToLastNode()),
        ),
      } as OptionsResolutionResult<T>;
    }
    if (isParentInjectable(injectableOptions)) {
      return this.resolveInternal(injectableOptions.injectable, path);
    }
    if (isMultiInjectable(injectableOptions)) {
      return (await this.resolveMultiInternal(
        injectableOptions.injectable,
        path,
      )) as OptionsResolutionResult<T>;
    }
    return this.resolveInternal(injectableOptions, path);
  }

  private async resolveInternal<T>(
    injectable: Injectable<T>,
    path: ResolutionPath,
  ): Promise<ResolutionResult<T>> {
    const binding = path.context?.getBinding(injectable);
    if (!binding) {
      return {
        type: "notFound",
        path,
      };
    }
    return await (this.resolveBinding(binding, path) as Promise<
      ResolutionResult<T>
    >);
  }

  private async resolveMultiInternal<T>(
    injectable: Injectable<T>,
    path: ResolutionPath,
  ): Promise<ResolutionResult<T[]>> {
    const bindings = path.context?.getAllBindings(injectable) ?? [];
    const failEarly = Promise.withResolvers<ResolutionResult<T[]>>();
    let hasFailed = false;
    const valuesP = bindings.map(async (binding) => {
      const resolutionResult = await this.resolveBinding(binding, path);
      if (resolutionResult.type !== "success") {
        hasFailed = true;
        failEarly.resolve(resolutionResult);
        if (!this.abortSignal.aborted) {
          this.abortController.abort(new FunDiError("Aborted"));
        }
        throw new FunDiError("Failed to resolve");
      }
      return resolutionResult.value as T;
    });
    const result = await Promise.race([
      Promise.all(valuesP).then(
        (values): ResolutionResult<T[]> => ({
          type: "success",
          value: values,
        }),
      ),
      failEarly.promise,
    ]);
    if (hasFailed) {
      return failEarly.promise;
    }
    return result;
  }

  private resolveBinding(
    binding: BindingWithCacheRef,
    path: ResolutionPath,
  ): Promise<OptionsResolutionResult<InjectableOptions<unknown>>> {
    if (this.abortSignal.aborted) {
      return Promise.resolve({
        type: "runtimeError",
        error: this.abortSignal.reason,
        path,
      });
    }
    const scope =
      binding.binding.target.scope === "dependent"
        ? this.getActualScopeForDependentBinding(binding.binding.target, path)
        : binding.binding.target.scope;
    switch (scope) {
      case "transient":
        return this.getBoundValue(binding.binding, path);
      case "request":
        return this.getCachedValue(this.resolutionCache, binding.binding, path);
      case "singleton":
        return this.getCachedValue(binding.contextCache, binding.binding, path);
    }
  }

  // Visible for testing
  public getActualScopeForDependentBinding(
    binding: BindingTarget<unknown>,
    path: ResolutionPath,
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
      let dependencyScope: BindScope = "singleton";
      // TODO: handle multi bindings
      const injectable = isDecoratedInjectable(injectableOptions)
        ? injectableOptions.injectable
        : injectableOptions;
      const dependencyBinding = path.context?.getBinding(injectable);
      dependencyScope =
        dependencyBinding?.binding?.target?.scope ?? dependencyScope;
      if (dependencyScope === "dependent") {
        if (isDeferredInjectable(injectableOptions)) {
          dependencyScope = "singleton";
        } else {
          dependencyScope = this.getActualScopeForDependentBinding(
            dependencyBinding?.binding?.target as BindingTargetAny,
            path.add({ injectableOptions, alias: key }),
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

  private async getBoundValue(
    binding: Binding<unknown>,
    path: ResolutionPath,
  ): Promise<OptionsResolutionResult<InjectableOptions<unknown>>> {
    const target = binding.target;
    switch (target.kind) {
      case "factory": {
        const factoryDepsResult = await this.resolveDictInternal(
          target.toFactory.deps,
          path,
        );
        if (factoryDepsResult.type !== "success") {
          return factoryDepsResult;
        }
        return await this.wrapResult(
          () => target.toFactory.run(factoryDepsResult.value),
          path,
        );
      }
      case "injectable": {
        return await this.resolveInjectableOptionsInternal(
          target.toInjectable,
          path.add({ injectableOptions: target.toInjectable }),
        );
      }
      case "value":
        return { type: "success", value: target.toValue };
      case "provider":
        return await this.wrapResult(
          () => target.toProvider.call(undefined),
          path,
        );
    }
  }

  private async getCachedValue(
    cache: ResolutionCache,
    binding: Binding<unknown>,
    path: ResolutionPath,
  ): Promise<OptionsResolutionResult<InjectableOptions<unknown>>> {
    const existing = cache.get(binding);
    if (existing) {
      const result = await existing;
      if (result.type !== "success") {
        return { ...result, path };
      }
      return result;
    }
    const result = this.getBoundValue(binding, path);
    if (!this.abortSignal.aborted) {
      cache.set(binding, result);
    }
    return result;
  }

  private async wrapResult<T>(
    result: () => MaybePromise<T>,
    path: ResolutionPath,
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
          `Binding not found. Path: ${resolutionResult.path.render()}`,
        );
      case "runtimeError":
        throw new ResolutionRuntimeError(
          `An error occured in resolution process. Path: ${resolutionResult.path.render()}`,
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
