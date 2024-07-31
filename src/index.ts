import * as core from "@actions/core"
import fs from "fs"
import { Client } from "@notionhq/client"
import dotenv from "dotenv"
import { NotionToMarkdown } from "notion-to-md"
dotenv.config()

async function resolveSequentially<T>(
	array: T[],
	fn: (item: T) => Promise<void>,
): Promise<void> {
	await array.reduce(async (acc, item) => {
		await acc.then(async () => {
			await fn(item)
		})
	}, Promise.resolve())
}

interface Credentials {
	notionSecret: string
	notionPage: string
	rootDir?: string
}

interface NotionBlock {
	id: string
	child_page: {
		title: string
	}
}

function getDevelopmentCredentials(): Credentials {
	return {
		notionPage: process.env.NOTION_PAGE ?? "",
		notionSecret: process.env.NOTION_SECRET ?? "",
		rootDir: process.env.ROOT_DIR,
	}
}

function getActionCredentials(): Credentials {
	return {
		notionPage: core.getInput("NOTION_PAGE", {
			required: true,
		}),
		notionSecret: core.getInput("NOTION_SECRET", { required: true }),
		rootDir: core.getInput("ROOT_DIR", { required: true }),
	}
}

async function main(): Promise<void> {
	try {
		let credentials: Credentials

		const args = process.argv.slice(2)
		if (args.includes("--development")) {
			credentials = getDevelopmentCredentials()
		} else {
			credentials = getActionCredentials()
		}

		const BASE_DIR = credentials.rootDir ?? "Notion"

		const notion = new Client({ auth: credentials.notionSecret })

		const notion2md = new NotionToMarkdown({
			notionClient: notion,
			config: {
				parseChildPages: false,
			},
		})

		const parent = (await notion.blocks.retrieve({
			block_id: credentials.notionPage,
		})) as NotionBlock

		await fs.promises.rm(`./${BASE_DIR}/${parent.child_page.title}`, {
			force: true,
			recursive: true,
		})

		const blocks = [
			{
				path: ``,
				block: parent,
			},
		]

		const pages: Array<{
			id: string
			path: string
		}> = []
		while (blocks.length > 0) {
			const block: any = blocks.shift()
			if (block == null) return
			const children = await notion.blocks.children.list({
				block_id: block.block.id,
			})

			pages.push({
				id: block.block.id,
				path: `${block.path}/${block.block.child_page.title}`,
			})

			blocks.push(
				...children.results
					.filter((page: any) => page.type === "child_page")
					.map((page: any) => ({
						path: `${block.path}/${block.block.child_page.title}`,
						block: page,
					})),
			)
		}

		const convertedPages = await Promise.all(
			pages.map(async (page) => {
				const mdBlocks = await notion2md.pageToMarkdown(page.id)
				const content = notion2md.toMarkdownString(mdBlocks)

				return {
					content,
					path: page.path,
					id: page.id,
				}
			}),
		)

		await resolveSequentially(convertedPages, async (item) => {
			const fullPath = `./${BASE_DIR}/${item.path}`

			await fs.promises.mkdir(fullPath, {
				recursive: true,
			})

			await fs.promises.writeFile(
				`${fullPath}/content.md`,
				item.content.parent,
				{
					encoding: "utf8",
				},
			)
		})

		// TODO: read more than one page
	} catch (error) {
		console.log(`🚀 ~ main ~ error:`, error)
	}
}

main().catch(() => {})
