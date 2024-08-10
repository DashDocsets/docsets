#!/usr/bin/env bun

import { defineCommand, runMain } from "citty";
import { readdir, exists } from "node:fs/promises";
import { $ } from "bun";
import { confirm } from "@inquirer/prompts";

const CONFIG_EXTENSION = ".docsetconfig";

const toArrayIfString = (val: string | string[]) =>
	Array.isArray(val) ? val : [val];

const main = defineCommand({
	meta: {
		name: "generate",
		version: "1.0.0",
		description: "Docsets",
	},
	args: {
		docsets: {
			type: "positional",
			description: "Docset name",
			required: false,
		},
		docset: {
			type: "string",
			description: "Docset name",
			alias: ["d", "docset"],
			required: false,
		},
		all: {
			type: "boolean",
			description:
				"if other args are not provided defauts to true, if no args are provided defaults to false",
			default: undefined,
		},
	},
	async run({ args }) {
		let { all, _: rest, docset, docsets } = args;
		const docsetNames = Array.from(
			new Set(
				[
					...toArrayIfString(docset),
					...toArrayIfString(docsets),
					...toArrayIfString(rest),
				].filter(Boolean),
			),
		);
		const checkedDocsets: Array<string> = [];

		if (all === undefined && docsetNames.length === 0) {
			all = await confirm({
				message: "Do you want to generate all docsets?",
				default: false,
			});
		}

		if (docsetNames.length === 0 && all) {
			const configs = await readdir("./configs");
			for (const config of configs) {
				if (config.endsWith(CONFIG_EXTENSION)) {
					const docsetName = config.slice(0, -CONFIG_EXTENSION.length);
					checkedDocsets.push(docsetName);
				}
			}
		} else {
			for (const docsetName of docsetNames) {
				const docsetConfigPath = `./configs/${docsetName}${CONFIG_EXTENSION}`;
				const exist = await exists(docsetConfigPath);

				if (!exist) {
					console.error(`Docset config ${docsetConfigPath} does not exist`);
					continue;
				}
				checkedDocsets.push(docsetName);
			}
		}

		if (checkedDocsets.length === 0) {
			return;
		}

		console.log("Generating docs for: ", checkedDocsets);

		for (const docsetName of checkedDocsets) {
			const docsetConfigPath = `./configs/${docsetName}${CONFIG_EXTENSION}`;
			console.log(
				`Generating docset ${docsetName} from config ${docsetConfigPath}`,
			);
			console.log(`[LOG]: ./tmp/${docsetName}.docset/log.txt`);
			console.log(
				`[Scrapping LOG]: ./tmp/${docsetName}.docset/resumeData/scrapes.txt`,
			);
			await $`cd tmp && DocsetGenerator .${docsetConfigPath}`;
			await $`cd tmp && tar -cvzf ../docsets/${docsetName}.tgz ${docsetName}.docset`;
			console.log(`Docset ${docsetName} generated`);
		}
	},
});

runMain(main);
