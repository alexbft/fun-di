import { FunDiError } from "~/errorClasses/FunDiError";

export class ResolutionRuntimeError extends FunDiError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ResolutionRuntimeError";
    Object.setPrototypeOf(this, ResolutionRuntimeError.prototype);
  }
}
