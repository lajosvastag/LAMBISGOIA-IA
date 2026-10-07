#!/usr/bin/env bash
set -euo pipefail

# Instala o Ollama e um modelo pequeno para texto. Não exige chave de API.
# Para leitura de imagens, use o modelo de visão opcional indicado no final.
if ! command -v ollama >/dev/null 2>&1; then
  curl -fsSL https://ollama.com/install.sh | sh
fi

if ! curl -fsS http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
  nohup ollama serve >/tmp/lambisgoia-ollama.log 2>&1 &
  sleep 3
fi

ollama pull qwen2.5:3b
ollama pull llava:7b
printf '\nIA local de texto instalada.\n'
printf 'IA local de visão instalada.\n'
printf 'Depois execute: npm start\n'
