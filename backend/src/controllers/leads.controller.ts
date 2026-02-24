import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../config/database';
import { Lead } from '../types';
import { logActivity } from '../services/activity.service';

const createLeadSchema = z.object({
    name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
    phone: z.string().min(10, 'Telefone inválido'),
    email: z.string().email().optional().or(z.literal('')),
    cpf: z.string().optional(),
    origin: z.enum(['whatsapp', 'manual', 'instagram', 'site']).default('manual'),
    funnel_id: z.number().int().positive(),
    stage_id: z.number().int().positive().optional(),
    description: z.string().optional(),
    assigned_to: z.number().int().positive().optional(),
});

const updateLeadSchema = createLeadSchema.partial();

export async function getLeads(req: Request, res: Response): Promise<void> {
    try {
        const {
            funnel_id,
            stage_id,
            status,
            search,
            assigned_to,
            page = '1',
            limit = '100',
        } = req.query;

        let query = db('leads as l')
            .select(
                'l.*',
                'f.name as funnel_name',
                'f.slug as funnel_slug',
                'f.color as funnel_color',
                's.name as stage_name',
                's.slug as stage_slug',
                's.display_order as stage_order',
                'u.name as assigned_user_name',
                'u.email as assigned_user_email'
            )
            .leftJoin('funnels as f', 'l.funnel_id', 'f.id')
            .leftJoin('stages as s', 'l.stage_id', 's.id')
            .leftJoin('users as u', 'l.assigned_to', 'u.id')
            .orderBy('l.updated_at', 'desc');

        if (funnel_id) query = query.where('l.funnel_id', Number(funnel_id));
        if (stage_id) query = query.where('l.stage_id', Number(stage_id));
        if (status) query = query.where('l.status', String(status));
        if (assigned_to) query = query.where('l.assigned_to', Number(assigned_to));

        if (search) {
            const term = `%${String(search)}%`;
            query = query.where((builder) => {
                builder
                    .whereLike('l.name', term)
                    .orWhereLike('l.phone', term)
                    .orWhereLike('l.email', term);
            });
        }

        const pageNum = parseInt(String(page), 10);
        const limitNum = parseInt(String(limit), 10);
        const offset = (pageNum - 1) * limitNum;

        const countQuery = db('leads as l').count('l.id as total');
        if (funnel_id) countQuery.where('l.funnel_id', Number(funnel_id));
        if (stage_id) countQuery.where('l.stage_id', Number(stage_id));
        if (status) countQuery.where('l.status', String(status));

        const [countResult] = await countQuery;
        const total = Number((countResult as Record<string, unknown>).total || 0);

        const leads = await query.limit(limitNum).offset(offset);

        res.json({
            success: true,
            data: leads,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    } catch (err) {
        console.error('Get leads error:', err);
        res.status(500).json({ success: false, error: 'Erro ao buscar leads' });
    }
}

export async function getLeadById(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;

        const lead = await db('leads as l')
            .select(
                'l.*',
                'f.name as funnel_name',
                'f.slug as funnel_slug',
                'f.color as funnel_color',
                's.name as stage_name',
                's.slug as stage_slug',
                'u.name as assigned_user_name'
            )
            .leftJoin('funnels as f', 'l.funnel_id', 'f.id')
            .leftJoin('stages as s', 'l.stage_id', 's.id')
            .leftJoin('users as u', 'l.assigned_to', 'u.id')
            .where('l.id', Number(id))
            .first();

        if (!lead) {
            res.status(404).json({ success: false, error: 'Lead não encontrado' });
            return;
        }

        res.json({ success: true, data: lead });
    } catch (err) {
        console.error('Get lead error:', err);
        res.status(500).json({ success: false, error: 'Erro ao buscar lead' });
    }
}

export async function createLead(req: Request, res: Response): Promise<void> {
    const result = createLeadSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({ success: false, error: 'Dados inválidos', details: result.error.errors });
        return;
    }

    try {
        // Default stage to "recebido" (id=1) if not provided
        const stageId = result.data.stage_id || 1;

        const [id] = await db('leads').insert({
            ...result.data,
            stage_id: stageId,
            email: result.data.email || null,
        });

        const lead = await db('leads as l')
            .select('l.*', 'f.name as funnel_name', 'f.color as funnel_color', 's.name as stage_name')
            .leftJoin('funnels as f', 'l.funnel_id', 'f.id')
            .leftJoin('stages as s', 'l.stage_id', 's.id')
            .where('l.id', id)
            .first();

        await logActivity({
            user_id: req.user?.userId,
            lead_id: id,
            action: 'lead_created',
            entity_type: 'lead',
            entity_id: id,
            new_value: lead,
        });

        res.status(201).json({ success: true, data: lead });
    } catch (err: unknown) {
        const error = err as { code?: string };
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(409).json({ success: false, error: 'Já existe um lead com este telefone' });
            return;
        }
        console.error('Create lead error:', err);
        res.status(500).json({ success: false, error: 'Erro ao criar lead' });
    }
}

export async function updateLead(req: Request, res: Response): Promise<void> {
    const result = updateLeadSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({ success: false, error: 'Dados inválidos', details: result.error.errors });
        return;
    }

    const { id } = req.params;

    try {
        const existing = await db<Lead>('leads').where({ id: Number(id) }).first();
        if (!existing) {
            res.status(404).json({ success: false, error: 'Lead não encontrado' });
            return;
        }

        await db('leads').where({ id: Number(id) }).update(result.data);

        const updated = await db('leads as l')
            .select('l.*', 'f.name as funnel_name', 'f.color as funnel_color', 's.name as stage_name')
            .leftJoin('funnels as f', 'l.funnel_id', 'f.id')
            .leftJoin('stages as s', 'l.stage_id', 's.id')
            .where('l.id', Number(id))
            .first();

        await logActivity({
            user_id: req.user?.userId,
            lead_id: Number(id),
            action: 'lead_updated',
            entity_type: 'lead',
            entity_id: Number(id),
            old_value: existing,
            new_value: result.data,
        });

        res.json({ success: true, data: updated });
    } catch (err) {
        console.error('Update lead error:', err);
        res.status(500).json({ success: false, error: 'Erro ao atualizar lead' });
    }
}

export async function updateLeadStage(req: Request, res: Response): Promise<void> {
    const schema = z.object({ stage_id: z.number().int().positive() });
    const result = schema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({ success: false, error: 'stage_id inválido' });
        return;
    }

    const { id } = req.params;
    try {
        const existing = await db<Lead>('leads').where({ id: Number(id) }).first();
        if (!existing) {
            res.status(404).json({ success: false, error: 'Lead não encontrado' });
            return;
        }

        const stage = await db('stages').where({ id: result.data.stage_id }).first();
        if (!stage) {
            res.status(400).json({ success: false, error: 'Estágio inválido' });
            return;
        }

        await db('leads').where({ id: Number(id) }).update({ stage_id: result.data.stage_id });

        await logActivity({
            user_id: req.user?.userId,
            lead_id: Number(id),
            action: 'stage_changed',
            entity_type: 'lead',
            entity_id: Number(id),
            old_value: { stage_id: existing.stage_id },
            new_value: { stage_id: result.data.stage_id, stage_name: stage.name },
        });

        res.json({ success: true, message: `Lead movido para: ${stage.name}` });
    } catch (err) {
        console.error('Update stage error:', err);
        res.status(500).json({ success: false, error: 'Erro ao atualizar estágio' });
    }
}

export async function updateLeadStatus(req: Request, res: Response): Promise<void> {
    const schema = z.object({
        status: z.enum(['active', 'approved', 'rejected', 'archived']),
        verdict_notes: z.string().optional(),
    });
    const result = schema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({ success: false, error: 'Dados inválidos' });
        return;
    }

    const { id } = req.params;
    try {
        const existing = await db<Lead>('leads').where({ id: Number(id) }).first();
        if (!existing) {
            res.status(404).json({ success: false, error: 'Lead não encontrado' });
            return;
        }

        await db('leads').where({ id: Number(id) }).update(result.data);

        await logActivity({
            user_id: req.user?.userId,
            lead_id: Number(id),
            action: 'status_changed',
            entity_type: 'lead',
            entity_id: Number(id),
            old_value: { status: existing.status },
            new_value: result.data,
        });

        res.json({ success: true, message: 'Status atualizado com sucesso' });
    } catch (err) {
        console.error('Update status error:', err);
        res.status(500).json({ success: false, error: 'Erro ao atualizar status' });
    }
}

export async function toggleBotStatus(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
        const lead = await db<Lead>('leads').where({ id: Number(id) }).first();
        if (!lead) {
            res.status(404).json({ success: false, error: 'Lead não encontrado' });
            return;
        }

        const newValue = !lead.bot_active;
        await db('leads').where({ id: Number(id) }).update({ bot_active: newValue });

        res.json({ success: true, data: { bot_active: newValue } });
    } catch (err) {
        console.error('Toggle bot error:', err);
        res.status(500).json({ success: false, error: 'Erro ao alterar status do bot' });
    }
}

export async function deleteLead(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
        const existing = await db<Lead>('leads').where({ id: Number(id) }).first();
        if (!existing) {
            res.status(404).json({ success: false, error: 'Lead não encontrado' });
            return;
        }

        // Soft delete — marcar como arquivado ao invés de deletar
        await db('leads').where({ id: Number(id) }).update({ status: 'archived' });

        await logActivity({
            user_id: req.user?.userId,
            lead_id: Number(id),
            action: 'lead_archived',
            entity_type: 'lead',
            entity_id: Number(id),
        });

        res.json({ success: true, message: 'Lead arquivado com sucesso' });
    } catch (err) {
        console.error('Delete lead error:', err);
        res.status(500).json({ success: false, error: 'Erro ao arquivar lead' });
    }
}

// Notes for a specific lead
export async function getLeadNotes(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
        const notes = await db('notes as n')
            .select('n.*', 'u.name as author_name')
            .leftJoin('users as u', 'n.author_user_id', 'u.id')
            .where('n.lead_id', Number(id))
            .orderBy('n.created_at', 'asc');

        res.json({ success: true, data: notes });
    } catch (err) {
        console.error('Get notes error:', err);
        res.status(500).json({ success: false, error: 'Erro ao buscar notas' });
    }
}

export async function createLeadNote(req: Request, res: Response): Promise<void> {
    const schema = z.object({ content: z.string().min(1, 'Conteúdo é obrigatório') });
    const result = schema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({ success: false, error: 'Conteúdo é obrigatório' });
        return;
    }

    const { id } = req.params;
    try {
        const [noteId] = await db('notes').insert({
            lead_id: Number(id),
            author_type: 'user',
            author_user_id: req.user!.userId,
            content: result.data.content,
        });

        const note = await db('notes as n')
            .select('n.*', 'u.name as author_name')
            .leftJoin('users as u', 'n.author_user_id', 'u.id')
            .where('n.id', noteId)
            .first();

        res.status(201).json({ success: true, data: note });
    } catch (err) {
        console.error('Create note error:', err);
        res.status(500).json({ success: false, error: 'Erro ao criar nota' });
    }
}

// Documents for a specific lead
export async function getLeadDocuments(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
        const docs = await db('documents').where({ lead_id: Number(id) }).orderBy('created_at', 'desc');
        res.json({ success: true, data: docs });
    } catch (err) {
        console.error('Get documents error:', err);
        res.status(500).json({ success: false, error: 'Erro ao buscar documentos' });
    }
}

export async function createLeadDocument(req: Request, res: Response): Promise<void> {
    const schema = z.object({
        name: z.string().min(1),
        file_type: z.string().optional(),
        file_url: z.string().url().optional(),
        status: z.enum(['pendente', 'recebido', 'aprovado', 'rejeitado']).default('pendente'),
        notes: z.string().optional(),
    });
    const result = schema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({ success: false, error: 'Dados inválidos' });
        return;
    }

    const { id } = req.params;
    try {
        const [docId] = await db('documents').insert({
            lead_id: Number(id),
            uploaded_by: req.user?.userId,
            ...result.data,
        });

        const doc = await db('documents').where({ id: docId }).first();
        res.status(201).json({ success: true, data: doc });
    } catch (err) {
        console.error('Create document error:', err);
        res.status(500).json({ success: false, error: 'Erro ao criar documento' });
    }
}

export async function getFunnels(req: Request, res: Response): Promise<void> {
    try {
        const funnels = await db('funnels').where({ is_active: 1 }).orderBy('display_order');
        res.json({ success: true, data: funnels });
    } catch (err) {
        console.error('Get funnels error:', err);
        res.status(500).json({ success: false, error: 'Erro ao buscar funis' });
    }
}

export async function getStages(req: Request, res: Response): Promise<void> {
    try {
        const stages = await db('stages').orderBy('display_order');
        res.json({ success: true, data: stages });
    } catch (err) {
        console.error('Get stages error:', err);
        res.status(500).json({ success: false, error: 'Erro ao buscar estágios' });
    }
}
