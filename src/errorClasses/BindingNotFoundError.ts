import { FunDiError } from "~/errorClasses/FunDiError";

export class BindingNotFoundError extends FunDiError {
	constructor(message: string) {
		super(message);
		this.name = "BindingNotFoundError";
		Object.setPrototypeOf(this, BindingNotFoundError.prototype);
	}
}
