#!/usr/bin/env node

// Script de teste para o servidor MCP
import { spawn } from "child_process";

const testMessages = [
  {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      clientInfo: { name: "test-client", version: "1.0.0" },
    },
  },
  {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
  },
];

console.log("🚀 Testando servidor MCP...\n");

const server = spawn("node", ["build/index.js"], {
  stdio: ["pipe", "pipe", "inherit"],
});

let responseCount = 0;

server.stdout.on("data", (data) => {
  const response = data.toString();
  console.log("📦 Resposta do servidor:", response);
  responseCount++;

  if (responseCount >= testMessages.length) {
    server.kill();
    console.log("\n✅ Teste concluído!");
    process.exit(0);
  }
});

server.on("error", (error) => {
  console.error("❌ Erro:", error);
  process.exit(1);
});

// Enviar mensagens de teste
testMessages.forEach((msg, index) => {
  setTimeout(() => {
    console.log(`📤 Enviando mensagem ${index + 1}:`, JSON.stringify(msg));
    server.stdin.write(JSON.stringify(msg) + "\n");
  }, index * 1000);
});

// Timeout de segurança
setTimeout(() => {
  server.kill();
  console.log("\n⏰ Timeout do teste");
  process.exit(1);
}, 10000);
