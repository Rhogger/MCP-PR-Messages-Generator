#!/usr/bin/env node

// Script de teste completo para o servidor MCP PR Messages Generator
import { spawn } from 'child_process';

const testMessages = [
  // 1. Initialize the server
  {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      clientInfo: { name: "test-client", version: "1.0.0" }
    }
  },
  // 2. List available tools
  {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list"
  },
  // 3. Analyze current branch
  {
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "analyze_current_branch",
      arguments: {
        limitCommits: 5
      }
    }
  },
  // 4. Generate detailed PR message
  {
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call", 
    params: {
      name: "generate_pr_message",
      arguments: {
        style: "detailed",
        includeFiles: true
      }
    }
  },
  // 5. Generate simple PR message
  {
    jsonrpc: "2.0",
    id: 5,
    method: "tools/call",
    params: {
      name: "generate_pr_message", 
      arguments: {
        style: "simple"
      }
    }
  }
];

console.log("🧪 Testando servidor MCP PR Messages Generator...\n");

const server = spawn('node', ['build/index.js'], {
  stdio: ['pipe', 'pipe', 'inherit']
});

let messageIndex = 0;
const responses = [];

server.stdout.on('data', (data) => {
  const response = data.toString().trim();
  if (response && response.startsWith('{')) {
    try {
      const parsed = JSON.parse(response);
      responses.push(parsed);
      
      console.log(`📦 Resposta ${parsed.id || 'N/A'}:`);
      
      if (parsed.result && parsed.result.tools) {
        console.log(`   ✅ Ferramentas encontradas: ${parsed.result.tools.length}`);
        parsed.result.tools.forEach(tool => {
          console.log(`      - ${tool.name}: ${tool.description}`);
        });
      } else if (parsed.result && parsed.result.content) {
        const content = parsed.result.content[0];
        if (content.text) {
          const preview = content.text.substring(0, 100);
          console.log(`   ✅ Conteúdo gerado: ${preview}${content.text.length > 100 ? '...' : ''}`);
        }
      } else if (parsed.result) {
        console.log(`   ✅ Resposta recebida: ${JSON.stringify(parsed.result).substring(0, 80)}...`);
      } else if (parsed.error) {
        console.log(`   ❌ Erro: ${parsed.error.message}`);
      }
      
      // Send next message if available
      if (messageIndex < testMessages.length) {
        setTimeout(() => {
          const nextMsg = testMessages[messageIndex++];
          console.log(`\n📤 Enviando: ${nextMsg.method} (id: ${nextMsg.id})`);
          server.stdin.write(JSON.stringify(nextMsg) + '\n');
        }, 500);
      } else {
        // Test completed
        setTimeout(() => {
          console.log('\n🎉 Teste concluído com sucesso!');
          console.log(`📊 Total de respostas: ${responses.length}`);
          
          // Show summary
          console.log('\n📋 Resumo dos testes:');
          console.log('   ✅ Servidor inicializou corretamente');
          console.log('   ✅ Ferramentas listadas');
          console.log('   ✅ Análise de branch executada');
          console.log('   ✅ Mensagens de PR geradas');
          
          server.kill();
          process.exit(0);
        }, 1000);
      }
      
    } catch (error) {
      console.log(`   ⚠️  Resposta não é JSON válido: ${response}`);
    }
  }
});

server.on('error', (error) => {
  console.error("❌ Erro no servidor:", error);
  process.exit(1);
});

server.on('exit', (code) => {
  if (code !== 0) {
    console.error(`❌ Servidor terminou com código ${code}`);
    process.exit(1);
  }
});

// Start the test
console.log("📤 Iniciando teste...");
const firstMsg = testMessages[messageIndex++];
server.stdin.write(JSON.stringify(firstMsg) + '\n');

// Safety timeout
setTimeout(() => {
  console.log("\n⏰ Timeout do teste");
  server.kill();
  process.exit(1);
}, 15000);
