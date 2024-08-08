Gition is a GitHub Action that allows you to export Notion pages directly into your repositories. When triggered, it reads the content of one or more Notion pages and saves it in specified repository folders.

## Configuration

### Notion Setup

1. Access your [Notion integrations](https://www.notion.so/profile/integrations) and create a new integration with the following settings:

   ![Notion Integration](https://github.com/otaviobertucini/gition/blob/master/capabilities.gif?raw=true)

2. Save the "Internal Integration Secret" for later use.

3. Go to the Notion page you want to connect and link it to the integration you just created.

   ![Notion Page Integration](https://github.com/otaviobertucini/gition/blob/master/notion.gif?raw=true)

4. Obtain the page ID from the URL of your Notion page for later. For example, if the URL is `https://www.notion.so/Building-Data-Intensive-Application-3f52f0203a3e4aedb0931227bb485545`, the page ID is `3f52f0203a3e4aedb0931227bb485545`.

### GitHub Repository Setup

1. Navigate to the GitHub repository where you want to save the content and create a new workflow in the Actions tab. Select "Simple workflow" and paste the YAML code provided below.

2. Configure the environment variables:

   - Create a new secret in the repository ([instructions here](https://docs.github.com/pt/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions)) and save the "Internal Integration Secret" under it.
   - Paste the Notion page ID(s) in the `NOTION_PAGES` variable in the YAML code. If you have multiple pages, separate them with a semicolon (`;`).
   - Use the `ROOT_DIR` variable if you want to save the pages in a specific folder within your repository. If this variable is not set, the pages will be saved in the root folder. _Be cautious: if you specify a folder name that already exists, it will be overwritten._

3. Adjust the frequency of the workflow runs by modifying the `cron` schedule.

4. Commit the changes to your repository.

```yaml
name: Gition

on:
    # Allows manual triggering from the Actions tab
    workflow_dispatch:

    # Schedule to run daily at 11:30 PM (UTC)
    schedule:
        - cron: "30 23 * * *"

jobs:
    build:
        runs-on: ubuntu-latest

        steps:
            # Checks out your repository under $GITHUB_WORKSPACE so the job can access it
            - uses: actions/checkout@v3

            - name: gition
              uses: otaviobertucini/gition@v1.00
              with:
                  NOTION_SECRET: ${{ secrets.NOTION_SECRET }}
                  NOTION_PAGES: 3f52f0203a3e4aedb0931227bb485545
                  ROOT_DIR: Notion Articles

            - name: Save changes
              uses: stefanzweifel/git-auto-commit-action@v4
              with:
                  commit_message: Commit new content from Notion
```

### Conclusion

After completing these steps, your setup will be ready, and the contents of your Notion pages will be exported to GitHub whenever the Action is triggered.

## Notes

- Currently, only text, images, and links have been tested. Other Notion components may not be exported correctly or could potentially cause the workflow to fail.
- "Mention" links in Notion are not accessible via the Notion API and will be ignored. To ensure links are properly exported, use the "Add Link" feature (Ctrl + K) instead. This will label the links according to their titles.
