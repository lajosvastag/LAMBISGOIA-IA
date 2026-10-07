# Lambisgoia — plano de implementação

## Escopo
Criar um site responsivo de agente de IA que reúne GPT, Gemini, Grok, Copilot e outros modelos em uma interface única, inspirada na organização de um produto moderno de chat. A primeira entrega é um protótipo funcional no frontend, com servidor Node sem dependências para servir a aplicação e um adaptador opcional OpenAI-compatible para conectar modelos reais por variáveis de ambiente.

## Decisões de implementação
- **Stack:** HTML, CSS e JavaScript vanilla com Node.js built-in; nenhuma dependência obrigatória, para abrir facilmente no VS Code.
- **Frontend:** `public/index.html`, `public/styles.css` e `public/app.js` organizados por responsabilidades.
- **Servidor:** `server.js` serve assets estáticos, expõe `/api/health`, `/api/models` e `/api/chat`. Sem chave configurada, o endpoint de chat retorna respostas demonstrativas; com `OPENAI_API_KEY`, encaminha a conversa para um endpoint OpenAI-compatible e preserva imagens como `image_url`.
- **Portabilidade de imagem:** upload por botão, arrastar e soltar e colar; leitura local no navegador via `FileReader`/`Image`, com pré-visualização, nome, tamanho e dimensões. A mensagem multimodal é enviada no formato compatível com APIs de visão quando o adaptador real está configurado.
- **Persistência local:** conversas, tema, modelo escolhido e preferências usam `localStorage`. Exportação e importação JSON ficam disponíveis nas configurações.
- **Rotas:** aplicação de uma página em `/`, com `/manus-routes.json` declarando a rota principal.

## Direção visual
- **Movimento:** dark editorial futurista, com influência de interfaces de laboratório e produtos de IA premium.
- **Princípios:** foco no conteúdo; contrastes suaves; densidade controlada; feedback imediato e discreto.
- **Paleta:** base carvão/azul-noite para reduzir ruído visual, superfícies em azul-petróleo e o verde-lima `#C7F36B` como assinatura de inteligência, sinal e ação.
- **Layout:** shell de duas colunas; sidebar como centro de navegação persistente e canvas de conversa com largura confortável, sem blocos excessivamente centralizados.
- **Assinaturas:** marca orbital em forma de “L”; pílulas de modelo com micro-gradientes; filete vertical luminoso nas respostas do agente.
- **Interação:** cada ação importante responde no lugar — seletor de modelo, anexos e configurações são popovers/painéis, não navegações destrutivas.
- **Animação:** entrada curta de 160–220ms, typing shimmer discreto, expansão suave de menu e destaque de foco sem exagero.
- **Tipografia:** `Inter`/system para interface; pesos 500–700 para hierarquia; títulos curtos, números e labels compactos.
- **Essência da marca:** “um agente só para pensar com todas as IAs” — curioso, direto e ligeiramente irreverente.
- **Voz:** CTAs claros e humanos, como “Começar uma conversa” e “Mostre uma imagem, eu leio com você”.
- **Wordmark/logo:** monograma `L` construído com duas formas orgânicas orbitais, acompanhado do nome em lowercase.
- **Cor proprietária:** verde-lima elétrico `#C7F36B`, usado com parcimônia em ações e estados ativos.

## Estrutura de pastas
- `public/index.html`: estrutura acessível do app e modais.
- `public/styles.css`: tokens, layout responsivo, estados e animações.
- `public/app.js`: estado local, renderização, eventos, anexos de imagem e interações.
- `public/manus-routes.json`: manifesto de rotas do WebDev.
- `server.js`: servidor estático e APIs demonstrativas/compatíveis.
- `.env.example`: variáveis opcionais para um provedor OpenAI-compatible.
- `README.md`: instruções de execução e integração.
- `app.config.ts`: metadata do logo do projeto.
