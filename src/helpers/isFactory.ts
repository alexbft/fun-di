import type { Factory } from "~/types/Factory";
import type { Injectable } from "~/types/Injectable";

export function isFactory<T>(
	injectable: Injectable<T>,
): injectable is Factory<T> {
	return (
		!!injectable &&
		typeof injectable === "object" &&
		"deps" in injectable &&
		"run" in injectable
	);
}
