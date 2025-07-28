import type { Injectable } from "~/types/Injectable";

export function isClass<T>(a: Injectable<T>): a is abstract new () => T {
  return typeof a === "function" && a.prototype;
}
