# fun-di

`fun-di` is a dependency injection framework that is lightweight and fun to use. It:

- does not use decorators
- does not have dependencies
- is strongly typed
- supports OOP and functional style

## Installation

```sh
  pnpm install @alexbft0/fun-di
```

## Example usage

### Using factories

```ts
  import { bind, createContext, factory, injectable } from "@alexbft0/fun-di";
  import { createLogger } from "~/lib/logger";

  type EnvType = "dev" | "prod";

  const apiUrl = injectable<string>();
  const apiUrlBinding = bind(apiUrl, { toValue: "https://example.org/" });

  const env = injectable<EnvType>();
  const envBinding = bind(env, { toValue: "dev" });

  const Logger = factory({ env }, async ({ env }) => {
    const logger = await createLogger({
      level: env === "dev" ? "info" : "error",
    });

    return logger;
  });
  const loggerBinding = bind(Logger);

  const customFetch = factory({ apiUrl, Logger }, (deps) => {
    const { apiUrl, logger } = deps;

    return function customFetch(path: string) {
      const url = new URL(apiUrl + path);

      logger.info({ url }, "Fetching...");

      return fetch(url);
    };
  });
  const customFetchBinding = bind(customFetch);

  const appContext = createContext("app", [
    apiUrlBinding,
    envBinding,
    loggerBinding,
    customFetchBinding,
  ]);

  export async function main() {
    const customFetchFn = await appContext.resolve(customFetch);
    const response = await customFetchFn("posts/1");
    console.log("Response", await response.json());
  }
```

### Using classes

```ts
  import { bind, createContext, injectable, injectDeps } from "@alexbft0/fun-di";
  import { type BaseLogger, createLogger } from "~/lib/logger";

  type EnvType = "dev" | "prod";

  const apiUrl = injectable<string>();
  const apiUrlBinding = bind(apiUrl, { toValue: "https://example.org/" });

  const env = injectable<EnvType>();
  const envBinding = bind(env, { toValue: "dev" });

  class Logger extends injectDeps({ env }) {
    private parent: BaseLogger | undefined;

    constructor() {
      super();
      this.init();
    }

    private async init() {
      const level = this.deps.env === "dev" ? "info" : "error";
      this.parent = await createLogger({ level });
    }

    info(...args: unknown[]) {
      this.parent?.info(...args);
    }
  }
  const loggerBinding = bind(Logger);

  class Fetcher extends injectDeps({ apiUrl, Logger }) {
    fetch(path: string) {
      const url = new URL(this.deps.apiUrl + path);

      this.deps.logger.info({ url }, "Fetching...");

      return fetch(url);
    }
  }
  const fetcherBinding = bind(Fetcher);

  const appContext = createContext("app", [
    apiUrlBinding,
    envBinding,
    loggerBinding,
    fetcherBinding,
  ]);

  export async function main() {
    const fetcher = await appContext.resolve(Fetcher);
    const response = await fetcher.fetch("posts/1");
    console.log("Response", await response.json());
  }
```

### Next.js server component with dependencies

```tsx
  import { factory } from "@alexbft0/fun-di";
  import { DbConnection } from "~/lib/DbConnection";
  import { ItemsTable } from "~/lib/ItemsTable";

  export const ServerComponent = factory(
    { DbConnection },
    async ({ dbConnection }) => {
      const items = await dbConnection.select().from(ItemsTable);

      return (
        <ul>
          {items.map((item) => (
            <li key={item.id}>{item.name}</li>
          ))}
        </ul>
      );
    },
  );

  ServerComponent.displayName = "ServerComponent";

  // Calling ServerComponent() will inject DbConnection from a global context.
  // In another file:
  //
  // const globalContext = createContext("global", [bind(DbConnection, {
  //   toProvider: () => createPostgresDbConnection()
  // })]);
  //
  // setGlobalContext(globalContext);
```

## Concepts

### Injectable

An injectable is like a variable - a named reference that refers to a value. The crucial distinction, however, is that the value of an injectable depends on the context it is resolved within. For example, you can bind an injectable to a real database connection in production, bind it to local database when running your application locally, and bind it to a stub in unit tests.

Define an abstract injectable like this:

```ts
  const SomeNumber = injectable<number>();
```

For convenience, all factory providers and classes are injectables too.

```ts
  const FactoryInjectable = factory({}, () => 42) satisfies Injectable<number>;

  abstract class ClassInjectable {}
  ClassInjectable satisfies Injectable<ClassInjectable>;
```

### Binding

A binding is a definition of how a given injectable should be resolved. It consists of a target and a scope. A target defines what should the result be; a scope defines how the result should be cached.

### Binding target

#### toValue

Binds injectable to a constant value.

```ts
  const a = injectable<number>();

  bind(a, { toValue: 42 });
```

#### toProvider

Binds injectable to the result of a function invocation. If the function returns a promise, it will be unwrapped.

```ts
  const a = injectable<number>();

  bind(a, { toProvider: () => 42 });
```

#### toInjectable

Binds injectable to another injectable. When resolving, it will resolve the target injectable in the same context and return the result. It will always try to re-resolve the target injectable; but if the target injectable is bound in caching scope, then the result will be cached as normal.

```ts
  const a = injectable<number>();
  const b = injectable<number>();

  bind(b, { toInjectable: a });
```

#### toFactory

Binds injectable to a factory with dependencies. When resolving, it will first resolve the dependencies and then call the factory function with resolved deps dictionary as a single argument.

```ts
  const A = injectable<number>();
  const B = injectable<number>();

  const BImpl = factory({ A }, async ({ a }) => {
    return a * 2;
  });

  bind(B, { toFactory: BImpl });
```

#### toClass

Binds injectable to a class. If the class inherits from `injectDeps` utility class, then it will resolve the dependencies as a dictionary, and assign it to a `protected readonly deps` field.

```ts
  const A = injectable<number>();
  const B = injectable<{ n: number }>();

  class BImpl extends injectDeps({ A }) {
    n = this.deps.a * 2;
  }

  bind(B, { toClass: BImpl });
```

#### Self-binding

As a convenient option, you can bind a factory or a class to itself, if `toXyz` option is omitted.

```ts
  const A = factory({}, () => 42);

  bind(A);
  bind(A, { toFactory: A }); // equivalent to the line above

  bind(A, { scope: "request" });
  bind(A, { toFactory: A, scope: "request" }); // equivalent to the line above
```

### Binding scope

#### Singleton scope

The result is cached per context. Suitable for lazily initialized services, such as DB interfaces, API entrypoints. This is a default scope for `toValue` and `toProvider` targets.

```ts
  const A = factory({}, () => {
    console.log("A is initialized");
    return {};
  });

  const context = createContext("test", [bind(A, { scope: "singleton" })]);
  const a1 = await context.resolve(A); // console.log is called
  const a2 = await context.resolve(A); // a cached value is returned
  a1 === a2; // true
```

#### Transient scope

The result is never cached. If bound to a factory, the factory function will be called every time the injectable is resolved. If bound to a class, a new instance of a class will be constructed on every resolution.

```ts
  const A = factory({}, () => {
    console.log("A is initialized");
    return {};
  });

  const context = createContext("test", [bind(A, { scope: "transient" })]);
  const a1 = await context.resolve(A); // console.log is called
  const a2 = await context.resolve(A); // console.log is called again
  a1 === a2; // false
```

#### Request scope

The result is cached once per resolution process. It means if multiple objects resolved at the same time have the same dependency, the provider for this dependency will be called only once.

This scope is suitable for user-specific or client request-specific data, such as session data, user id or user role.

**Warning**: the term "Request" used here is not an HTTP request! It refers to a resolution request, which is a single `resolve` or `resolveDict` call.

```ts
  let counter = 0;
  const A = factory({}, () => ++counter);
  const context = createContext("test", [bind(A, { scope: "request" })]);

  const { a1, a2 } = await context.resolveDict({ a1: A, a2: A });
  a1 === a2; // true
  const { a3 } = await context.resolveDict({ a3: A });
  a1 !== a3; // true
  a2 !== a3; // true
```

#### Dependent scope

A scope derived from provider dependencies. It is equal to a minimal scope of all the dependencies, in the order of `transient` < `request` < `singleton`. For an empty list of dependencies, it is equal to `singleton`.

This scope is default for `toFactory` and `toClass` bindings.

### Context

A context is, essentially, a collection of bindings coupled with a cache for singletons.
To create a new context, call `createContext`:

```ts
  const A = injectable<number>();
  const aBinding = bind(A, { toValue: 42 });

  const B = injectable<string>();
  const bBinding = bind(B, { toValue: "Hello world!" });

  const appContext = createContext("app", [aBinding, bBinding]);
```

When declaring your providers (factories, classes) the best practice is to return a collection of bindings that can be used to create a context. Do not reference contexts directly in providers - this will defeat the purpose of DI.

Context is also an injectable:

```ts
  const appContext = createContext("app", []);
  appContext === (await appContext.resolve(Context)) // true
```

#### Context.resolve

Returns a Promise with resolved value of an injectable in this context.

```ts
  const aValue = await context.resolve(AInjectable);
```

#### Context.resolveDict

Returns a Promise with a dictionary of resolved injectables. The keys are uncapitalized. You can name the keys directly or use shorthand syntax.

```ts
  const { a, b } = await context.resolve({ a: A, b: B });
  const { a, b } = await context.resolve({ A, B }); // equivalent
```

This method is called implicitly for class and factory dependencies.

### Global context

In an entry point of a program, you either have to reference a context directly (which is bad practice), or rely on some implicit value which holds a "default" context. This implicit value is called global context.

```ts
  // In some package
  const appContext = createContext("app", appBindings);

  setGlobalContext(appContext);

  // In index.ts, or in another entry point
  const app = await getGlobalContext().resolve(App);
  await app.run();
```

For convenience, you can call a factory function directly - it will resolve its dependencies in the global context. This makes it perfect for server actions in modern web frameworks.

```ts
  const ActionRunner = factory({ A, B, C }, ({ a, b, c }) => /* ... */);

  ActionRunner();

  // Is equivalent to:
  const resolvedDeps = await getGlobalContext().resolveDict(ActionRunner.deps);
  ActionRunner.run(resolvedDeps);

  // Or:
  const tempContext = getGlobalContext().createChildContext("temp", [bind(ActionRunner)]);
  await tempContext.resolve(ActionRunner);
```

You can also construct a class directly to inject its deps from a global context.

```ts
  class WithDeps extends injectDeps({ A, B, C }) {
    public readonly a: A;

    constructor() {
      super();
      this.a = this.deps.a;
    }
  }

  const instance = new WithDeps();
  console.log(instance.a); // is injected from global context
```

### Child context

You can create a child context from a given context with additional bindings. This is useful when implementing Wrapper or Repository patterns, to provide some data to a child handler indirectly. See the example below:

```ts
  function actionBindings(name: string): Binding<unknown>[] {
    const actionLoggerFactory = factory({ baseLogger }, ({ baseLogger }) =>
      baseLogger.child({ actionName: name }),
    );
    return [bind(Logger, { toFactory: actionLoggerFactory })];
  }

  export async function main() {
    const helloAction = factory({ Logger }, ({ logger }) => {
      logger.info("Hello world!");
    });

    const appContext = createContext("app", [
      bind(baseLogger, { toProvider: () => createLogger({ level: "info" }) }),
      bind(Logger, { toInjectable: baseLogger }),
      bind(helloAction),
    ]);

    const actionContext = appContext.createChildContext("action", [
      ...actionBindings("hello"),
    ]);

    await actionContext.resolve(helloAction);
  }
```

In this example, action is resolved in a context that provides a customized Logger instance - decorated with the action name. This logic can be extracted into a helper function.

### Resolution options

#### Optional dependency

When resolving an injectable, you can specify it as `optional`. This way, if the injectable is not bound in current context, you will get `undefined` as a result.

```ts
  const A = injectable<number>();
  const B = injectable<number>();

  const context = createContext("test", [bind(A, { toValue: 42 })]);

  const a = await context.resolve(optional(A));
  expect(a).toBe(42);

  const b = await context.resolve(optional(B));
  expect(b).toBeUndefined();
```

The `optional` modifier is valid in factory and class dependency declarations, too.

#### Deferred dependency

When resolving an injectable, you can specify it as `deferred`. Then, the resolution process is skipped; you will get a promise that you can `await` later to get the resolved value.

This allows you to have indirect circular dependencies, when `A` has a reference to `B` and vice versa.

```ts
  const A = injectable<number>();
  const B = factory({ aPromise: deferred(A) }, async ({ aPromise }) => {
    const a = await aPromise;
    return a * 2;
  });
```
