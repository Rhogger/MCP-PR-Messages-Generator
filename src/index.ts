#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import simpleGit from "simple-git";

// Create server instance
const server = new Server(
  {
    name: "pr-messages-generator",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Initialize Git
const git = simpleGit();

// Schemas for tool arguments
const AnalyzeCommitsSchema = z.object({
  baseBranch: z.string().optional().describe("Base branch to compare against (default: main)"),
  limitCommits: z.number().optional().describe("Maximum number of commits to analyze (default: 10)")
});

const GeneratePRMessageSchema = z.object({
  style: z.enum(["detailed", "simple", "conventional"]).describe("Style of PR message to generate"),
  baseBranch: z.string().optional().describe("Base branch to compare against (default: main)"),
  includeFiles: z.boolean().optional().describe("Include changed files in the message (default: true)")
});

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "analyze_current_branch",
        description: "Analisa os commits da branch atual, mostrando arquivos modificados em cada commit",
        inputSchema: {
          type: "object",
          properties: {
            baseBranch: {
              type: "string",
              description: "Branch base para comparar (padrão: main)"
            },
            limitCommits: {
              type: "number",
              description: "Número máximo de commits para analisar (padrão: 10)"
            }
          }
        }
      },
      {
        name: "generate_pr_message",
        description: "Gera uma mensagem de Pull Request descritiva baseada nos commits da branch atual",
        inputSchema: {
          type: "object",
          properties: {
            style: {
              type: "string",
              enum: ["detailed", "simple", "conventional"],
              description: "Estilo da mensagem de PR"
            },
            baseBranch: {
              type: "string", 
              description: "Branch base para comparar (padrão: main)"
            },
            includeFiles: {
              type: "boolean",
              description: "Incluir arquivos modificados na mensagem (padrão: true)"
            }
          },
          required: ["style"]
        }
      }
    ]
  };
});

// Helper function to analyze current branch commits
async function analyzeCurrentBranch(baseBranch: string = "main", limitCommits: number = 10) {
  try {
    // Get current branch name
    const currentBranch = await git.branch();
    const branchName = currentBranch.current;
    
    if (!branchName) {
      throw new Error("Não foi possível determinar a branch atual");
    }

    // Check if base branch exists
    let actualBaseBranch = baseBranch;
    try {
      await git.show([actualBaseBranch]);
    } catch {
      // Try 'master' if 'main' doesn't exist
      if (baseBranch === "main") {
        try {
          await git.show(["master"]);
          actualBaseBranch = "master";
        } catch {
          // If neither main nor master exist, use first commit
          const allCommits = await git.log({ maxCount: 100 });
          if (allCommits.all.length > 0) {
            actualBaseBranch = allCommits.all[allCommits.all.length - 1].hash;
          }
        }
      }
    }

    // Get commits from current branch that are not in base branch
    let commits;
    try {
      commits = await git.log({
        from: actualBaseBranch,
        to: branchName,
        maxCount: limitCommits
      });
    } catch {
      // Fallback: get recent commits from current branch
      commits = await git.log({ maxCount: limitCommits });
    }

    // Get detailed info for each commit including changed files
    const detailedCommits = [];
    
    for (const commit of commits.all) {
      try {
        // Get files changed in this commit
        const diffSummary = await git.diffSummary([`${commit.hash}~1`, commit.hash]);
        
        detailedCommits.push({
          hash: commit.hash,
          message: commit.message,
          author: commit.author_name,
          date: commit.date,
          files: diffSummary.files.map(file => ({
            file: file.file,
            insertions: file.insertions,
            deletions: file.deletions,
            changes: file.changes
          }))
        });
      } catch (error) {
        // If we can't get diff for a commit, include it without file details
        detailedCommits.push({
          hash: commit.hash,
          message: commit.message,
          author: commit.author_name,
          date: commit.date,
          files: []
        });
      }
    }

    return {
      currentBranch: branchName,
      baseBranch: actualBaseBranch,
      totalCommits: commits.total,
      commits: detailedCommits
    };

  } catch (error) {
    throw new Error(`Erro ao analisar branch: ${error.message}`);
  }
}

// Helper function to generate PR message
async function generatePRMessage(style: string, baseBranch: string = "main", includeFiles: boolean = true) {
  try {
    const analysis = await analyzeCurrentBranch(baseBranch, 20);
    const commits = analysis.commits;
    
    if (commits.length === 0) {
      return "Nenhum commit encontrado na branch atual.";
    }

    // Collect all changed files
    const allFiles = new Set<string>();
    commits.forEach(commit => {
      commit.files.forEach(file => allFiles.add(file.file));
    });

    // Categorize commits
    const features = commits.filter(c => 
      c.message.toLowerCase().includes('feat') || 
      c.message.toLowerCase().includes('add') ||
      c.message.toLowerCase().includes('implement')
    );
    
    const fixes = commits.filter(c => 
      c.message.toLowerCase().includes('fix') || 
      c.message.toLowerCase().includes('bug') ||
      c.message.toLowerCase().includes('resolve')
    );
    
    const improvements = commits.filter(c => 
      c.message.toLowerCase().includes('refactor') || 
      c.message.toLowerCase().includes('improve') ||
      c.message.toLowerCase().includes('update') ||
      c.message.toLowerCase().includes('enhance')
    );

    let prMessage = "";

    switch (style) {
      case "detailed":
        prMessage = generateDetailedMessage(analysis, features, fixes, improvements, allFiles, includeFiles);
        break;
      case "simple":
        prMessage = generateSimpleMessage(analysis, allFiles, includeFiles);
        break;
      case "conventional":
        prMessage = generateConventionalMessage(analysis, features, fixes, improvements, allFiles, includeFiles);
        break;
    }

    return prMessage;

  } catch (error) {
    throw new Error(`Erro ao gerar mensagem de PR: ${error.message}`);
  }
}

function generateDetailedMessage(analysis: any, features: any[], fixes: any[], improvements: any[], allFiles: Set<string>, includeFiles: boolean) {
  const commits = analysis.commits;
  const mainCommit = commits[0];
  
  // Generate title from most significant change
  let title = "";
  if (features.length > 0) {
    title = `feat: ${features[0].message.replace(/^feat:?\s*/i, '').split('\n')[0]}`;
  } else if (fixes.length > 0) {
    title = `fix: ${fixes[0].message.replace(/^fix:?\s*/i, '').split('\n')[0]}`;
  } else {
    title = mainCommit.message.split('\n')[0];
  }

  let message = `${title}\n\n`;
  message += `## 📋 Resumo\n\n`;
  message += `Esta PR contém **${commits.length} commit(s)** que implementam `;
  
  const changes = [];
  if (features.length > 0) changes.push(`${features.length} nova(s) funcionalidade(s)`);
  if (fixes.length > 0) changes.push(`${fixes.length} correção(ões)`);
  if (improvements.length > 0) changes.push(`${improvements.length} melhoria(s)`);
  
  message += changes.length > 0 ? changes.join(', ') : 'diversas alterações';
  message += '.\n\n';

  message += `## 🔄 Alterações Realizadas\n\n`;

  if (features.length > 0) {
    message += `### ✨ Novas Funcionalidades\n`;
    features.forEach(commit => {
      message += `- **${commit.message.split('\n')[0]}**\n`;
      message += `  - Commit: \`${commit.hash.substring(0, 7)}\`\n`;
      if (includeFiles && commit.files.length > 0) {
        message += `  - Arquivos: ${commit.files.map(f => `\`${f.file}\``).join(', ')}\n`;
      }
      message += '\n';
    });
  }

  if (fixes.length > 0) {
    message += `### 🐛 Correções\n`;
    fixes.forEach(commit => {
      message += `- **${commit.message.split('\n')[0]}**\n`;
      message += `  - Commit: \`${commit.hash.substring(0, 7)}\`\n`;
      if (includeFiles && commit.files.length > 0) {
        message += `  - Arquivos: ${commit.files.map(f => `\`${f.file}\``).join(', ')}\n`;
      }
      message += '\n';
    });
  }

  if (improvements.length > 0) {
    message += `### 🚀 Melhorias\n`;
    improvements.forEach(commit => {
      message += `- **${commit.message.split('\n')[0]}**\n`;
      message += `  - Commit: \`${commit.hash.substring(0, 7)}\`\n`;
      if (includeFiles && commit.files.length > 0) {
        message += `  - Arquivos: ${commit.files.map(f => `\`${f.file}\``).join(', ')}\n`;
      }
      message += '\n';
    });
  }

  // Show other commits
  const otherCommits = commits.filter(c => 
    !features.includes(c) && !fixes.includes(c) && !improvements.includes(c)
  );
  
  if (otherCommits.length > 0) {
    message += `### 📝 Outras Alterações\n`;
    otherCommits.forEach(commit => {
      message += `- ${commit.message.split('\n')[0]} (\`${commit.hash.substring(0, 7)}\`)\n`;
    });
    message += '\n';
  }

  if (includeFiles && allFiles.size > 0) {
    message += `## 📁 Arquivos Modificados\n\n`;
    message += `Total de **${allFiles.size} arquivo(s)** modificado(s):\n\n`;
    Array.from(allFiles).sort().forEach(file => {
      message += `- \`${file}\`\n`;
    });
    message += '\n';
  }

  message += `## 🧪 Como Testar\n\n`;
  message += `- [ ] Testes unitários passando\n`;
  message += `- [ ] Testes de integração executados\n`;
  message += `- [ ] Teste manual realizado\n`;

  return message;
}

function generateSimpleMessage(analysis: any, allFiles: Set<string>, includeFiles: boolean) {
  const commits = analysis.commits;
  const mainCommit = commits[0];
  
  let message = `${mainCommit.message.split('\n')[0]}\n\n`;
  
  if (commits.length > 1) {
    message += `## Alterações\n\n`;
    commits.slice(0, 8).forEach(commit => {
      message += `- ${commit.message.split('\n')[0]}\n`;
    });
    
    if (commits.length > 8) {
      message += `- ... e mais ${commits.length - 8} commit(s)\n`;
    }
    message += '\n';
  }

  if (includeFiles && allFiles.size > 0) {
    message += `**${allFiles.size} arquivo(s) modificado(s)**`;
    if (allFiles.size <= 10) {
      message += `: ${Array.from(allFiles).map(f => `\`${f}\``).join(', ')}`;
    }
  }

  return message;
}

function generateConventionalMessage(analysis: any, features: any[], fixes: any[], improvements: any[], allFiles: Set<string>, includeFiles: boolean) {
  const commits = analysis.commits;
  
  // Determine type and scope
  let type = "chore";
  let scope = "";
  
  if (features.length > 0) {
    type = "feat";
  } else if (fixes.length > 0) {
    type = "fix";
  } else if (improvements.length > 0) {
    type = "refactor";
  }

  // Try to extract scope from file paths
  if (allFiles.size > 0) {
    const firstFile = Array.from(allFiles)[0];
    const pathParts = firstFile.split('/');
    if (pathParts.length > 1) {
      scope = pathParts[0];
    }
  }

  const scopeStr = scope ? `(${scope})` : "";
  const mainMessage = commits[0].message.split('\n')[0].replace(/^(feat|fix|refactor|chore):?\s*/i, '');
  
  let message = `${type}${scopeStr}: ${mainMessage}\n\n`;
  
  if (commits.length > 1) {
    message += `### Commits incluídos:\n\n`;
    commits.forEach(commit => {
      message += `- ${commit.message.split('\n')[0]} (${commit.hash.substring(0, 7)})\n`;
    });
    message += '\n';
  }

  if (features.length > 0) {
    message += `### ✨ Features\n`;
    features.forEach(f => message += `- ${f.message.split('\n')[0]}\n`);
    message += '\n';
  }

  if (fixes.length > 0) {
    message += `### 🐛 Bug Fixes\n`;
    fixes.forEach(f => message += `- ${f.message.split('\n')[0]}\n`);
    message += '\n';
  }

  if (includeFiles && allFiles.size > 0) {
    message += `### 📁 Arquivos alterados: ${allFiles.size}\n`;
    if (allFiles.size <= 15) {
      Array.from(allFiles).sort().forEach(file => {
        message += `- ${file}\n`;
      });
    } else {
      Array.from(allFiles).sort().slice(0, 10).forEach(file => {
        message += `- ${file}\n`;
      });
      message += `- ... e mais ${allFiles.size - 10} arquivo(s)\n`;
    }
  }

  return message;
}

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;
    
    switch (name) {
      case "analyze_current_branch": {
        const parsedArgs = AnalyzeCommitsSchema.parse(args || {});
        const result = await analyzeCurrentBranch(parsedArgs.baseBranch, parsedArgs.limitCommits);
        
        let response = `# 🔍 Análise da Branch: \`${result.currentBranch}\`\n\n`;
        response += `**Base:** \`${result.baseBranch}\`\n`;
        response += `**Total de commits:** ${result.totalCommits}\n\n`;
        
        if (result.commits.length === 0) {
          response += "Nenhum commit encontrado nesta branch.\n";
        } else {
          response += `## 📝 Commits Analisados (${result.commits.length}):\n\n`;
          
          result.commits.forEach((commit, index) => {
            response += `### ${index + 1}. ${commit.message.split('\n')[0]}\n`;
            response += `- **Hash:** \`${commit.hash.substring(0, 7)}\`\n`;
            response += `- **Autor:** ${commit.author}\n`;
            response += `- **Data:** ${new Date(commit.date).toLocaleString('pt-BR')}\n`;
            
            if (commit.files.length > 0) {
              response += `- **Arquivos modificados (${commit.files.length}):**\n`;
              commit.files.forEach(file => {
                response += `  - \`${file.file}\` (+${file.insertions}/-${file.deletions})\n`;
              });
            } else {
              response += `- **Arquivos:** Nenhum arquivo detectado\n`;
            }
            response += '\n';
          });
        }
        
        return {
          content: [
            {
              type: "text",
              text: response
            }
          ]
        };
      }
      
      case "generate_pr_message": {
        const parsedArgs = GeneratePRMessageSchema.parse(args);
        const result = await generatePRMessage(
          parsedArgs.style, 
          parsedArgs.baseBranch, 
          parsedArgs.includeFiles ?? true
        );
        
        return {
          content: [
            {
              type: "text",
              text: `# 📝 Mensagem de PR Gerada (${parsedArgs.style})\n\n${result}`
            }
          ]
        };
      }
      
      default:
        throw new Error(`Ferramenta desconhecida: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `❌ Erro: ${error.message}`
        }
      ],
      isError: true
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("🚀 PR Messages Generator MCP Server rodando no stdio");
}

main().catch((error) => {
  console.error("💥 Erro fatal:", error);
  process.exit(1);
});