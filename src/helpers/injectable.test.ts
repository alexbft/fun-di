import { expect, test } from "vitest";
import { injectable } from "~/helpers/injectable";

test("injectable toString()", () => {
  const inj = injectable<never>("My injectable");
  expect(inj.toString()).toBe("Injectable(My injectable)");
});

test("unnamed injectable", () => {
  const inj = injectable<never>();
  expect(inj.toString()).toBe("Injectable()");
});
