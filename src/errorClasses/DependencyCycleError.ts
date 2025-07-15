import { FunDiError } from "~/errorClasses/FunDiError";

export class DependencyCycleError extends FunDiError {
	constructor(message: string) {
		super(message);
		this.name = "DependencyCycleError";
		Object.setPrototypeOf(this, DependencyCycleError.prototype);
	}
}
