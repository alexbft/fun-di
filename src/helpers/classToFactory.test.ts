import { expect, test } from "vitest";
import { bind } from "~/bind";
import { createContext } from "~/globals";
import { classToFactory } from "~/helpers/classToFactory";
import { factory } from "~/helpers/factory";
import { injectDeps } from "~/helpers/injectDeps";

test("classToFactory", async () => {
	const A = factory({}, () => 42);

	class B extends injectDeps({ A }) {
		public readonly a: number;

		constructor() {
			super();
			this.a = this.deps.a;
		}
	}

	const BFactory = classToFactory(B);
	const testContext = createContext("test", [bind(A), bind(BFactory)]);
	const b = await testContext.resolve(BFactory);

	expect(b).toBeInstanceOf(B);
	expect(b.a).toBe(42);
});
