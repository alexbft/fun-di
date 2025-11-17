import type { ResolutionResult } from "~/types/ResolutionResult";
import type { ResolveResult } from "~/types/ResolveResult";

export function mapResolutionResultToResolveResult<T>(
  resolutionResult: ResolutionResult<T>,
): ResolveResult<T> {
  switch (resolutionResult.type) {
    case "success":
      return resolutionResult;
    case "notFound":
      return { type: "notFound" };
    case "runtimeError":
      return { type: "runtimeError", error: resolutionResult.error };
  }
}
