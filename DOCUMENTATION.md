# Documentação Técnica: Legacy CRM & Bot WhatsApp

Este documento mapeia onde se encontram as configurações, a inteligência e o fluxo de dados no projeto, para que você não dependa da IA externa para fazer manutenção sozinho.

---

## 1. Visão Geral das Pastas (Arquitetura)
O sistema foi dividido em três servidores independentes para garantir que o WhatsApp não caia se o CRM estiver pesado.
1. **`legacy-bot-login/` (Frontend):** A interface visual do CRM (Kanban, login, chats). Roda o painel na porta 8080. Desenvolvido em React + Vite.
2. **`backend/` (Backend Cérebro):** O servidor e o banco de dados. Ele abriga a *Inteligência Artificial (Gemini)*, verifica duplicidade de mensagens, grava no banco de dados e fornece API para o CRM. Roda na porta 3001.
3. **`whatsapp-bridge/` (Ponte):** O servidor isolado do Baileys para scan de QR Code. Ele capta o que acontece no seu celular e notifica o *Backend*. Roda na porta 8081.

---

## 2. 🧠 A "Mente" do Bot (Onde fica o Treinamento?)

Toda a personalidade, triagem e controle de quais mensagens o bot deve inventar moram  **no Backend**.

### A. O Prompt do Bot (Comportamento e Instruções)
**📁 Arquivo:** `backend/src/services/ai.service.ts`

Neste arquivo, no topo dele, existe a variável `BOT_SYSTEM_PROMPT`. 
Ali está o "**System Prompt**" - o cérebro cru das regras. É nesse bloco de texto que você deve mexer caso queira:
- Mudar o tom de voz do bot.
- Mudar quais documentos ele pede para área "Trabalhista", "Cibernético" ou "PIX".
- Mudar o jeito como ele reage quando alguém pergunta "é golpe?".
- Ensinar novas diretrizes para não emitir informações indevidas.

*Qualquer mudança no comportamento da Inteligência, é feita editando este texto e reiniciando o backend (`npx ts-node src/server.ts`).*

### B. A "Memória" Treinável pela Interface
Você não precisa editar o código para treinar regras específicas do dia a dia! 
O CRM possui um Banco de Dados na tabela `bot_memory`. O arquivo `ai.service.ts` usa uma função chamada `getRelevantMemories()` que busca atalhos nessa tabela baseada em gatilhos e injeta no meio do Prompt de forma dinâmica.


---

## 3. 🛤️ A Máquina de Estados (O Funil do Bot)

O bot segue trilhos (estágios de triagem). Ele não é genérico, a conversa deve avançar.

**📁 Arquivo:** `backend/src/controllers/conversations.controller.ts`

Esse é o maior e mais importante arquivo da recepção de mensagens. Nele acontece o seguinte:
* `determineSideStep()`: Verifica se o cliente desviou a conversa (perguntou preço ou sobre golpe antes da hora).
* `advanceStage()`: A função que obriga a conversa a pular do estágio de "Oi" (`reception`) para "Qual Dor?" (`case_identification`) e para "Peça o CPF" (`cpf_collection`).
* `processMessage()`: O coração do sistema. É essa função que capta a mensagem que chegou, confere o `bot_stage` atual, e aciona a IA solicitando uma resposta apropriada. É também aqui que configuramos a "Morte do Bot" (Quando os documentos são recebidos e a flag `bot_active` vira `0` para que a mensagem de "me passa um pix" nunca mais seja lida por ele, evitando catástrofes).


---

## 4. 📭 O Fluxo Real da Mensagem (Do clique à resposta)
Quando um cliente responde ao seu anúncio no Instagram:
1. A mensagem cai no **Celular Físico**.
2. O **`whatsapp-bridge/server.js`** recebe um evento `messages.upsert` do baileys e realiza um `POST` (webhook) no endereço `http://127.0.0.1:3001/api/webhook/whatsapp`.
3. O Backend pega essa mensagem no arquivo **`backend/src/routes/webhook.routes.ts`**.
4. Dispara a função `processMessage()`.
5. Extrai automaticamente CPF, Nome ou informações via regex (no `learning.service.ts` e `conversations.controller.ts`).
6. Chama a API do Gemini com o `BOT_SYSTEM_PROMPT`.
7. Grava a resposta no db (Tabela `messages`) e devolve ao whatsapp-bridge a resposta.
8. Ao mesmo tempo, ele mexe o cartão visual do seu cliente pelas colunas do sistema em tempo real com o Socket.IO.


## Como testar modificações no Bot?
Qualquer modificação que você fizer na personalidade do bot (`ai.service.ts`) exige:
1. Salvar o arquivo.
2. Derrubar o console do backend e ligar com: `npx ts-node src/server.ts`.
3. Mandar um `!reset` no contato onde ele está atendendo, para reiniciar o fluxograma e testar *desde a primeira mensagem dele de acolhida*.
