module.exports = {
	overrides: [
		{
			files: ["*.ts"],
			extends: ["eslint-config-standard-with-typescript", "prettier"],
			parserOptions: {
				project: "./tsconfig.json",
			},
			rules: {
				indent: "off",
			},
		},
	],
}
