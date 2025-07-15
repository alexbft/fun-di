import { defineConfig } from "rolldown";
import { dts } from "rolldown-plugin-dts";

export default defineConfig({
	input: "src/index.ts",
	output: {
		dir: "dist",
		minify: true,
		sourcemap: true,
	},
	plugins: [dts()],
	resolve: {
		tsconfigFilename: "tsconfig.json",
	},
});
