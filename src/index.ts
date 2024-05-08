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
			// parseChildPages: false,
			separateChildPage: true,
		},
	})

	const mdBlocks = await notion2md.pageToMarkdown(credentials.notionPage)
	const content = notion2md.toMarkdownString(mdBlocks)
	console.log(`🚀 ~ main ~ content:`, content)
}

main().catch(() => {})
