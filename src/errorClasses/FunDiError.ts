export class FunDiError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = "FunDiError";
		Object.setPrototypeOf(this, FunDiError.prototype);
	}
}
