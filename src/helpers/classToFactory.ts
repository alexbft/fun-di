/** biome-ignore-all lint/suspicious/noExplicitAny: magic */
import { factory } from "~/helpers/factory";
import type { DepsOf } from "~/types/DepsOf";
import { depsProperty } from "~/types/depsProperty";
import type { Factory } from "~/types/Factory";

export function classToFactory<TClass extends abstract new () => any>(
  aClass: TClass,
): Factory<InstanceType<TClass>, DepsOf<TClass>> {
  const deps: DepsOf<TClass> = Object.getPrototypeOf(aClass.prototype)[
    depsProperty
  ];
  if (!deps) {
    return factory({}, () => {
      return new (aClass as unknown as new () => any)();
    }) as Factory<InstanceType<TClass>, DepsOf<TClass>>;
  }
  return factory(deps, (resolvedDeps) => {
    const newClass = class extends (aClass as any) {};
    (newClass.prototype as any).resolveDeps = function (this: any) {
      this.deps = resolvedDeps;
    };
    return new newClass() as InstanceType<TClass>;
  });
}
