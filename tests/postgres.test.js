import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PostgresStore } from '../server/postgres-store.js';

const connectionString = process.env.TEST_DATABASE_URL;

test('Postgres store normalizes JSON text and JSONB board values', async () => {
    const store = Object.create(PostgresStore.prototype);
    const board = { id: 'welcome', title: 'Welcome', objects: [], comments: [], revision: 0 };
    store.sql = async () => [{ board: JSON.stringify(board) }];
    assert.deepEqual(await store.list(), [board]);
    store.sql = async () => [{ board }];
    assert.deepEqual(await store.get('welcome'), board);
});

test('Postgres store persists boards and serializes concurrent updates', { skip: !connectionString }, async () => {
    const store = new PostgresStore(connectionString), id = `test_${randomUUID().replaceAll('-', '')}`;
    try {
        const board = await store.ensure(id, 'Test board');
        assert.equal(board.revision, 0);
        const object = (objectId, text) => ({ id: objectId, type: 'sticky', x: 0, y: 0, w: 200, h: 160, text, color: '#fff5b6' });
        await Promise.all([
            store.apply(id, { kind: 'objects', upsert: [object('first', 'First')], remove: [] }),
            store.apply(id, { kind: 'objects', upsert: [object('second', 'Second')], remove: [] })
        ]);
        const stored = await store.get(id);
        assert.equal(stored.revision, 2);
        assert.deepEqual(stored.objects.map(item => item.id).sort(), ['first', 'second']);
        await assert.rejects(store.apply(id, { kind: 'objects', upsert: [], remove: [], expectedRevision: 0 }));
    } finally {
        await store.sql`DELETE FROM public.idea_boards WHERE id=${id}`;
        await store.close();
    }
});