declare const __injectableResolvedAs: unique symbol;

export const classDeps: symbol = Symbol("classDeps");

export interface ObjectInjectable<O> {
  [__injectableResolvedAs]: O;
  displayName?: string;
}

export type ClassInjectable<O> = (abstract new () => O) & {
  displayName?: string;
};

export type Injectable<O> = ObjectInjectable<O> | ClassInjectable<O>;

// biome-ignore lint/suspicious/noExplicitAny: internal only
export type InjectableAny = Injectable<any>;
