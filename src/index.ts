import * as core from "@actions/core"
import fs from "fs"
// import path from "path"
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
	}
}

function getActionCredentials(): Credentials {
	return {
		notionPage: core.getInput("NOTION_PAGE", {
			required: true,
		}),
		notionSecret: core.getInput("NOTION_SECRET", { required: true }),
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

		core.info(JSON.stringify(credentials))

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

		const convertedPages = (
			await Promise.all(
				pages.map(async (page) => {
					const commentsBlock = await notion.comments.list({
						block_id: page.id,
					})

					let isReady = false
					if (commentsBlock.results.length === 0) {
						isReady = true
					} else {
						const comments: string[] = []
						commentsBlock.results.forEach((comment) => {
							comment.rich_text.forEach((text) => {
								comments.push(text.plain_text)
							})
						})

						const match =
							comments[comments.length - 1].match(/^Status=(.*)$/)
						if (match != null && match[1] === "Ready") {
							isReady = true
						}
					}

					const mdBlocks = await notion2md.pageToMarkdown(page.id)
					const content = notion2md.toMarkdownString(mdBlocks)

					return {
						content,
						path: page.path,
						id: page.id,
						isReady,
					}
				}),
			)
		).filter((page) => page.isReady)

		await Promise.all(
			convertedPages.map(async (page) => {
				// await notion.comments.create({
				// 	parent: {
				// 		page_id: page.id,
				// 	},
				// 	rich_text: [
				// 		{
				// 			text: {
				// 				content: "Status=Done",
				// 			},
				// 		},
				// 	],
				// })
			}),
		)

		await resolveSequentially(convertedPages, async (item) => {
			await fs.promises.mkdir("./" + item.path, {
				recursive: true,
			})

			await fs.promises.writeFile(
				`.${item.path}/content.md`,
				item.content.parent,
				{
					encoding: "utf8",
				},
			)
		})

		// TODO: save files and contents in the repository in folder
	} catch (error) {
		console.log(`🚀 ~ main ~ error:`, error)
	}
}

main().catch(() => {})
