import { expect, test, vi } from "vitest";
import { bind } from "~/bind";
import { Context } from "~/Context";
import { BindingError } from "~/errorClasses/BindingError";
import { BindingNotFoundError } from "~/errorClasses/BindingNotFoundError";
import { DependencyCycleError } from "~/errorClasses/DependencyCycleError";
import { ResolutionRuntimeError } from "~/errorClasses/ResolutionRuntimeError";
import { createContext, setGlobalContext } from "~/globals";
import { deferred } from "~/helpers/deferred";
import { factory } from "~/helpers/factory";
import { injectable } from "~/helpers/injectable";
import { injectDeps } from "~/helpers/injectDeps";
import { optional } from "~/helpers/optional";
import type { Injectable } from "~/types/Injectable";
import type { Resolved, ResolvedDeps } from "~/types/Resolved";

test("bind to itself", async () => {
	const A = factory({}, () => 42);

	const test = factory({ A }, ({ a }) => {
		expect(a).toBe(42);
	});

	const testContext = createContext("test", [bind(A), bind(test)]);

	await testContext.resolve(test);
});

test("bind to itself as singleton", async () => {
	const run = vi.fn(() => 42);
	const A = factory({}, run);

	const bindings = [bind(A, { scope: "singleton" })];
	const testContext = createContext("test", bindings);

	const a1 = await testContext.resolve(A);
	expect(a1).toBe(42);

	const a2 = await testContext.resolve(A);
	expect(a2).toBe(42);

	expect(run).toHaveBeenCalledTimes(1);
});

test("bind to itself as transient", async () => {
	const run = vi.fn(() => 42);
	const A = factory({}, run);

	const bindings = [bind(A, { scope: "transient" })];
	const testContext = createContext("test", bindings);

	const a1 = await testContext.resolve(A);
	expect(a1).toBe(42);
	const a2 = await testContext.resolve(A);
	expect(a2).toBe(42);

	expect(run).toHaveBeenCalledTimes(2);
});

test("bind to itself as request scoped", async () => {
	const run = vi.fn(() => 42);
	const A = factory({}, run);

	const bindings = [bind(A, { scope: "request" })];
	const testContext = createContext("test", bindings);

	const { a1, a2 } = await testContext.resolveDict({ a1: A, a2: A });
	expect(a1).toBe(42);
	expect(a2).toBe(42);
	expect(run).toHaveBeenCalledTimes(1);
	const a3 = await testContext.resolve(A);
	expect(a3).toBe(42);
	expect(run).toHaveBeenCalledTimes(2);
});

test("bind to value", async () => {
	const A = factory({}, () => 42);

	const bindings = [bind(A, { toValue: 123 })];
	const testContext = createContext("test", bindings);

	const a = await testContext.resolve(A);
	expect(a).toBe(123);
});

test("bind to provider", async () => {
	const A = factory({}, () => 42);

	const bindings = [bind(A, { toProvider: () => 123 })];
	const testContext = createContext("test", bindings);

	const a = await testContext.resolve(A);
	expect(a).toBe(123);
});

test("custom injectable", async () => {
	const A = injectable<number>("A");

	const testContext = createContext("test", []);

	await expect(testContext.resolve(A)).rejects.toThrowError("A");

	const testContext2 = createContext("test", [bind(A, { toValue: 123 })]);

	expect(await testContext2.resolve(A)).toBe(123);
});

test("bind to injectable", async () => {
	const A = injectable<number>("A");
	const B = injectable<number>("B");
	const aToB = bind(A, { toInjectable: B });

	const testContext = createContext("test", [aToB, bind(B, { toValue: 24 })]);

	const a = await testContext.resolve(A);
	expect(a).toBe(24);

	const testContext2 = createContext("test2", [
		aToB,
		bind(B, { toValue: 123 }),
	]);
	const a2 = await testContext2.resolve(A);
	expect(a2).toBe(123);
});

test("bind to self as injectable throws error", async () => {
	const A = injectable<number>("A");

	const result = () => bind(A, { toInjectable: A });
	expect(result).toThrow(BindingError);
	expect(result).toThrow("Cannot self-reference");
});

test("detect cycles", async () => {
	const B = injectable<number>();
	const A = factory({ B }, ({ b }) => b);
	A.displayName = "A";
	const BFactory = factory({ A }, ({ a }) => a);

	const testContext = createContext("test", [
		bind(A),
		bind(B, { toFactory: BFactory }),
	]);

	const result = testContext.resolve(A);
	await expect(result).rejects.toThrowError(DependencyCycleError);
	await expect(result).rejects.toThrowError("A -> B -> A");
});

test("error when missing dependencies", async () => {
	const B = injectable<number>();
	const A = factory({ B }, ({ b }) => b);
	A.displayName = "A";

	const testContext = createContext("test", [bind(A)]);
	const result = testContext.resolve(A);
	await expect(result).rejects.toThrowError(BindingNotFoundError);
	await expect(result).rejects.toThrowError("A -> B");
});

test("child context", async () => {
	const A = factory({}, () => 1);
	const B = factory({}, () => 2);

	const testContext = createContext("test", [bind(A)]);
	const childContext = testContext.createChildContext("test2", [bind(B)]);

	const { a, b } = await childContext.resolveDict({ A, B });
	expect(a).toBe(1);
	expect(b).toBe(2);
});

test("global context", async () => {
	const A = factory({}, () => 1);
	const B = factory({}, () => 2);

	setGlobalContext(createContext("global", [bind(A), bind(B)]));

	const action = factory({ A, B }, ({ a, b }) => {
		return a + b;
	});
	await expect(action()).resolves.toBe(3);
});

test("optional deps", async () => {
	const A = injectable<number>();
	const B = injectable<number>();

	const testContext = createContext("test", [bind(A, { toValue: 42 })]);
	const { a, b } = await testContext.resolveDict({
		a: optional(A),
		b: optional(B),
	});
	expect(a).toBe(42);
	expect(b).toBeUndefined();
});

test("inject context", async () => {
	const A = factory({ Context }, ({ context }) => {
		return context;
	});

	const testContext = createContext("test", [bind(A)]);
	const resolvedContext = await testContext.resolve(A);
	expect(resolvedContext).toBe(testContext);
});

test("runtime resolution error is cached", async () => {
	const errorRunner = vi.fn(() => {
		throw new Error("test error");
	});
	const Rejected = factory({}, errorRunner);
	Rejected.displayName = "Rejected";

	const aRunner = vi.fn(() => {});
	const A = factory({ Rejected }, aRunner);
	A.displayName = "A";

	const B = factory({ Rejected }, () => 42);
	B.displayName = "B";

	const testContext = createContext("test", [
		bind(Rejected, { scope: "singleton" }),
		bind(A),
		bind(B),
	]);

	const result = testContext.resolve(A);
	await expect(result).rejects.toThrowError(ResolutionRuntimeError);
	await expect(result).rejects.toThrowError("A -> Rejected");
	const errorCause = await result.catch((error) => (error as Error).cause);
	expect(errorCause).toBeInstanceOf(Error);
	expect((errorCause as Error).message).toBe("test error");
	expect(aRunner).not.toHaveBeenCalled();
	expect(errorRunner).toHaveBeenCalledTimes(1);

	const resultB = testContext.resolve(B);
	await expect(resultB).rejects.toThrowError(ResolutionRuntimeError);
	await expect(resultB).rejects.toThrowError("B -> Rejected");
	// The error should be cached because 'Rejected' is bound in singleton scope.
	expect(errorRunner).toHaveBeenCalledTimes(1);
});

test("errors are not cached if not bound as singleton", async () => {
	const errorRunner = vi.fn(() => {
		throw new Error("test error");
	});
	const Rejected = factory({}, errorRunner);
	Rejected.displayName = "Rejected";

	const A = factory({ Rejected }, () => 42);
	A.displayName = "A";

	const testContext = createContext("test", [
		bind(Rejected, { scope: "transient" }),
		bind(A, { scope: "transient" }),
	]);

	await expect(testContext.resolve(A)).rejects.toThrowError("A -> Rejected");
	expect(errorRunner).toHaveBeenCalledTimes(1);
	await expect(testContext.resolve(A)).rejects.toThrowError("A -> Rejected");
	expect(errorRunner).toHaveBeenCalledTimes(2);
});

test("default scope for a factory binding depends on factory dependencies binding scopes, and is calculated dynamically", async () => {
	const Dependency = factory({}, () => "dependency");
	const deps = { Dependency };

	const runner = vi.fn(
		({ dependency }: ResolvedDeps<typeof deps>) => dependency,
	);
	const Dependent = factory(deps, runner);
	const dependentBinding = bind(Dependent);

	const testContext = createContext("test", [
		dependentBinding,
		bind(Dependency, { scope: "singleton" }),
	]);

	expect(await testContext.resolve(Dependent)).toBe("dependency");
	expect(await testContext.resolve(Dependent)).toBe("dependency");
	expect(runner).toHaveBeenCalledTimes(1);

	runner.mockClear();

	const testContext2 = createContext("test2", [
		dependentBinding,
		bind(Dependency, { scope: "transient" }),
	]);
	expect(await testContext2.resolve(Dependent)).toBe("dependency");
	expect(await testContext2.resolve(Dependent)).toBe("dependency");
	expect(runner).toHaveBeenCalledTimes(2);
});

test("fails early if one of dependencies cannot be resolved", async () => {
	let bInvoked = false;
	let bResolved = false;
	const A = factory({}, () => {
		throw new Error("Test error");
	});
	const B = factory({}, () => {
		return new Promise((resolve) => {
			bInvoked = true;
			setTimeout(resolve, 10000);
		}).then(() => {
			bResolved = true;
		});
	});
	const C = factory({ A, B }, () => 42);
	const testContext = createContext("test", [bind(A), bind(B), bind(C)]);
	await expect(testContext.resolve(C)).rejects.toThrow(ResolutionRuntimeError);
	expect(bInvoked).toBe(true);
	expect(bResolved).toBe(false);
});

test("bind class injectable to itself", async () => {
	const B = factory({}, () => 42);
	class A extends injectDeps({ B }) {
		getB() {
			return this.deps.b;
		}
	}

	const testContext = createContext("test", [bind(A), bind(B)]);
	const a = await testContext.resolve(A);
	expect(a).toBeInstanceOf(A);
	expect(a.getB()).toBe(42);
});

test("bind abstract class to another class", async () => {
	abstract class A {
		abstract kind: string;
	}
	class B extends injectDeps({}) {
		kind = "b";
	}
	const testContext = createContext("test", [bind(A, { toClass: B })]);
	const a = await testContext.resolve(A);
	expect(a).toBeInstanceOf(B);
	expect(a.kind).toBe("b");
});

test("bind abstract class to a value", async () => {
	abstract class A {
		abstract n: number;
	}
	const testContext = createContext("test", [bind(A, { toValue: { n: 42 } })]);
	const a = await testContext.resolve(A);
	expect(a.n).toBe(42);
});

test("bind an interface to a class", async () => {
	const A = injectable<{ n: number }>();
	class AImpl implements Resolved<typeof A> {
		n = 42;
	}
	const testContext = createContext("test", [bind(A, { toClass: AImpl })]);
	const a = await testContext.resolve(A);
	expect(a.n).toBe(42);
});

test("basic class with deps", async () => {
	const A = injectable<number>();
	const B = injectable<{ n: number }>();

	class BImpl extends injectDeps({ A }) {
		n = this.deps.a * 2;
	}

	const testContext = createContext("test", [
		bind(A, { toProvider: async () => 10 }),
		bind(B, { toClass: BImpl }),
	]);
	const b = await testContext.resolve(B);
	expect(b.n).toBe(20);
});

type DeferredTest = { x: number; sum: () => Promise<number> };
test("deferred cyclic injection", async () => {
	const A = injectable<DeferredTest>();
	const B = injectable<DeferredTest>();

	class AImpl extends injectDeps({ b: deferred(B) }) implements DeferredTest {
		x = 1;
		async sum() {
			const bx = (await this.deps.b).x;
			return this.x + bx;
		}
	}

	class BImpl extends injectDeps({ a: deferred(A) }) implements DeferredTest {
		x = 2;
		async sum() {
			const ax = (await this.deps.a).x;
			return this.x + ax;
		}
	}

	const testContext = createContext("test", [
		bind(A, { toClass: AImpl }),
		bind(B, { toClass: BImpl }),
	]);

	const { a, b } = await testContext.resolveDict({ A, B });
	expect(a.x).toBe(1);
	expect(await a.sum()).toBe(3);
	expect(b.x).toBe(2);
	expect(await b.sum()).toBe(3);
});

test("types", () => {
	factory({}, () => 42) satisfies Injectable<number>;

	abstract class ClassInjectable {}
	ClassInjectable satisfies Injectable<ClassInjectable>;
});

test("child context respects parent cache", async () => {
	const aMock = vi.fn(() => ({}));
	const A = factory({}, aMock);
	const aBind = bind(A);
	const bMock = vi.fn(() => ({}));
	const B = factory({}, bMock);
	const bBind = bind(B);

	const parent = createContext("parent", [aBind]);

	const child1 = parent.createChildContext("child1", [bBind]);
	const child1A = await child1.resolve(A);
	expect(aMock).toHaveBeenCalledTimes(1);
	const child1B = await child1.resolve(B);
	expect(bMock).toHaveBeenCalledTimes(1);

	const child2 = parent.createChildContext("child2", [bBind]);
	const child2A = await child1.resolve(A);
	expect(child2A).toBe(child1A);
	expect(aMock).toHaveBeenCalledTimes(1);
	const child2B = await child2.resolve(B);
	expect(child2B).not.toBe(child1B);
	expect(bMock).toHaveBeenCalledTimes(2);
});

test("child context bindings override parent context bindings", async () => {
	let counter = 0;
	const A = factory({}, () => ++counter);

	const parent = createContext("parent", [bind(A)]);
	const child = parent.createChildContext("child", [
		bind(A, { scope: "transient" }),
	]);

	const a1 = await child.resolve(A);
	const a2 = await child.resolve(A);
	expect(a1).not.toBe(a2);
});

test("resolve external factory", async () => {
	const A = injectable<number>();
	const ctx = createContext("test", [bind(A, { toValue: 42 })]);

	const plusOne = factory({ A }, ({ a }) => a + 1);
	const aPlusOne = await ctx.resolveExternalFactory(plusOne);
	expect(aPlusOne).toBe(43);
});

test("resolve external class", async () => {
	const A = injectable<number>();
	const ctx = createContext("test", [bind(A, { toValue: 42 })]);

	class B extends injectDeps({ A }) {
		plusOne = this.deps.a + 1;
	}
	const b = await ctx.resolveExternalClass(B);
	expect(b.plusOne).toBe(43);
});
