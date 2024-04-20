module.exports = {
	overrides: [
		{
			files: ["*.ts"],

			extends: "eslint-config-standard-with-typescript",
			parserOptions: {
				project: "./tsconfig.json",
			},
		},
	],
};
