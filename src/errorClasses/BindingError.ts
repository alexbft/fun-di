import { FunDiError } from "~/errorClasses/FunDiError";

export class BindingError extends FunDiError {
  constructor(message: string) {
    super(message);
    this.name = "BindingError";
    Object.setPrototypeOf(this, BindingError.prototype);
  }
}
