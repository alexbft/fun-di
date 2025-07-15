import { extractName } from "~/helpers/extractPathNode";
import type { Injectable } from "~/types/Injectable";

export function injectable<T>(displayName?: string): Injectable<T> {
	return {
		displayName,
		toString() {
			return `Injectable(${extractName(this) ?? ""})`;
		},
	} as Injectable<T>;
}
