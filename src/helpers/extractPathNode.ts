import { isDeferredInjectable } from "~/helpers/isDeferredInjectable";
import { isOptionalInjectable } from "~/helpers/isOptionalInjectable";
import type { InjectableAny } from "~/types/Injectable";
import type { InjectableOptionsAny } from "~/types/InjectableOptions";
import type { PathNode } from "~/types/PathNode";

export function extractPathNode(
	injectableOptions: InjectableOptionsAny,
	alias?: string,
): PathNode {
	const injectable =
		isOptionalInjectable(injectableOptions) ||
		isDeferredInjectable(injectableOptions)
			? injectableOptions.injectable
			: injectableOptions;
	return {
		injectable,
		name: alias ?? extractName(injectable) ?? "(no name)",
	};
}

export function extractName(injectable: InjectableAny): string | undefined {
	let name = injectable.displayName;
	if (!name && typeof injectable === "function") {
		name = injectable.name;
	}
	return name;
}
