import type { WithInjectedDeps } from "~/helpers/injectDeps";

export type DepsOf<T> = T extends new () => WithInjectedDeps<infer TDeps>
  ? TDeps
  : never;
