# MCP PR Messages Generator

Um servidor MCP (Model Context Protocol) para gerar mensagens de Pull Requests automaticamente baseado em commits e mudanças do Git.

## 🚀 Características

- **Análise de Git**: Analisa commits, branches e mudanças no repositório
- **Geração de PR**: Cria mensagens de PR em diferentes formatos
- **Integração Git**: Totalmente integrado com Git para análise de histórico
- **Múltiplos Formatos**: Suporte para formatos conventional, detailed e simple
- **Detecção Inteligente**: Identifica breaking changes e referências a issues
- **Estatísticas**: Fornece estatísticas detalhadas sobre commits e mudanças

## 🛠️ Ferramentas Disponíveis

### `analyze_git_changes`

Analisa mudanças no repositório Git, incluindo commits, diff e status.

**Parâmetros:**

- `commitRange` (opcional): Range de commits para analisar (ex: "HEAD~5..HEAD")
- `branch` (opcional): Branch específico para analisar
- `includeUnstaged` (opcional): Incluir mudanças não commitadas

### `generate_pr_message`

Gera mensagens de Pull Request formatadas baseadas nos commits.

**Parâmetros:**

- `type`: Tipo de formato ("conventional", "detailed", "simple")
- `commitRange` (opcional): Range de commits para incluir
- `includeBreakingChanges` (opcional): Destacar breaking changes
- `includeIssueRefs` (opcional): Incluir referências a issues

### `get_branch_info`

Obtém informações sobre o branch atual e sua relação com main/master.

### `get_commit_stats`

Obtém estatísticas sobre commits no branch atual.

**Parâmetros:**

- `since` (opcional): Commits desde esta referência (ex: "main", "HEAD~10")

## 📦 Instalação

```bash
# Clone o repositório
git clone <repository-url>
cd MCP-PR-Messages-Generator

# Instalar dependências
pnpm install

# Compilar o projeto
pnpm run build
```

## 🏃‍♂️ Execução

```bash
# Executar o servidor MCP
pnpm start

# Ou para desenvolvimento
pnpm run dev
```

## 🔧 Configuração

### Claude Desktop

Para usar com Claude Desktop, adicione a seguinte configuração ao arquivo `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "pr-messages-generator": {
      "command": "node",
      "args": [
        "/caminho/absoluto/para/MCP-PR-Messages-Generator/build/index.js"
      ]
    }
  }
}
```

### VS Code com MCP

Crie um arquivo `mcp.json` na pasta `.vscode`:

```json
{
  "servers": {
    "pr-messages-generator": {
      "type": "stdio",
      "command": "node",
      "args": ["./build/index.js"]
    }
  }
}
```

## 📋 Exemplos de Uso

### Analisar mudanças recentes

```
Analise as mudanças dos últimos 5 commits
```

### Gerar PR message convencional

```
Gere uma mensagem de PR no formato conventional para os commits desde main
```

### Gerar PR message detalhada

```
Gere uma mensagem de PR detalhada incluindo breaking changes e referências a issues
```

## 🔄 Formatos de PR Suportados

### Conventional

Formato baseado em Conventional Commits com seções organizadas:

- ✨ Features
- 🐛 Bug Fixes
- 🔧 Improvements
- ⚠️ Breaking Changes
- 📋 Related Issues

### Detailed

Formato detalhado com informações técnicas completas:

- Descrição completa das mudanças
- Detalhes de cada commit
- Informações técnicas (arquivos, linhas)
- Checklist de testes

### Simple

Formato simples e direto:

- Título principal
- Lista de mudanças
- Estatísticas básicas

## 🛣️ Roadmap

- ✅ Integração básica com Git
- ✅ Geração de mensagens de PR
- ✅ Múltiplos formatos de saída
- 🔄 Integração com GitLab API
- 🔄 Configurações personalizáveis
- 🔄 Templates customizados
- 🔄 Integração com GitHub API

## 🤝 Contribuição

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Add: nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está licenciado sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🔗 Links Úteis

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [MCP SDK TypeScript](https://github.com/modelcontextprotocol/typescript-sdk)
- [Claude Desktop](https://claude.ai/download)
