import fs from 'node:fs';
import path from 'node:path';
export class Store {
    constructor(dir) { this.dir = dir; fs.mkdirSync(dir, { recursive: true }); this.boards = new Map(); for (const file of fs.readdirSync(dir).filter(f => /^[a-zA-Z0-9_-]+\.json$/.test(f))) { const b = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')); this.boards.set(b.id, b) } }
    save(b) { b.updatedAt = new Date().toISOString(); const target = path.join(this.dir, `${b.id}.json`); fs.writeFileSync(target + '.tmp', JSON.stringify(b)); fs.renameSync(target + '.tmp', target); this.boards.set(b.id, b) }
    list() { return [...this.boards.values()] }
    get(id) { return this.boards.get(id) || null }
    ensure(id, title) { return this.get(id) || this.create(id, title) }
    create(id, title) { if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) throw Error('Invalid board ID'); const b = { id, title: title.slice(0, 100), objects: [], comments: [], revision: 0 }; this.save(b); return b }
    apply(id, op) { const current = this.boards.get(id), b = applyOperation(current, op); if (b !== current) this.save(b); return b }
}
export function applyOperation(current, op) {
    if (!current) throw Error('白板不存在'); if (op.expectedRevision !== undefined && op.expectedRevision !== current.revision) throw Error('其他人已更新白板，无法撤销；请重新编辑。'); if (op.seed && current.seeded) return current; const b = structuredClone(current); if (op.seed) b.seeded = true;
    if (op.kind === 'objects') { if (!Array.isArray(op.upsert) || !Array.isArray(op.remove) || op.upsert.length > 500 || op.remove.length > 500) throw Error('无效的修改'); for (const obj of op.upsert) { if (typeof obj.id !== 'string' || !['sticky', 'rect', 'ellipse', 'text', 'frame', 'arrow', 'image', 'file', 'link'].includes(obj.type) || !['x', 'y', 'w', 'h'].every(k => Number.isFinite(obj[k])) || Math.abs(obj.x) > 1e7 || Math.abs(obj.y) > 1e7 || Math.abs(obj.w) > 1e5 || Math.abs(obj.h) > 1e5 || typeof obj.text !== 'string' || obj.text.length > 20000) throw Error('无效的对象'); const i = b.objects.findIndex(o => o.id === obj.id); if (i < 0) b.objects.push(obj); else b.objects[i] = obj } b.objects = b.objects.filter(o => !op.remove.includes(o.id)); if (b.objects.length > 3000) throw Error('白板最多支持 3000 个对象'); }
    else if (op.kind === 'title') { if (typeof op.title !== 'string' || !op.title.trim()) throw Error('请输入名称'); b.title = op.title.slice(0, 100) }
    else if (op.kind === 'comment') { if (typeof op.comment?.text !== 'string' || !op.comment.text.trim() || op.comment.text.length > 2000 || typeof op.comment.id !== 'string') throw Error('无效的评论'); b.comments.push({ ...op.comment, createdAt: new Date().toISOString() }); }
    else if (op.kind === 'resolve') { const c = b.comments.find(c => c.id === op.id); if (c) c.resolved = !!op.resolved }
    else throw Error('未知操作'); b.revision++; return b;
}
