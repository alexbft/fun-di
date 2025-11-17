export type ResolveResult<T> =
  | { type: "success"; value: T }
  | { type: "notFound" }
  | { type: "runtimeError"; error: unknown };
