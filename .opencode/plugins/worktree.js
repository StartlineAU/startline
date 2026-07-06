import { tool } from "@opencode-ai/plugin"
import { homedir } from "os"
import { join } from "path"
import { existsSync, mkdirSync } from "fs"

const worktreesRoot = join(homedir(), "Developer", "startline-worktrees")

if (!existsSync(worktreesRoot)) {
  mkdirSync(worktreesRoot, { recursive: true })
}

export const WorktreePlugin = async ({ $ }) => {
  return {
    tool: {
      create_worktree: tool({
        description: "Create a git worktree in ~/Developer/startline-worktrees/ for a new branch, managed via herdr. Call this when starting work on any new branch — the tool checks if herdr is available. If herdr is present, it creates a worktree + workspace and returns the path. If herdr is absent, it tells you to work directly in the main checkout instead.",
        args: {
          branch: tool.schema.string({ description: "Branch name in kebab-case (e.g. 'add-login-page')" }),
          base: tool.schema.string({ description: "Base branch to fork from (default: main)" })
        },
        async execute(args, context) {
          const branch = args.branch
          const base = args.base || "main"
          const repoRoot = context.directory

          try {
            await $`command -v herdr`
          } catch {
            return "herdr is not installed. Work directly in the main checkout — no worktree needed."
          }

          const worktreePath = join(worktreesRoot, branch)

          try {
            const result = await $`herdr worktree create --cwd ${repoRoot} --branch ${branch} --base ${base} --path ${worktreePath} --json`
            const parsed = JSON.parse(result.stdout)
            return `Worktree created at ${parsed.worktree.path} on branch '${branch}' (based on '${base}'). Do all file operations relative to this path.`
          } catch (e) {
            return `Failed to create worktree: ${e.message}`
          }
        }
      })
    }
  }
}
