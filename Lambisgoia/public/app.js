const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const defaultConversations = [
  { id: "welcome", title: "Ideias para a campanha de verão", messages: [] },
  { id: "vision", title: "Lendo uma foto de produto", messages: [] },
  { id: "models", title: "GPT ou Gemini para e-commerce?", messages: [] },
  { id: "copy", title: "Copy para página de produto", messages: [] },
  { id: "strategy", title: "Estratégia de conteúdo Q4", messages: [] }
];
const models = [
  { id: "lambisgoia-auto", name: "Lambisgoia Auto", provider: "Orquestra", specialty: "Escolhe o melhor modelo para cada tarefa", glyph: "✦" },
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", specialty: "Raciocínio geral e multimodal", glyph: "◉" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "Google", specialty: "Contexto longo e leitura de imagens", glyph: "✧" },
  { id: "grok-3", name: "Grok 3", provider: "xAI", specialty: "Ideias rápidas e linguagem natural", glyph: "𝕏" },
  { id: "copilot", name: "Copilot", provider: "Microsoft", specialty: "Produtividade e código", glyph: "◫" },
  { id: "claude-3.7-sonnet", name: "Claude 3.7 Sonnet", provider: "Anthropic", specialty: "Escrita, análise e síntese", glyph: "◌" }
];

const state = {
  conversations: JSON.parse(localStorage.getItem("lambisgoia-conversations") || "null") || defaultConversations,
  activeConversationId: localStorage.getItem("lambisgoia-active") || "welcome",
  activeModel: localStorage.getItem("lambisgoia-model") || "lambisgoia-auto",
  pendingAttachments: [],
  editingMessageId: null,
  isTyping: false,
  settingsTab: "general"
};

const saveState = () => {
  localStorage.setItem("lambisgoia-conversations", JSON.stringify(state.conversations));
  localStorage.setItem("lambisgoia-active", state.activeConversationId);
  localStorage.setItem("lambisgoia-model", state.activeModel);
};
const activeConversation = () => state.conversations.find((chat) => chat.id === state.activeConversationId) || state.conversations[0];
const activeModel = () => models.find((model) => model.id === state.activeModel) || models[0];
const escapeHtml = (value = "") => value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
const formatBytes = (bytes) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

function renderConversations(filter = "") {
  const list = $("#conversationList");
  const chats = state.conversations.filter((chat) => chat.title.toLowerCase().includes(filter.toLowerCase()));
  list.innerHTML = chats.length ? `<div class="conversation-group-label">Hoje</div>${chats.map((chat) => `<div class="conversation-item ${chat.id === state.activeConversationId ? "active" : ""}" data-chat-id="${chat.id}"><span class="conversation-icon">${chat.id === "vision" ? "▧" : "◦"}</span><span class="conversation-title">${escapeHtml(chat.title)}</span><button class="delete-chat" data-delete-chat="${chat.id}" aria-label="Excluir conversa">×</button></div>`).join("")}` : `<div class="conversation-group-label">Nenhum resultado</div>`;
  $$("[data-chat-id]", list).forEach((item) => item.addEventListener("click", (event) => {
    if (event.target.closest("[data-delete-chat]")) return;
    state.activeConversationId = item.dataset.chatId;
    saveState(); renderConversations(); renderMessages(); closeSidebarOnMobile();
  }));
  $$('[data-delete-chat]', list).forEach((button) => button.addEventListener("click", (event) => {
    event.stopPropagation(); state.conversations = state.conversations.filter((chat) => chat.id !== button.dataset.deleteChat);
    if (!state.conversations.length) state.conversations.push({ id: crypto.randomUUID(), title: "Nova conversa", messages: [] });
    if (!state.conversations.some((chat) => chat.id === state.activeConversationId)) state.activeConversationId = state.conversations[0].id;
    saveState(); renderConversations(); renderMessages(); showToast("Conversa removida");
  }));
}

function renderModels() {
  $("#modelOptions").innerHTML = models.map((model) => `<button class="model-option ${model.id === state.activeModel ? "selected" : ""}" data-model-id="${model.id}"><span class="option-orb">${model.glyph}</span><span class="model-option-copy"><strong>${model.name}</strong><small>${model.provider} · ${model.specialty}</small></span><span class="check">✓</span></button>`).join("");
  $("#activeModelName").textContent = activeModel().name;
  $$('[data-model-id]').forEach((button) => button.addEventListener("click", () => {
    state.activeModel = button.dataset.modelId; saveState(); renderModels(); toggleModelPopover(false); showToast(`${activeModel().name} selecionado`);
  }));
}

function messageHtml(message) {
  const isUser = message.role === "user";
  const modelLabel = isUser ? "Você" : `${escapeHtml(message.model || activeModel().name)} · ${escapeHtml(message.provider || activeModel().provider)}`;
  const images = message.attachments?.length ? `<div class="message-image-grid">${message.attachments.map((attachment) => `<img class="message-image" src="${attachment.dataUrl}" alt="${escapeHtml(attachment.name)}" />`).join("")}</div>` : "";
  const actions = isUser ? `<button class="message-action" data-action="edit-message" data-message-id="${message.id}">Editar</button>` : `<button class="message-action" data-action="copy-message" data-message-id="${message.id}">Copiar</button><button class="message-action" data-action="regenerate" data-message-id="${message.id}">↻ Regenerar</button><button class="message-action" data-action="feedback" data-toast="Obrigado pelo feedback.">♡</button>`;
  return `<article class="message-row ${isUser ? "user" : "assistant"}" data-message-id="${message.id}"><div class="message-avatar">${isUser ? "LS" : "L"}</div><div class="message-content"><div class="message-meta"><span>${modelLabel}</span><span>•</span><span>${message.time || "agora"}</span></div><div class="message-bubble">${images}${escapeHtml(message.content || "")}</div><div class="message-actions">${actions}</div></div></article>`;
}

function renderMessages() {
  const chat = activeConversation();
  const hasMessages = chat.messages?.length > 0;
  $("#welcomeView").hidden = hasMessages;
  $("#messagesView").hidden = !hasMessages;
  $("#messagesView").innerHTML = hasMessages ? chat.messages.map(messageHtml).join("") : "";
  bindMessageActions();
  $("#chatStage").scrollTop = $("#chatStage").scrollHeight;
}

function bindMessageActions() {
  $$('[data-action="copy-message"]').forEach((button) => button.addEventListener("click", async () => {
    const message = activeConversation().messages.find((item) => item.id === button.dataset.messageId);
    await navigator.clipboard?.writeText(message?.content || ""); showToast("Resposta copiada");
  }));
  $$('[data-action="feedback"], [data-action="show-toast"]').forEach((button) => button.addEventListener("click", () => showToast(button.dataset.toast || "Feedback registrado")));
  $$('[data-action="regenerate"]').forEach((button) => button.addEventListener("click", () => {
    const chat = activeConversation(); const index = chat.messages.findIndex((item) => item.id === button.dataset.messageId);
    if (index > -1) {
      const contextMessage = [...chat.messages.slice(0, index)].reverse().find((item) => item.role === "user" && item.attachments?.length);
      chat.messages.splice(index, 1); state.pendingAttachments = contextMessage?.attachments || []; saveState(); renderMessages(); renderAttachments(); sendToAgent(true);
    }
  }));
  $$('[data-action="edit-message"]').forEach((button) => button.addEventListener("click", () => {
    const message = activeConversation().messages.find((item) => item.id === button.dataset.messageId);
    if (message) { state.editingMessageId = message.id; $("#messageInput").value = message.content; $("#messageInput").focus(); $("#messageInput").dispatchEvent(new Event("input")); showToast("Mensagem pronta para editar"); }
  }));
}

function createConversation() {
  const newChat = { id: crypto.randomUUID(), title: "Nova conversa", messages: [] };
  state.conversations.unshift(newChat); state.activeConversationId = newChat.id; state.pendingAttachments = []; saveState(); renderConversations(); renderMessages(); renderAttachments(); $("#messageInput").focus(); closeSidebarOnMobile();
}

function addMessage(role, content, extra = {}) {
  const chat = activeConversation();
  chat.messages.push({ id: crypto.randomUUID(), role, content, time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }), ...extra });
  if (role === "user" && chat.title === "Nova conversa") chat.title = content.slice(0, 38) || "Conversa com imagem";
  saveState();
}

async function sendToAgent(regenerate = false) {
  if (state.isTyping) return;
  const input = $("#messageInput"); const text = input.value.trim();
  if (!text && !state.pendingAttachments.length && !regenerate) return;
  const attachments = [...state.pendingAttachments];
  if (!regenerate) {
    const content = text || "Analise as imagens anexadas.";
    const edited = state.editingMessageId && activeConversation().messages.find((message) => message.id === state.editingMessageId);
    if (edited) { edited.content = content; edited.attachments = attachments.length ? attachments : (edited.attachments || []); edited.time = "agora"; state.editingMessageId = null; saveState(); }
    else addMessage("user", content, { attachments });
    input.value = ""; state.pendingAttachments = []; renderAttachments(); renderConversations(); renderMessages();
  }
  if (regenerate) { state.pendingAttachments = []; renderAttachments(); }
  state.isTyping = true; renderTyping(true);
  try {
    const payload = { model: state.activeModel, messages: activeConversation().messages.map(({ role, content }) => ({ role, content })), attachments };
    const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Falha ao falar com o agente");
    await new Promise((resolve) => setTimeout(resolve, 550));
    addMessage("assistant", data.content, { model: data.model || activeModel().name, provider: data.provider || activeModel().provider });
  } catch (error) {
    addMessage("assistant", `Não consegui concluir agora. ${error.message}`, { model: "Lambisgoia", provider: "sistema" });
  } finally { state.isTyping = false; renderTyping(false); renderMessages(); }
}

function renderTyping(show) {
  const view = $("#messagesView");
  if (!show) { $("#typingRow")?.remove(); return; }
  $("#welcomeView").hidden = true; view.hidden = false;
  view.insertAdjacentHTML("beforeend", `<article class="message-row assistant" id="typingRow"><div class="message-avatar">L</div><div class="message-content"><div class="message-meta"><span>Lambisgoia está pensando</span></div><div class="typing"><i></i><i></i><i></i></div></div></article>`);
  view.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "end" });
}

function renderAttachments() {
  const strip = $("#attachmentStrip");
  strip.hidden = !state.pendingAttachments.length;
  strip.innerHTML = state.pendingAttachments.map((attachment, index) => `<div class="attachment-card"><img src="${attachment.dataUrl}" alt="${escapeHtml(attachment.name)}" /><span class="attachment-info">${escapeHtml(attachment.name)} · ${formatBytes(attachment.size)} · ${attachment.width}×${attachment.height}</span><button type="button" data-remove-attachment="${index}" aria-label="Remover imagem">×</button></div>`).join("");
  $$('[data-remove-attachment]').forEach((button) => button.addEventListener("click", () => { state.pendingAttachments.splice(Number(button.dataset.removeAttachment), 1); renderAttachments(); }));
}

function readImages(files) {
  [...files].filter((file) => file.type.startsWith("image/")).forEach((file) => {
    if (file.size > 8 * 1024 * 1024) { showToast(`${file.name} excede o limite de 8 MB`); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image(); image.onload = () => { state.pendingAttachments.push({ name: file.name, size: file.size, type: file.type, width: image.naturalWidth, height: image.naturalHeight, dataUrl: reader.result }); renderAttachments(); showToast(`${file.name} pronta para leitura`); }; image.src = reader.result;
    }; reader.readAsDataURL(file);
  });
}

function toggleModelPopover(force) { const popover = $("#modelPopover"); popover.hidden = typeof force === "boolean" ? !force : !popover.hidden; $(".model-select").setAttribute("aria-expanded", String(!popover.hidden)); }
function showToast(text) { const toast = $("#toast"); toast.textContent = text; toast.classList.add("show"); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove("show"), 2400); }
function closeSidebarOnMobile() { $("#sidebar").classList.remove("open"); }
function openModal() { $("#modalBackdrop").hidden = false; $("#settingsModal").hidden = false; renderSettings(); }
function closeModal() { $("#modalBackdrop").hidden = true; $("#settingsModal").hidden = true; }
function renderSettings() {
  const content = $("#settingsContent");
  const sections = {
    general: `<div class="setting-section"><div class="setting-row"><div><strong>Modelo padrão</strong><small>O cérebro usado ao abrir uma conversa nova.</small></div><button class="setting-button" data-action="toggle-models">${activeModel().name}⌄</button></div><div class="setting-row"><div><strong>Resposta rápida</strong><small>Prioriza respostas mais curtas e diretas.</small></div><button class="toggle active"><span></span></button></div><div class="setting-row"><div><strong>Idioma da interface</strong><small>Português (Brasil)</small></div><button class="setting-button">Português⌄</button></div></div>`,
    appearance: `<div class="setting-section"><div class="setting-row"><div><strong>Tema</strong><small>Alterne entre o modo escuro e claro.</small></div><button class="setting-button" data-action="toggle-theme">${document.body.classList.contains("light") ? "Claro" : "Escuro"}</button></div><div class="setting-row"><div><strong>Animações</strong><small>Movimentos sutis para indicar estados e transições.</small></div><button class="toggle active"><span></span></button></div></div>`,
    data: `<div class="setting-section"><div class="setting-row"><div><strong>Exportar conversas</strong><small>Baixe seu histórico local em um arquivo JSON portátil.</small></div><button class="setting-button" data-action="export-data">Baixar JSON</button></div><div class="setting-row"><div><strong>Privacidade</strong><small>Sem chave configurada, as mensagens ficam no navegador e o servidor retorna respostas demonstrativas.</small></div><span class="status-dot"></span></div><div class="setting-row"><div><strong>Limpar tudo</strong><small>Apaga conversas e preferências deste navegador.</small></div><button class="setting-button" data-action="clear-all">Limpar</button></div></div>`
  };
  content.innerHTML = sections[state.settingsTab];
  $$(".settings-tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === state.settingsTab));
  $$('[data-action="toggle-theme"]', content).forEach((button) => button.addEventListener("click", toggleTheme));
  $$('[data-action="toggle-models"]', content).forEach((button) => button.addEventListener("click", () => { closeModal(); toggleModelPopover(true); }));
  $$('[data-action="export-data"]', content).forEach((button) => button.addEventListener("click", exportData));
  $$('[data-action="clear-all"]', content).forEach((button) => button.addEventListener("click", () => { localStorage.clear(); location.reload(); }));
  $$(".toggle", content).forEach((button) => button.addEventListener("click", () => { button.classList.toggle("active"); showToast(button.classList.contains("active") ? "Opção ativada" : "Opção desativada"); }));
}
function toggleTheme() { document.body.classList.toggle("light"); localStorage.setItem("lambisgoia-theme", document.body.classList.contains("light") ? "light" : "dark"); renderSettings(); showToast(document.body.classList.contains("light") ? "Tema claro ativado" : "Tema escuro ativado"); }
function exportData() { const blob = new Blob([JSON.stringify(state.conversations, null, 2)], { type: "application/json" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "lambisgoia-conversas.json"; link.click(); URL.revokeObjectURL(link.href); showToast("Histórico exportado"); }
function shareChat() { navigator.clipboard?.writeText(location.href); showToast("Link do protótipo copiado"); }

$("#composerForm").addEventListener("submit", (event) => { event.preventDefault(); sendToAgent(); });
$("#messageInput").addEventListener("input", (event) => { event.target.style.height = "auto"; event.target.style.height = `${Math.min(event.target.scrollHeight, 130)}px`; });
$("#messageInput").addEventListener("keydown", (event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendToAgent(); } });
$("#imageInput").addEventListener("change", (event) => readImages(event.target.files));
$("#historySearch").addEventListener("input", (event) => renderConversations(event.target.value));
$("#modalBackdrop").addEventListener("click", closeModal);
$$("[data-action]").forEach((button) => button.addEventListener("click", () => {
  const action = button.dataset.action;
  if (action === "new-chat") createConversation();
  if (action === "attach-image") $("#imageInput").click();
  if (action === "toggle-models") toggleModelPopover();
  if (action === "toggle-sidebar") $("#sidebar").classList.toggle("open");
  if (action === "open-settings" || action === "open-profile") openModal();
  if (action === "close-modal") closeModal();
  if (action === "toggle-theme") toggleTheme();
  if (action === "share-chat") shareChat();
  if (action === "voice") showToast("Microfone pronto para a próxima versão");
  if (action === "clear-history") { state.conversations = [{ id: crypto.randomUUID(), title: "Nova conversa", messages: [] }]; state.activeConversationId = state.conversations[0].id; saveState(); renderConversations(); renderMessages(); showToast("Histórico limpo"); }
  if (action === "focus-chat") { closeModal(); $("#messageInput").focus(); }
  if (action === "open-library") showToast("Biblioteca de prompts em breve");
}));
$$("[data-prompt]").forEach((button) => button.addEventListener("click", () => { $("#messageInput").value = button.dataset.prompt; $("#messageInput").focus(); $("#messageInput").dispatchEvent(new Event("input")); }));
$$(".settings-tab").forEach((button) => button.addEventListener("click", () => { state.settingsTab = button.dataset.tab; renderSettings(); }));

const composerDock = $(".composer-dock");
["dragenter", "dragover"].forEach((name) => $("#chatStage").addEventListener(name, (event) => { event.preventDefault(); composerDock.classList.add("dragging"); }));
["dragleave", "drop"].forEach((name) => $("#chatStage").addEventListener(name, (event) => { event.preventDefault(); composerDock.classList.remove("dragging"); }));
$("#chatStage").addEventListener("drop", (event) => readImages(event.dataTransfer.files));
document.addEventListener("paste", (event) => { const images = [...(event.clipboardData?.items || [])].filter((item) => item.type.startsWith("image/")).map((item) => item.getAsFile()).filter(Boolean); if (images.length) { readImages(images); showToast("Imagem colada e pronta para leitura"); } });
document.addEventListener("click", (event) => { if (!event.target.closest(".model-select-wrap")) toggleModelPopover(false); });
window.addEventListener("keydown", (event) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); createConversation(); } if ((event.metaKey || event.ctrlKey) && event.key === "/") { event.preventDefault(); $("#historySearch").focus(); } if (event.key === "Escape") { closeModal(); toggleModelPopover(false); } });

if (localStorage.getItem("lambisgoia-theme") === "light") document.body.classList.add("light");
renderConversations(); renderModels(); renderMessages();
