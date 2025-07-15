import type { ClassInjectable, ObjectInjectable } from "~/types/Injectable";
import type {
	DeferredInjectable,
	InjectableOptions,
	OptionalInjectable,
} from "~/types/InjectableOptions";

export type Resolved<T> = T extends OptionalInjectable<infer U>
	? U | undefined
	: T extends DeferredInjectable<infer U>
		? Promise<U>
		: T extends ObjectInjectable<infer U>
			? U
			: T extends ClassInjectable<infer U>
				? U
				: never;

export type Deps = Record<string, InjectableOptions<unknown>>;

export type ResolvedDeps<T extends Deps> = {
	[K in keyof T as K extends string ? Uncapitalize<K> : never]: Resolved<T[K]>;
};
