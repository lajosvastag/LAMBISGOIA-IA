import http from "node:http";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const publicDir = join(root, "public");
function loadDotEnv() {
  try {
    const lines = readFileSync(join(root, ".env"), "utf8").split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
    }
  } catch {
    // .env é opcional: o modo demo continua funcionando sem ele.
  }
}

loadDotEnv();
const port = Number(process.env.PORT || 3000);
const modelCatalog = [
  { id: "lambisgoia-auto", name: "Lambisgoia Auto", provider: "Orquestra", specialty: "Escolhe o melhor modelo para cada tarefa" },
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", specialty: "Raciocínio geral e multimodal" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "Google", specialty: "Contexto longo e leitura de imagens" },
  { id: "grok-3", name: "Grok 3", provider: "xAI", specialty: "Ideias rápidas e linguagem natural" },
  { id: "copilot", name: "Copilot", provider: "Microsoft", specialty: "Produtividade e código" },
  { id: "claude-3.7-sonnet", name: "Claude 3.7 Sonnet", provider: "Anthropic", specialty: "Escrita, análise e síntese" }
];
const providerModelMap = {
  "lambisgoia-auto": "gpt-5-mini",
  "gpt-4o": "gpt-5",
  "gemini-2.5-pro": "gemini-3.1-pro-preview",
  "grok-3": "gpt-5-mini",
  copilot: "gpt-5-mini",
  "claude-3.7-sonnet": "gpt-5.5"
};
const ollamaBase = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
const ollamaTextModel = process.env.OLLAMA_MODEL || "qwen2.5:3b";
const ollamaVisionModel = process.env.OLLAMA_VISION_MODEL || "llava:7b";
const ollamaKeepAlive = process.env.OLLAMA_KEEP_ALIVE || "10m";
const hasRemoteKey = Boolean(process.env.OPENAI_API_KEY) && !process.env.OPENAI_API_KEY.includes("COLE_SUA_CHAVE_API_AQUI");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon"
};

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(payload));
}

const directInstruction = "Responda diretamente ao pedido do usuário. Não diga que entendeu, recebeu, revisou ou analisou a solicitação. Não descreva seu processo interno, não repita a pergunta e não inclua avisos genéricos. Entregue apenas a resposta útil, em português do Brasil, com objetividade e detalhes suficientes. Se faltar informação, faça uma pergunta curta e específica.";

async function askOllama(body) {
  const hasImage = Array.isArray(body.attachments) && body.attachments.length > 0;
  const model = hasImage ? ollamaVisionModel : ollamaTextModel;
  const messages = [{ role: "system", content: directInstruction }, ...(body.messages || []).map((message) => ({ role: message.role, content: message.content }))];
  if (hasImage) {
    const last = messages[messages.length - 1];
    last.content = `${last.content || "Descreva a imagem."}\nListe objetivamente os elementos visíveis, cores, formas e qualquer texto. Não diga que não pode descrever a imagem.`;
    last.images = body.attachments.map((image) => image.dataUrl.replace(/^data:[^;]+;base64,/, ""));
  }
  const response = await fetch(`${ollamaBase}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, stream: false, keep_alive: ollamaKeepAlive, options: { temperature: 0.7, num_predict: hasImage ? 180 : 512 } }),
    signal: AbortSignal.timeout(90000)
  });
  if (!response.ok) throw new Error(`Ollama respondeu HTTP ${response.status}`);
  const data = await response.json();
  const answer = data.message?.content?.trim();
  if (!answer) throw new Error("Ollama não retornou conteúdo");
  return { id: `ollama-${Date.now()}`, model, provider: "Ollama local", demo: false, content: answer };
}

function demoReply(body) {
  const model = modelCatalog.find((item) => item.id === body.model) || modelCatalog[0];
  const last = body.messages?.at(-1);
  const text = typeof last?.content === "string" ? last.content : "uma mensagem multimodal";
  const normalized = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const hasImage = Array.isArray(body.attachments) && body.attachments.length > 0;
  let content;

  if (hasImage || /imagem|foto|figura|print|captura|cena|visual/.test(normalized)) {
    content = `Não consigo interpretar o conteúdo visual desta imagem no modo local. A análise de pixels precisa de um provedor multimodal configurado no arquivo .env.`;
  } else if (/oi|ola|olá|bom dia|boa tarde|boa noite|tudo bem/.test(normalized)) {
    content = `Olá. Posso criar textos, organizar planos, comparar modelos, analisar código e trabalhar com imagens quando a visão multimodal estiver configurada. O que você precisa?`;
  } else if (/compare|comparar|diferenca|diferença|melhor modelo|gpt|gemini|grok|copilot/.test(normalized)) {
    content = `Para escolher um modelo, eu separaria assim:\n\n• GPT: bom equilíbrio entre raciocínio, escrita e multimodalidade.\n• Gemini: contexto longo e leitura de documentos/imagens.\n• Grok: ideação rápida e tom mais informal.\n• Copilot: código e produtividade dentro do ecossistema Microsoft.\n\nPara a sua tarefa, eu recomendaria começar pelo Lambisgoia Auto e trocar de modelo apenas quando o trabalho exigir uma especialidade específica.`;
  } else if (/resum|sintet|pontos principais|em topicos|em tópicos/.test(normalized)) {
    content = `Posso resumir isso em três camadas:\n\n1. **Essencial:** a ideia central em uma frase.\n2. **Decisões:** os fatos e escolhas que realmente importam.\n3. **Próximos passos:** o que fazer a seguir.\n\nCole o texto completo ou envie o arquivo e eu aplico essa estrutura ao conteúdo.`;
  } else if (/plano|estrateg|estratég|campanha|projeto|cronograma|acao|ação/.test(normalized)) {
    content = `Vamos transformar isso em um plano prático:\n\n1. Definir o resultado desejado e o público.\n2. Separar a tarefa em entregas pequenas.\n3. Escolher uma métrica para acompanhar o progresso.\n4. Executar uma primeira versão hoje.\n5. Revisar com base no que funcionou.\n\nSe você me disser prazo, público e objetivo, eu devolvo um plano específico com prioridades.`;
  } else if (/copy|anuncio|anúncio|produto|venda|marketing|descricao|descrição/.test(normalized)) {
    content = `Para criar uma boa copy, eu usaria esta sequência:\n\n**Promessa:** o benefício mais desejado.\n**Prova:** por que o cliente deve acreditar.\n**Detalhes:** como o produto entrega o benefício.\n**Ação:** um próximo passo claro.\n\nEnvie nome do produto, público e diferencial que eu monto título, descrição curta e CTA.`;
  } else if (/codigo|código|javascript|python|bug|erro|site|program/.test(normalized)) {
    content = `Posso ajudar com isso de forma objetiva. Vou separar o problema em: contexto, comportamento esperado, erro atual e solução mínima.\n\nCole o trecho de código ou a mensagem de erro, junto com o resultado que você esperava, e eu proponho a correção com explicação.`;
  } else if (/poema|poesia|versos|soneto|rima/.test(normalized)) {
    const subject = text.replace(/^(faça|faca|escreva|crie|produza|me dê|me de)?\s*(um|uma)?\s*(poema|poesia|versos|soneto)?\s*(sobre|de|para)?\s*/i, "").trim() || "batatas";
    content = `**${subject.charAt(0).toUpperCase() + subject.slice(1)}**\n\nNo campo dourado, sob o sol,\nnasce um tesouro em silêncio,\nredondo segredo do solo,\nfeito de fome e encantamento.\n\nDourada na panela quente,\nmacia no centro, crocante por fora,\n${subject} segue, simplesmente,\na pequena alegria de toda hora.`;
  } else if (/traduz|traduza|tradução|translation/.test(normalized)) {
    content = `Envie o texto e diga para qual idioma devo traduzir. Também posso adaptar o tom: literal, natural, profissional, informal ou publicitário.`;
  } else if (/receita|cozinhe|cozinhar|ingrediente|prato/.test(normalized)) {
    content = `Posso montar a receita. Diga quais ingredientes você tem, para quantas pessoas e se existe alguma restrição alimentar. Com isso, eu organizo quantidades, preparo e tempo.`;
  } else if (/lista|ideias|sugest|sugestão|sugestoes|opcoes|opções/.test(normalized)) {
    content = `Aqui estão alguns caminhos para começar:\n\n1. Uma opção simples e rápida.\n2. Uma opção criativa e diferente.\n3. Uma opção econômica.\n4. Uma opção mais completa e ambiciosa.\n\nDiga o tema, o público e a quantidade de ideias que eu desenvolvo as melhores opções.`;
  } else if (/explique|explica|o que é|o que e|como funciona|defina|definição/.test(normalized)) {
    const subject = text.replace(/^(explique|explica|defina|o que é|o que e|como funciona)\s*/i, "").trim() || "esse assunto";
    content = `**${subject.charAt(0).toUpperCase() + subject.slice(1)}** é um tema que pode ser entendido por três partes: o conceito central, como ele funciona na prática e onde costuma ser aplicado.\n\nSe você quiser, posso explicar em linguagem simples, com exemplo, de forma técnica ou em um resumo de uma frase.`;
  } else {
    content = `Posso trabalhar nesse pedido. Escreva o resultado que você quer — texto, ideia, plano, explicação, código, comparação ou criação — e eu responderei diretamente nesse formato.`;
  }
  return {
    id: `demo-${Date.now()}`,
    model: model.name,
    provider: model.provider,
    demo: true,
    content
  };
}

async function handleChat(req, res) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  let body;
  try { body = JSON.parse(raw || "{}"); } catch { return sendJson(res, 400, { error: "JSON inválido" }); }

  if (hasRemoteKey && process.env.DISABLE_REMOTE_AI !== "true") {
    const base = (process.env.OPENAI_API_BASE || "https://api.openai.com/v1").replace(/\/$/, "");
    const selectedModel = body.model || "lambisgoia-auto";
    const requestModel = selectedModel === "lambisgoia-auto"
      ? (process.env.OPENAI_MODEL || providerModelMap["lambisgoia-auto"])
      : (providerModelMap[selectedModel] || selectedModel);
    const messages = [
      { role: "system", content: "Responda diretamente ao pedido do usuário. Não diga que entendeu, recebeu, revisou ou analisou a solicitação. Não descreva seu processo interno, não repita a pergunta e não inclua avisos genéricos. Entregue apenas a resposta útil, em português do Brasil, com objetividade e detalhes suficientes. Se faltar informação, faça uma pergunta curta e específica." },
      ...(body.messages || []).map((message) => ({ role: message.role, content: message.content }))
    ];
    if (Array.isArray(body.attachments) && body.attachments.length && messages.length) {
      const last = messages[messages.length - 1];
      const text = typeof last.content === "string" ? last.content : "Analise as imagens anexadas.";
      last.content = [{ type: "text", text }, ...body.attachments.map((image) => ({ type: "image_url", image_url: { url: image.dataUrl } }))];
    }
    try {
      const response = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model: requestModel, messages, temperature: 0.7 })
      });
      const data = await response.json();
      if (!response.ok || data.error) return sendJson(res, response.status >= 400 ? response.status : 502, { error: data.error?.message || "Falha no provedor de IA" });
      const answer = data.choices?.[0]?.message?.content;
      if (!answer) return sendJson(res, 502, { error: "O provedor não retornou conteúdo." });
      return sendJson(res, 200, { id: data.id, model: data.model, provider: "OpenAI-compatible", demo: false, content: answer.replace(/^(entendi|certo|claro,?\s*)[.:!]?\s*/i, "") });
    } catch (error) {
      return sendJson(res, 502, { error: `Não foi possível conectar ao provedor: ${error.message}` });
    }
  }
  try {
    return sendJson(res, 200, await askOllama(body));
  } catch {
    // Sem Ollama instalado, o fallback local continua disponível.
  }
  return sendJson(res, 200, demoReply(body));
}

async function serveStatic(req, res, pathname) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const file = normalize(join(publicDir, requested));
  if (!file.startsWith(publicDir)) return sendJson(res, 403, { error: "Acesso negado" });
  try {
    const stat = await readFile(file);
    res.writeHead(200, { "Content-Type": mimeTypes[extname(file)] || "application/octet-stream" });
    res.end(stat);
  } catch {
    if (!extname(pathname)) {
      const fallback = await readFile(join(publicDir, "index.html"));
      res.writeHead(200, { "Content-Type": mimeTypes[".html"] });
      return res.end(fallback);
    }
    res.writeHead(404);
    res.end("Not found");
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (req.method === "GET" && url.pathname === "/api/health") return sendJson(res, 200, { ok: true, name: "Lambisgoia", mode: hasRemoteKey ? "provider" : "ollama-or-demo" });
  if (req.method === "GET" && url.pathname === "/api/models") return sendJson(res, 200, { models: modelCatalog });
  if (req.method === "POST" && url.pathname === "/api/chat") return handleChat(req, res);
  if (req.method === "GET") return serveStatic(req, res, url.pathname);
  return sendJson(res, 405, { error: "Método não suportado" });
});

server.listen(port, "0.0.0.0", () => console.log(`Lambisgoia ouvindo em http://0.0.0.0:${port}`));
