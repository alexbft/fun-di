import { expect, test } from "vitest";
import { factory } from "~/helpers/factory";

test("toString", () => {
	const MyFactoryRef = factory({}, function MyFactory() {
		return 42;
	});
	expect(MyFactoryRef.toString()).toBe("Factory(MyFactory)");
	MyFactoryRef.displayName = "My cool factory";
	expect(MyFactoryRef.toString()).toBe("Factory(My cool factory)");
});
