#!/usr/bin/env bun

import { defineCommand, runMain } from "citty";
import { readdir } from "node:fs/promises";
import { $, file } from "bun";
import dayjs from "dayjs";
import { difference, intersection } from "remeda";

const DOCSET_EXTENSION = ".tgz";

const main = defineCommand({
	meta: {
		name: "json",
		version: "1.0.0",
		description: "Docsets",
	},

	async run({ args, subCommand }) {
		const file = Bun.file("./docsets.json");
		const fileContent = await file.json();
		const docsets = {
			docsets: {} as Record<
				string,
				{
					name: string;
					alias: string[];
					archive: string;
					version: string;
					hash: string;
				}
			>,
		};
		const docsetFiles = (await readdir("./docsets"))
			?.filter((file) => file.endsWith(DOCSET_EXTENSION))
			?.map((file) => file.slice(0, -DOCSET_EXTENSION.length));
		for (const docset of docsetFiles) {
			const date = dayjs();
			const docsetPath = `./docsets/${docset}${DOCSET_EXTENSION}`;
			const resp = await $`shasum ${docsetPath}`;
			const text = resp.text();
			const hash = text.split(" ")[0];
			const version = `1.${date.format("YYMMDD")}.${dayjs().format("HHmm")}`;
			docsets.docsets[docset] = {
				name: docset,
				alias: [docset],
				archive: `${docset}${DOCSET_EXTENSION}`,
				version,
				hash,
			};
		}

		const fileContentKeys = Object.keys(fileContent.docsets);
		const docsetFilesKeys = Object.keys(docsets.docsets);

		const toUpdate = intersection(fileContentKeys, docsetFilesKeys);
		const newDocsets = difference(docsetFilesKeys, fileContentKeys);
		const removedDocsets = difference(fileContentKeys, docsetFilesKeys);

		for (const docset of toUpdate) {
			const fileContentDocset = fileContent.docsets[docset];
			const docsetFilesDocset = docsets.docsets[docset];

			if (fileContentDocset.hash !== docsetFilesDocset.hash) {
				console.log("Updating hash for", docset);
				fileContent.docsets[docset].version = docsetFilesDocset.version;
				fileContent.docsets[docset].hash = docsetFilesDocset.hash;
			}
		}

		for (const docset of newDocsets) {
			console.log("Adding new docset", docset);
			fileContent.docsets[docset] = docsets.docsets[docset];
		}

		for (const docset of removedDocsets) {
			console.log("Removing docset", docset);
			delete fileContent.docsets[docset];
		}

		Bun.write(file, JSON.stringify(fileContent, null, 2));
	},
});

runMain(main);
