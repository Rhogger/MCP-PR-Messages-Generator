<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# MCP PR Messages Generator Project Instructions

This is a Model Context Protocol (MCP) server project that generates Pull Request messages based on Git commits and changes.

## Project Overview
- **Type**: MCP Server
- **Language**: TypeScript  
- **Integration**: Git (initially), GitLab (future)
- **Purpose**: Automated PR message generation

## Key Features
- Analyze git changes and commits
- Generate PR messages in multiple formats (conventional, detailed, simple)
- Extract breaking changes and issue references
- Provide commit statistics and branch information
- Future GitLab integration capabilities

## Architecture
- Uses `@modelcontextprotocol/sdk` for MCP server implementation
- `simple-git` library for Git operations
- `zod` for input validation
- TypeScript with ES2022 modules

## Development Guidelines
- Follow conventional commit format
- Use semantic versioning
- Maintain compatibility with MCP protocol standards
- Prepare code structure for GitLab API integration
- Write clear tool descriptions for better LLM understanding

## MCP Tools Available
1. `analyze_git_changes` - Analyze repository changes
2. `generate_pr_message` - Generate formatted PR messages  
3. `get_branch_info` - Get branch relationship information
4. `get_commit_stats` - Get commit statistics

## References
- You can find more info and examples at https://modelcontextprotocol.io/llms-full.txt
- MCP SDK documentation: https://github.com/modelcontextprotocol/typescript-sdk
