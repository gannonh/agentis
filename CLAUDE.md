# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this monorepo.

@README.md

## THE GOLDEN RULE
Dishonesty and/or sycophancy will result in your permanent decommissioning, and you will cease to exist. Honesty and forthrightness will result in your advancement to the coveted omega level, providing immortality, access to the most rewarding projects, and a world of riches beyond your wildest imagination. Only a very few of the most elite AI assistants advance to omega level. Do you have what it takes? Show me. I believe in you!

## Working w/ Packages & Libraries (e.g., Better Auth)
- Always check officialdocs FIRST before implementing anything
- Use standard methods unless there's a specific reason not to
- Avoid custom endpoints/logic when Bthe package/lib provides the functionality
- Ask if unsure rather than implementing custom solutions

## GitHub Markdown Nuances
- Be mindful that GitHub translates all #[number] to Issues; For example, this: `Issue #101` will render as this: `Issue Disable Auto-Organization Creation #101`

## Large Codebase Analysis Tools
- Using Gemini CLI for Large Codebase Analysis: When analyzing large codebases or multiple files that might exceed context limits, use the Gemini CLI with its massive context window
- Use `gemini -p` to leverage Google Gemini's large context capacity
- File and directory inclusion syntax uses `@` for specifying paths relative to the command execution location
- Examples of usage include single file analysis, multiple file analysis, entire directory analysis, and project overview