# Contributing to Claude Code GCP Plugin

Thanks for contributing. Here's how to add skills, agents, templates, and hooks.

## How to Contribute

### Adding a New Skill

1. Create a directory under `skills/<service-name>/`
2. Write a `SKILL.md` following the frontmatter format (see existing skills for examples)
3. Add reference files under `skills/<service-name>/references/` for detailed guides
4. Keep `SKILL.md` under 200 lines — push detail into references
5. Update `.claude-plugin/plugin.json` to register the skill

### Adding a New Agent

1. Create `agents/<agent-name>.md`
2. Define the trigger phrases, orchestration flow, and expected outputs
3. Reference the skills the agent depends on
4. Update `.claude-plugin/plugin.json`

### Adding a Template

1. Create a directory under `templates/<template-name>/`
2. Include all files needed for a working deployment (Dockerfile, config, source code)
3. Add a `README.md` inside the template directory with setup instructions

### Adding a Hook

1. Create `hooks/<hook-name>.sh`
2. Make it executable and POSIX-compatible
3. Include clear error messages and exit codes
4. Update `.claude-plugin/plugin.json`

## Guidelines

- **Be opinionated.** This plugin is GCP-deep, not multi-cloud. Recommend the best GCP-native approach.
- **Be production-ready.** Every command, config, and template should be safe to run in production.
- **Security first.** Never generate commands that use default service accounts, overly permissive IAM roles, or skip authentication.
- **Test your changes.** Deploy templates to a real GCP project. Invoke skills with representative prompts.

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/cloud-sql-skill`)
3. Make your changes following the conventions above
4. Submit a PR with a clear description of what you added and why

## Reporting Issues

Open an issue on GitHub with:
- What you were trying to do
- What happened instead
- Your `gcloud` version and Claude Code version
