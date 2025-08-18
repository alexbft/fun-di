export function lazyPromise<T>(fn: () => Promise<T>): Promise<T> {
  let result: Promise<T> | undefined;

  // biome-ignore lint/suspicious/noAssignInExpressions: intentional
  const cachedResult = () => (result ??= fn());

  return {
    // biome-ignore lint/suspicious/noThenProperty: intentional
    then(onFulfilled, onRejected) {
      return cachedResult().then(onFulfilled, onRejected);
    },
    catch(onRejected) {
      return cachedResult().catch(onRejected);
    },
    finally(onFinally) {
      return cachedResult().finally(onFinally);
    },
    [Symbol.toStringTag]: "LazyPromise",
  };
}
