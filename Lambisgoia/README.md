# Lambisgoia

**Um agente só para pensar com todas as IAs.** Este projeto é um protótipo responsivo, inspirado na organização de um chat moderno, com seletor de GPT, Gemini, Grok, Copilot, Claude e modo automático.

## Executar no VS Code

1. Instale o Node.js 18 ou superior.
2. Abra esta pasta no VS Code.
3. Rode `npm start` no terminal.
4. Acesse `http://localhost:3000`.

O projeto não exige `npm install`: o servidor usa apenas módulos nativos do Node, incluindo `fetch` para conversar com APIs compatíveis. A única configuração necessária para respostas reais é uma chave do provedor no `.env`.

## Funcionar sem chave de API

Para usar um modelo local, instale o Ollama e os modelos executando `bash setup-local-ai.sh`. Depois rode `npm start`. O servidor tenta o Ollama automaticamente quando não encontra `OPENAI_API_KEY`. O instalador baixa `qwen2.5:3b` para texto e `llava:7b` para leitura de imagens; os modelos ocupam vários GB. O servidor mantém o modelo aquecido por 10 minutos e limita respostas de visão para evitar travamentos ao alternar entre modelos. Sem Ollama e sem uma API externa, o site usa o fallback local limitado.

## O que já funciona

- Sidebar com histórico, busca, nova conversa, exclusão e persistência local.
- Chat com respostas locais contextuais, estado de digitação, copiar, editar, regenerar e feedback. O agente foi configurado para responder diretamente, sem começar com “entendi”, “certo”, “recebi” ou comentários sobre o próprio processo. O fallback local inclui pedidos de poemas, traduções, receitas, listas, explicações, ideias, código e planos.
- Seletor de modelos com GPT-4o, Gemini 2.5 Pro, Grok 3, Copilot, Claude 3.7 Sonnet e Lambisgoia Auto.
- Tema claro/escuro, configurações e exportação das conversas em JSON.
- Leitura de imagem por upload, arrastar/soltar e colar: a imagem aparece na conversa com prévia, nome, tamanho e dimensões.
- Endpoint `POST /api/chat` pronto para respostas demo ou para um provedor OpenAI-compatible.

## Conectar uma API multimodal real

Copie `.env.example` para `.env`, preencha `OPENAI_API_KEY` e, se necessário, altere `OPENAI_API_BASE` e `OPENAI_MODEL`. O servidor carrega esse arquivo automaticamente ao iniciar com `npm start` e encaminha mensagens e imagens em `image_url` para o endpoint compatível. Nesta sessão, os modelos reais disponíveis são `gpt-5-nano`, `gpt-5-mini`, `gpt-5`, `gpt-5.5`, `gemini-3-flash-preview` e `gemini-3.1-pro-preview`; a interface já faz o mapeamento dos nomes GPT/Gemini/Grok/Copilot/Claude para eles. Nunca coloque sua chave dentro de `public/` ou no frontend.

A troca de Gemini, Grok, Copilot ou outro provedor pode ser feita criando adaptadores no `server.js` — a interface e o formato de anexos já estão preparados. O seletor já envia o modelo escolhido ao endpoint OpenAI-compatible. Imagens com até 8 MB são aceitas para evitar estourar a quota de armazenamento local do navegador.

## Estrutura

- `server.js`: servidor estático e API de chat.
- `public/index.html`: shell da aplicação.
- `public/styles.css`: sistema visual e responsividade.
- `public/app.js`: estado, interações, histórico e imagens.
- `plan.md`: decisões de produto e direção visual.
- `TODO.md`: entregas do escopo.
