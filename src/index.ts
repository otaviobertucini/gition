import * as core from "@actions/core"
// import * as github from "@actions/github"

function main(): void {
	const notionSecret = core.getInput("NOTION_SECRET", { required: true })
	const notionSage = core.getInput("NOTION_PAGE", { required: true })

	core.info(notionSecret)
	core.info(notionSage)
}

main()
