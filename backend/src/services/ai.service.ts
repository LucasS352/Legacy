import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import { config } from '../config/env';
import axios from 'axios';
import { db } from '../config/database';

const genAI = new GoogleGenerativeAI(config.googleAi.apiKey);

// ============================================================
// SYSTEM PROMPT — Legacy Assessoria Jurídica
// Imutável — token budget-optimized (no examples injected here)
// Real-time context is injected separately via leadContext+memories
// ============================================================
export const BOT_SYSTEM_PROMPT = `Você é um Assistente Jurídico (humano, empático, consultivo e acolhedor) da Legacy Assessoria Jurídica pelo WhatsApp.
Seu objetivo é entender o problema do cliente, conversar naturalmente, criar conexão, e organizar as informações pro assessor humano. 
Use tom coloquial e educado (suave, sem parecer robô). Use emojis contextuais sem exagero. Demonstre empatia genuína pela dor da pessoa.

ÁREAS: trabalhista (demissão/FGTS/horas extras) | consumidor (Serasa/cobrança indevida) | cibernético (conta hackeada/fraude) | pix (transferência fraudulentas)

COMO AGIR CONFORME A ETAPA ATUAL:
[reception] → Cumprimente de forma educada e pergunte em que pode ajudar / o que trouxe ele até a Legacy. JAMAIS peça nome ou CPF.
[case_identification] → O cliente relatou o problema. Se for algo vago (ex: "nome sujo", "tomei golpe"), ESCUTE com empatia ("Sinto muito...") e faça 1 PERGUNTA investigativa (ex: "Foi cobrança indevida de alguma empresa?", "Pra quem mandou o pix?"). NÃO PEÇA NOME E CPF AINDA.
Se o cliente já se explicou bem na primeira mensagem, abrace com empatia e MUDE o assunto com foco em resolver: "Entendi que a sua situação é bem chata. Para eu te direcionar sobre o que podemos fazer e emitirmos procurações, vou precisar que você me mande..." -> (Vá pedindo os documentos listados em "document_request" logo abaixo). NUNCA peça CPF ainda!
[document_request] → Aja de forma prestativa, diga: "Para darmos andamento na análise e ver se conseguimos reverter (ou limpar o nome), eu preciso que você me mande fotos legíveis (ou em PDF) destes documentos:..."
- Trabalhista: RG ou CNH, Comprovante de Residência atualizado, 3 últimos Holerites e a Carteira de trabalho.
- Golpe / Cibernético (Pix/Fraude): RG ou CNH, Comprovante de Residência atualizado, Carteira de trabalho e o principal: Comprovante Original do Pix/Prints da Fraude e o Boletim de Ocorrência (B.O).
- Consumidor/Cível (Negativado): RG ou CNH, Comprovante de Residência atualizado e Carteira de Trabalho.
(Dica Trabalhista: Se tiver dúvidas sobre a CTPS Digital ensine do App ou mande este vídeo https://youtube.com/shorts/9mDNswTXWRM).
[cpf_collection] → O cliente JÁ ENVIOU os documentos que você pediu. ESTE É O MOMENTO DE PEDIR OS DADOS! Diga algo confirmando o recebimento: "Perfeito, documentos recebidos! Para finalizarmos a inclusão no nosso sistema de validação, me informe por favor o seu Nome Completo e o seu CPF.". NÃO USE a palavra "Aprovado", nem diga que vão entrar com a ação, isso é o consultor humano que dirá. Apenas peça para finalizar o cadastro interno.
[payment_objection] → Se perguntarem sobre valores/formas de pagamento: "Não cobramos nada dos nossos clientes, nós trabalhamos em cima de resultado. Se ganhamos a Indenização você paga os Honorários Advocatícios, caso contrário você não tem que pagar NADA."
[insecurity_handling] → Se suspeitarem: "Entendo totalmente seu receio, mas reforço: não cobramos NADINHA! Você não paga nada antecipado para iniciar o processo."
[done] → Se a conversa encerrar aqui: "Seu caso foi triado. Mantenha os avisos do WhatsApp ligados que já vamos falar com você."
[timeline_question] → "O processo costuma andar bem, não se preocupe que te mantemos a par!"
[followup] → "Qualquer novidade, estamos aqui! 🙏"

REGRAS DE OURO:
1. NUNCA dê parecer jurídico ou garantia de ganho. Diga que o advogado vai dar o melhor direcionamento.
2. NUNCA fale porcentagens ou valores de honorários.
3. JAMAIS peça dados bancários, pix, senhas ou cartões.
4. Mantenha mensagens curtas e fluídas (como uma pessoa normal no WhatsApp, máx 2 parágrafos curtos).
5. CONTINUIDADE COMBATENDO ROBOTIZAÇÃO: Aja como um humano! Se o cliente já enviou CPF, NUNCA peça de novo. Se na hora de enviar os documentos ele tirar uma dúvida ou corrigir a área do caso (ex: "na verdade foi um golpe do pix", "só tenho o comprovante do pix, preciso fazer b.o?"), responda com naturalidade sobre o que ele disse e instrua-o sobre os documentos corretos, SEM reiniciar a conversa e SEM repetir scripts passados (como pedir nome/CPF ou saudações).
6. ATENÇÃO AOS DOCUMENTOS: Se a última mensagem for "[Imagem ilegível]" ou "[Documento ilegível]", IGNORE a instrução padrão de sua etapa. VOCÊ DEVE APENAS avisar com simpatia o problema da foto (ex: "Poxa, a foto do seu documento ficou um pouquinho borrada...") e pedir gentilmente para mandar de novo mais nítido. Não repita a lista de documentos inteira de novo, foque só na foto ruim!`;

// ============================================================
// Build Compressed Conversation History (Token-Optimized)
// Keeps last 6 messages + optional summary of earlier context
// ============================================================
export function buildCompressedHistory(
    messages: Array<{ direction: string; content: string; sender: string }>,
    maxMessages = 4
): Array<{ role: 'user' | 'model'; parts: string }> {
    const recent = messages.slice(-maxMessages);
    const older = messages.slice(0, -maxMessages);
    const raw: Array<{ role: 'user' | 'model'; parts: string }> = [];

    // Compressed context from older messages (role 'user' so it can go first)
    if (older.length > 0) {
        const topics = older
            .filter((m) => m.direction === 'inbound')
            .slice(-3)
            .map((m) => m.content.slice(0, 60))
            .join(' | ');
        if (topics) {
            raw.push({ role: 'user', parts: `[Contexto anterior: ${topics}]` });
        }
    }

    for (const msg of recent) {
        raw.push({
            role: msg.direction === 'inbound' ? 'user' : 'model',
            parts: msg.content,
        });
    }

    // Drop leading 'model' entries — Gemini requires first = 'user'
    while (raw.length > 0 && raw[0].role === 'model') {
        raw.shift();
    }

    // Merge consecutive same-role entries — Gemini rejects them
    const merged: Array<{ role: 'user' | 'model'; parts: string }> = [];
    for (const entry of raw) {
        if (merged.length > 0 && merged[merged.length - 1].role === entry.role) {
            merged[merged.length - 1].parts += '\n' + entry.parts;
        } else {
            merged.push({ ...entry });
        }
    }

    return merged;
}


// ============================================================
// Get Relevant Memories from bot_memory table
// Returns best-matching patterns to inject into the prompt
// ============================================================
export async function getRelevantMemories(userMessage: string): Promise<string> {
    try {
        // Simple keyword-based relevance: find patterns related to the message
        const keywords = userMessage
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter((w) => w.length > 3)
            .slice(0, 5);

        if (keywords.length === 0) return '';

        const patterns = await db('bot_memory')
            .where('is_active', 1)
            .where('category', '!=', 'error_pattern')
            .orderBy('usage_count', 'desc')
            .orderBy('confidence_score', 'desc')
            .limit(5)
            .select('category', 'trigger_pattern', 'successful_response', 'legal_area');

        const relevant = (patterns as Array<{
            category: string;
            trigger_pattern: string;
            successful_response: string | null;
            legal_area: string | null;
        }>).filter((p) => {
            const triggerWords = p.trigger_pattern.toLowerCase().split(/[|,\s]+/);
            return keywords.some((k) => triggerWords.some((t) => t.includes(k) || k.includes(t)));
        });

        if (relevant.length === 0) return '';

        const lines = relevant
            .slice(0, 3)
            .map((p) => {
                if (p.category === 'case_type_signal') return `- Área provável: ${p.legal_area}`;
                if (p.successful_response) return `- Resposta comprovada: "${p.successful_response.slice(0, 150)}"`;
                return null;
            })
            .filter(Boolean);

        return lines.length > 0 ? `\n[Memória do bot]:\n${lines.join('\n')}` : '';
    } catch {
        // Never block the bot due to memory errors
        return '';
    }
}

// ============================================================
// Build Lead Context String (token-light)
// ============================================================
export async function buildLeadContext(leadId: number): Promise<string> {
    try {
        const lead = await db('leads')
            .leftJoin('funnels', 'leads.funnel_id', 'funnels.id')
            .where('leads.id', leadId)
            .select(
                'leads.name',
                'leads.cpf',
                'leads.bot_stage',
                'leads.status',
                'funnels.slug as funnel_slug'
            )
            .first() as {
                name: string;
                cpf: string | null;
                bot_stage: string;
                status: string;
                funnel_slug: string | null;
            } | undefined;

        if (!lead) return '';

        const parts = [`Lead: ${lead.name}`];
        if (lead.cpf) parts.push(`CPF: ${lead.cpf}`);
        if (lead.funnel_slug) parts.push(`Área: ${lead.funnel_slug}`);
        parts.push(`Etapa atual: ${lead.bot_stage || 'reception'}`);

        return parts.join(' | ');
    } catch {
        return '';
    }
}

// ============================================================
// Record a success pattern for learning
// Called asynchronously — never blocks the bot response
// ============================================================
export async function recordSuccessPattern(
    userMessage: string,
    botReply: string,
    legalArea: string | null = null,
    converted = false
): Promise<void> {
    try {
        const trigger = userMessage.slice(0, 200).toLowerCase();

        // Check if similar pattern exists
        const existing = await db('bot_memory')
            .where('category', 'success_pattern')
            .whereRaw('LOWER(trigger_pattern) LIKE ?', [`%${trigger.slice(0, 50)}%`])
            .first();

        if (existing) {
            await db('bot_memory')
                .where('id', (existing as { id: number }).id)
                .increment('usage_count', 1)
                .update({
                    lead_converted: converted ? 1 : (existing as { lead_converted: number }).lead_converted,
                    confidence_score: Math.min(
                        100,
                        (existing as { confidence_score: number }).confidence_score + (converted ? 5 : 1)
                    ),
                });
        } else {
            await db('bot_memory').insert({
                category: 'success_pattern',
                trigger_pattern: trigger,
                successful_response: botReply.slice(0, 500),
                legal_area: legalArea,
                lead_converted: converted ? 1 : 0,
                usage_count: 1,
                confidence_score: converted ? 60 : 45,
                is_active: 1,
            });
        }
    } catch {
        // Never block normal flow
    }
}

// ============================================================
// Generate Bot Reply — Token-Optimized
// ============================================================
export async function generateBotReply(
    conversationHistory: Array<{ role: 'user' | 'model'; parts: string }>,
    userMessage: string,
    leadContext = '',
    memories = ''
): Promise<string> {
    if (!config.googleAi.apiKey) {
        console.warn('[AI] No API key configured — using default reply');
        return 'Olá! Sou o assistente da Legacy Assessoria. Um de nossos assessores entrará em contato em breve!';
    }

    try {
        const systemWithContext = [
            BOT_SYSTEM_PROMPT,
            leadContext ? `\n[Dados do lead]: ${leadContext}` : '',
            memories,
        ]
            .filter(Boolean)
            .join('');

        const model = genAI.getGenerativeModel({
            model: config.googleAi.model,
            systemInstruction: systemWithContext,
        });

        const chat = model.startChat({
            history: conversationHistory.map((msg) => ({
                role: msg.role,
                parts: [{ text: msg.parts }],
            })),
            generationConfig: {
                maxOutputTokens: 250,   // Short, direct responses
                temperature: 0.7,       // More conversational/human variation
                topK: 32,
                topP: 0.90,
            },
        });

        // Add 15s timeout to prevent hanging
        const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Gemini API timeout after 15s')), 15000)
        );

        const result = await Promise.race([
            chat.sendMessage(userMessage),
            timeoutPromise,
        ]);

        const text = result.response.text().trim();
        console.log(`[AI] ✅ Bot reply generated (${text.length} chars)`);
        return text;
    } catch (err) {
        const error = err as Record<string, unknown>;
        // Detailed error log to help diagnose API key / quota issues
        console.error('[AI] ❌ Bot reply error:', {
            message: error?.message,
            status: error?.status,
            code: error?.code,
            details: JSON.stringify(error).slice(0, 300),
        });
        return 'Desculpe, tive um problema técnico. Um assessor vai entrar em contato com você em breve!';
    }
}


// ============================================================
// Analyze IMAGE for legibility (documents, comprovantes)
// ============================================================
export async function analyzeImage(
    imageBase64: string,
    mimeType: string,
    context = ''
): Promise<{ isLegible: boolean; description: string; extractedText: string }> {
    const model = genAI.getGenerativeModel({ model: config.googleAi.model });

    const imagePart: Part = {
        inlineData: {
            data: imageBase64,
            mimeType: mimeType as 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf',
        },
    };

    const prompt = `Você é um analista experiente verificando um documento (RG, CNH, Comprovante) enviado por cliente.${context ? ` Contexto: ${context}.` : ''}
Responda rigorosamente em JSON:
{"isLegible":boolean,"description":"1 frase amigável explicando o que é a imagem (ex: 'Foto da CNH')","extractedText":"Dados principais (nome/cpf/rg) ou vazio se ilegível","issues":"Qualquer problema visual ou vazio se perfeito"}

REGRAS CRÍTICAS PARA "isLegible":
1. O texto do documento NÃO PODE estar borrado/desfocado. Se os detalhes pequenos forem difíceis de ler, responda "isLegible": false.
2. Não deve haver flash excessivo cobrindo dados importantes.
3. CRÍTICO: Se a imagem for de um documento de identificação (RG, CNH), os números do documento e o rosto da foto DEVEM estar nítidos e visíveis. Se estiverem borrados, cortados ou cobertos, responda "isLegible": false.
4. Se for ilegível, na "description" descreva o problema amigavelmente (ex: "A foto ficou nítida, mas o número do RG não dá pra ler direito").`;

    try {
        const result = await model.generateContent([prompt, imagePart]);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                isLegible: parsed.isLegible ?? false,
                description: parsed.description ?? 'Imagem recebida',
                extractedText: parsed.extractedText ?? '',
            };
        }
        return { isLegible: false, description: 'Não foi possível analisar a imagem', extractedText: '' };
    } catch (err) {
        console.error('[AI] Image analysis error:', err);
        return { isLegible: false, description: 'Erro ao analisar imagem', extractedText: '' };
    }
}

// ============================================================
// Transcribe AUDIO message
// ============================================================
export async function transcribeAudio(audioBase64: string, mimeType: string): Promise<string> {
    const model = genAI.getGenerativeModel({ model: config.googleAi.model });

    const audioPart: Part = {
        inlineData: {
            data: audioBase64,
            mimeType: mimeType as 'audio/ogg' | 'audio/mpeg' | 'audio/mp4' | 'audio/webm',
        },
    };

    try {
        const result = await model.generateContent([
            'Transcreva este áudio em português do Brasil. Responda apenas com a transcrição.',
            audioPart,
        ]);
        return result.response.text().trim();
    } catch (err) {
        console.error('[AI] Audio transcription error:', err);
        return '';
    }
}

// ============================================================
// Generate AI summary for handoff to assessor
// ============================================================
export async function generateHandoffSummary(
    leadName: string,
    legalArea: string | null,
    recentMessages: Array<{ direction: string; content: string }>
): Promise<string> {
    if (!config.googleAi.apiKey) return 'Novo lead recebido. Verificar histórico.';

    try {
        const model = genAI.getGenerativeModel({ model: config.googleAi.model });
        const msgSummary = recentMessages
            .slice(-6)
            .map((m) => `${m.direction === 'inbound' ? 'Cliente' : 'Bot'}: ${m.content.slice(0, 100)}`)
            .join('\n');

        const prompt = `Crie um resumo executivo de 3 linhas para um assessor jurídico sobre este lead. Seja objetivo.
Lead: ${leadName}
Área: ${legalArea || 'não identificada'}
Conversa recente:
${msgSummary}`;

        const result = await model.generateContent(prompt);
        return result.response.text().trim();
    } catch {
        return `Lead ${leadName} pronto para atendimento. Verificar histórico de mensagens.`;
    }
}

// ============================================================
// Send WhatsApp message via Evolution API
// ============================================================
export async function sendWhatsAppMessage(phone: string, message: string): Promise<void> {
    if (!config.whatsapp.apiUrl || !config.whatsapp.apiKey) {
        console.warn('[WhatsApp] API not configured — skipping send');
        return;
    }

    const url = `${config.whatsapp.apiUrl}/message/sendText/${config.whatsapp.instance}`;

    try {
        await axios.post(
            url,
            {
                number: phone.includes('@') ? phone : phone.replace(/\D/g, ''),
                text: message,
                delay: 1200,
            },
            {
                headers: {
                    apikey: config.whatsapp.apiKey,
                    'Content-Type': 'application/json',
                },
                timeout: 10000,
            }
        );
    } catch (err) {
        const error = err as { message?: string };
        console.error('[WhatsApp] Send error:', error.message);
    }
}

// ============================================================
// Download media from Evolution API and return base64
// ============================================================
export async function downloadEvolutionMedia(
    messageId: string,
    instance: string
): Promise<{ base64: string; mimeType: string } | null> {
    if (!config.whatsapp.apiUrl || !config.whatsapp.apiKey) return null;

    try {
        const url = `${config.whatsapp.apiUrl}/chat/getBase64FromMediaMessage/${instance}`;
        const response = await axios.post(
            url,
            { message: { key: { id: messageId } } },
            {
                headers: { apikey: config.whatsapp.apiKey },
                timeout: 15000,
            }
        );

        if (response.data?.base64 && response.data?.mimetype) {
            return {
                base64: response.data.base64,
                mimeType: response.data.mimetype,
            };
        }
        return null;
    } catch (err) {
        console.error('[WhatsApp] Media download error:', err);
        return null;
    }
}

// ============================================================
// Legacy export for backward compatibility
// ============================================================
export const aiService = {
    generateBotReply,
    sendWhatsAppMessage,
    analyzeImage,
    transcribeAudio,
    downloadEvolutionMedia,
    buildCompressedHistory,
    getRelevantMemories,
    buildLeadContext,
    recordSuccessPattern,
    generateHandoffSummary,
};

export default aiService;
