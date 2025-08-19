import { defineConfig, getPackName, type BuildConfigFunction } from "@/config";
import { describe, expect, it } from "vitest";

describe("defineConfig()", () => {
	it("returns the exact same object", () => {
		const fn: BuildConfigFunction = () => ({});
		const received = defineConfig(fn);

		expect(received).toBe(fn);
	});
});

describe("getPackName()", () => {
	it("returns correct string", () => {
		{
			const actual = getPackName(
				{
					type: "behavior",
					srcDir: "",
					outDir: "",
					manifest: {},
				},
				5,
			);
			const expected = `PACK@5`;
			expect(actual).toBe(expected);
		}

		{
			const actual = getPackName(
				{
					type: "behavior",
					srcDir: "",
					outDir: "",
					manifest: {},
					name: "MyPack",
				},
				69,
			);
			const expected = `MyPack`;
			expect(actual).toBe(expected);
		}
	});
});
