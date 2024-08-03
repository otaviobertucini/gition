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
		notionPage: process.env.NOTION_PAGES ?? "",
		notionSecret: process.env.NOTION_SECRET ?? "",
		rootDir: process.env.ROOT_DIR,
	}
}

function getActionCredentials(): Credentials {
	return {
		notionPage: core.getInput("NOTION_PAGES", {
			required: true,
		}),
		notionSecret: core.getInput("NOTION_SECRET", { required: true }),
		rootDir: core.getInput("ROOT_DIR", { required: false }),
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

		const pagesIds = credentials.notionPage.split(";")

		await fs.promises.rm(`./${BASE_DIR}`, {
			force: true,
			recursive: true,
		})

		await Promise.all(
			pagesIds.map(async (pageId) => {
				const parent = (await notion.blocks.retrieve({
					block_id: pageId,
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

					const commentsBlock = await notion.comments.list({
						block_id: block.block.id,
					})

					if (commentsBlock.results.length > 0) {
						const comments: string[] = []
						commentsBlock.results.forEach((comment) => {
							comment.rich_text.forEach((text) => {
								comments.push(text.plain_text)
							})
						})

						const isPaused = comments.some((comment) => {
							const match = comment.match(/^Status=(.*)$/)
							if (
								match != null &&
								match[1].toLowerCase() === "paused"
							) {
								return true
							}
							return false
						})

						if (isPaused) continue
					}

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

						const normalizedBlocks = mdBlocks.map((block) => {
							if (
								block.type === "paragraph" &&
								block.parent === ""
							) {
								return {
									...block,
									parent: "\n",
								}
							}
							return block
						})

						const content =
							notion2md.toMarkdownString(normalizedBlocks)

						return {
							content,
							path: page.path,
							id: page.id,
							isEmpty: mdBlocks.length === 0,
						}
					}),
				)

				await resolveSequentially(convertedPages, async (item) => {
					const fullPath = `./${BASE_DIR}/${item.path}`

					await fs.promises.mkdir(fullPath, {
						recursive: true,
					})

					if (item.isEmpty) return

					await fs.promises.writeFile(
						`${fullPath}/content.md`,
						item.content.parent,
						{
							encoding: "utf8",
						},
					)
				})
			}),
		)
	} catch (error) {
		console.log(`🚀 ~ main ~ error:`, error)
	}
}

main().catch(() => {})
