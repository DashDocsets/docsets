#!/usr/bin/env bun

import { defineCommand, runMain } from "citty";
import { readdir } from "node:fs/promises";
import { $ } from "bun";
import sharp from "sharp";

const DOCSET_EXTENSION = ".tgz";

const main = defineCommand({
	meta: {
		name: "json",
		version: "1.0.0",
		description: "Docsets",
	},

	async run({ args, subCommand }) {
		const docsetFiles = (await readdir("./docsets"))
			?.filter((file) => file.endsWith(DOCSET_EXTENSION))
			?.map((file) => file.slice(0, -DOCSET_EXTENSION.length));
		for (const docset of docsetFiles) {
			console.log("Extracting images from", docset);
			const docsetPath = `./docsets/${docset}${DOCSET_EXTENSION}`;
			const resp =
				await $`tar -xvzf ${docsetPath} -C ./tmp/images ${docset}.docset/icon.tiff`.nothrow();
			if (resp.exitCode !== 0) {
				continue;
			}
			const tempImagePath = `./tmp/images/${docset}.docset/icon.tiff`;
			const finalImagePath = `./images/${docset}.png`;
			await sharp(tempImagePath).toFormat("png").toFile(finalImagePath);
			console.log("Extracted image", finalImagePath);
		}
	},
});

runMain(main);
