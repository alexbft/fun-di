import type { PathNode } from "~/types/PathNode";

export function formatPath(path: PathNode[]) {
	return path.map((node) => node.name).join(" -> ");
}
