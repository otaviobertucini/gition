import * as core from "@actions/core"
import { Client } from "@notionhq/client"
import dotenv from "dotenv"
import { NotionToMarkdown } from "notion-to-md"
dotenv.config()
// import * as github from "@actions/github"

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
		notionPage: core.getInput("NOTION_SECRET", { required: true }),
		notionSecret: core.getInput("NOTION_PAGE", { required: true }),
	}
}

async function main(): Promise<void> {
	try {
		console.log("falatu")
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

		// const mdBlocks = await notion2md.pageToMarkdown(credentials.notionPage)
		// const content = notion2md.toMarkdownString(mdBlocks)
		// console.log(`🚀 ~ main ~ content:`, content)

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
		console.log(`🚀 ~ main ~ pages:`, pages)

		const convertedPages = await Promise.all(
			pages.map(async (page) => {
				const mdBlocks = await notion2md.pageToMarkdown(page.id)
				const content = notion2md.toMarkdownString(mdBlocks)

				return {
					content,
					path: page.path,
				}
			}),
		)

		console.log(`🚀 ~ convertedPages ~ convertedPages:`, convertedPages)
	} catch (error) {
		console.log(`🚀 ~ main ~ error:`, error)
	}
}

main().catch(() => {})
