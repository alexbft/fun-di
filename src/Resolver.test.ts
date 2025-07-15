import { describe, expect, test } from "vitest";
import { bind } from "~/bind";
import { ContextImpl } from "~/ContextImpl";
import { DependencyCycleError } from "~/errorClasses/DependencyCycleError";
import { extractPathNode } from "~/helpers/extractPathNode";
import { factory } from "~/helpers/factory";
import { injectable } from "~/helpers/injectable";
import { optional } from "~/helpers/optional";
import { Resolver } from "~/Resolver";

describe("Resolver", () => {
	test("minimal resolved scope for dependent binding", () => {
		const A = factory({}, () => "a");
		const singletonBinding = bind(A, { scope: "singleton" });
		const B = factory({}, () => "b");
		const requestBinding = bind(B, { scope: "request" });
		const C = factory({}, () => "c");
		const transientBinding = bind(C, { scope: "transient" });
		const ABC = factory(
			{ A: optional(A), B: optional(B), C: optional(C) },
			() => "abc",
		);
		const abcBinding = bind(ABC);

		const context1 = new ContextImpl("1", [
			singletonBinding,
			requestBinding,
			abcBinding,
		]);
		const resolver1 = new Resolver(context1);
		expect(
			resolver1.getActualScopeForDependentBinding(abcBinding.target, []),
		).toBe("request");

		const context2 = new ContextImpl("2", [
			singletonBinding,
			transientBinding,
			abcBinding,
		]);
		const resolver2 = new Resolver(context2);
		expect(
			resolver2.getActualScopeForDependentBinding(abcBinding.target, []),
		).toBe("transient");

		const context3 = new ContextImpl("3", [
			requestBinding,
			transientBinding,
			abcBinding,
		]);
		const resolver3 = new Resolver(context3);
		expect(
			resolver3.getActualScopeForDependentBinding(abcBinding.target, []),
		).toBe("transient");
	});

	test("scope is calculated in dependency tree", () => {
		const A = factory({}, () => "a");
		const B = factory({ A }, () => "b");
		const C = factory({ B }, () => "c");

		const context = new ContextImpl("test", [
			bind(A, { scope: "request" }),
			bind(B),
			bind(C),
		]);
		const resolver = new Resolver(context);
		expect(resolver.getActualScopeForDependentBinding(bind(C).target, [])).toBe(
			"request",
		);
	});

	test("checks cycles while calculating scope", () => {
		const A = injectable<string>("A");
		const B = factory({ A }, () => "b");
		B.displayName = "B";
		const aBinding = bind(A, { toFactory: factory({ B }, () => "a") });
		const bBinding = bind(B);

		const context = new ContextImpl("test", [aBinding, bBinding]);
		const resolver = new Resolver(context);

		const resultA = () =>
			resolver.getActualScopeForDependentBinding(aBinding.target, [
				extractPathNode(A),
			]);
		expect(resultA).toThrowError(DependencyCycleError);
		expect(resultA).toThrowError("A -> B -> A");

		const resultB = () =>
			resolver.getActualScopeForDependentBinding(bBinding.target, [
				extractPathNode(B),
			]);
		expect(resultB).toThrowError(DependencyCycleError);
		expect(resultB).toThrowError("B -> A -> B");
	});
});
