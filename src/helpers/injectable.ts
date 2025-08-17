import { extractName } from "~/helpers/extractName";
import type { Injectable } from "~/types/Injectable";

export function injectable<T>(displayName?: string): Injectable<T> {
  return {
    displayName,
    toString() {
      return `Injectable(${extractName(this) ?? ""})`;
    },
  } as Injectable<T>;
}
