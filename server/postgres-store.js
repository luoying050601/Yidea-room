import postgres from 'postgres';
import { applyOperation } from './store.js';

const validId = id => /^[a-zA-Z0-9_-]{1,80}$/.test(id);

export class PostgresStore {
    constructor(connectionString) { this.sql = postgres(connectionString, { max: 5, idle_timeout: 20, connect_timeout: 10, prepare: false }) }
    async health() { await this.sql`SELECT 1` }
    async close() { await this.sql.end() }
    async list() { const rows = await this.sql`SELECT board FROM public.idea_boards ORDER BY updated_at DESC`; return rows.map(row => row.board) }
    async get(id) { const [row] = await this.sql`SELECT board FROM public.idea_boards WHERE id=${id}`; return row?.board || null }
    async ensure(id, title) {
        if (!validId(id)) throw Error('Invalid board ID');
        const updatedAt = new Date().toISOString(), board = { id, title: title.slice(0, 100), objects: [], comments: [], revision: 0, updatedAt };
        await this.sql`INSERT INTO public.idea_boards (id,board,updated_at) VALUES (${id},${JSON.stringify(board)}::jsonb,${updatedAt}) ON CONFLICT (id) DO NOTHING`;
        return this.get(id);
    }
    async create(id, title) {
        if (!validId(id)) throw Error('Invalid board ID');
        const updatedAt = new Date().toISOString(), board = { id, title: title.slice(0, 100), objects: [], comments: [], revision: 0, updatedAt };
        await this.sql`INSERT INTO public.idea_boards (id,board,updated_at) VALUES (${id},${JSON.stringify(board)}::jsonb,${updatedAt})`;
        return board;
    }
    async apply(id, op) {
        return this.sql.begin(async tx => {
            const [row] = await tx`SELECT board FROM public.idea_boards WHERE id=${id} FOR UPDATE`;
            const current = row?.board || null, next = applyOperation(current, op);
            if (next === current) return current;
            next.updatedAt = new Date().toISOString();
            await tx`UPDATE public.idea_boards SET board=${JSON.stringify(next)}::jsonb,updated_at=${next.updatedAt} WHERE id=${id}`;
            return next;
        });
    }
}