import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store } from './store.js';
import { PostgresStore } from './postgres-store.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const store = process.env.DATABASE_URL ? new PostgresStore(process.env.DATABASE_URL) : new Store(process.env.DATA_DIR || path.join(root, 'data'));
if (process.env.DATABASE_URL) await store.health();
const app = express(), http = createServer(app), origin = process.env.CLIENT_ORIGIN;
if (origin) app.use((req, res, next) => { if (req.headers.origin === origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type') } if (req.method === 'OPTIONS') return res.sendStatus(204); next() });
app.use(express.json({ limit: '10mb' }));
app.get('/api/health', async (_, res) => { try { await store.health?.(); res.json({ ok: true }) } catch { res.status(503).json({ ok: false, error: '存储服务不可用' }) } });
app.get('/api/boards', async (_, res) => { try { res.json((await store.list()).map(({ id, title, updatedAt, objects }) => ({ id, title, updatedAt, count: objects.length }))) } catch { res.status(503).json({ error: '无法读取白板' }) } });
app.post('/api/boards', async (req, res) => { try { const id = crypto.randomUUID(); res.status(201).json(await store.create(id, typeof req.body.title === 'string' ? req.body.title : '未命名白板')) } catch { res.status(400).json({ error: '无法创建白板' }) } });
app.use(express.static(path.join(root, 'dist')));
app.get('/', (_, res) => res.sendFile(path.join(root, 'dist/index.html')));
const io = new Server(http, { cors: origin ? { origin } : undefined, maxHttpBufferSize: 10e6 });
function people(id) { return [...io.sockets.sockets.values()].filter(s => s.data.board === id).map(s => ({ id: s.id, name: s.data.name, color: s.data.color, cursor: s.data.cursor })) }
const colors = ['#45816d', '#a76dd4', '#d38a3c', '#518db8', '#c7657d'];
io.on('connection', socket => {
    socket.on('join', async ({ id, name }, ack) => { try { if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) throw Error('无效的白板链接'); const board = await store.ensure(id, id === 'welcome' ? 'Hackathon · 灵感共创' : '未命名白板'); if (socket.data.board) { const old = socket.data.board; socket.leave(old); socket.data.board = null; io.to(old).emit('people', people(old)) } socket.data = { board: id, name: String(name || '访客').slice(0, 30), color: colors[Math.floor(Math.random() * colors.length)] }; socket.join(id); ack?.({ board }); io.to(id).emit('people', people(id)) } catch (e) { ack?.({ error: e.message }) } });
    socket.on('op', async (op, ack) => { try { const board = await store.apply(socket.data.board, op); io.to(board.id).emit('board', board); ack?.({ ok: true, revision: board.revision }) } catch (e) { ack?.({ error: e.message }) } });
    socket.on('cursor', cursor => { if (socket.data.board && Number.isFinite(cursor?.x) && Number.isFinite(cursor?.y)) { socket.data.cursor = cursor; socket.to(socket.data.board).emit('cursor', { id: socket.id, cursor }) } });
    socket.on('disconnect', () => { if (socket.data.board) io.to(socket.data.board).emit('people', people(socket.data.board)) });
});
http.listen(Number(process.env.PORT) || 3001, '0.0.0.0', () => console.log('Idea Room server: http://localhost:' + (process.env.PORT || 3001)));
