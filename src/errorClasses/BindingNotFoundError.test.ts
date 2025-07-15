import { expect, test } from "vitest";
import { BindingNotFoundError } from "~/errorClasses/BindingNotFoundError";
import { FunDiError } from "~/errorClasses/FunDiError";

test("should have correct properties", () => {
	const error = new BindingNotFoundError("test");

	expect(error).toBeInstanceOf(Error);
	expect(error).toBeInstanceOf(FunDiError);
	expect(error).toBeInstanceOf(BindingNotFoundError);
	expect(error.name).toBe("BindingNotFoundError");
	expect(error.message).toBe("test");
});
