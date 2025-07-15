import type { Injectable } from "~/types/Injectable";
import type { OptionalInjectable } from "~/types/InjectableOptions";

export function optional<T>(injectable: Injectable<T>): OptionalInjectable<T> {
	return {
		type: "optional",
		injectable,
	};
}
