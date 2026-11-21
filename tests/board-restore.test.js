import test from 'node:test';
import assert from 'node:assert/strict';
import {readBoardExportFile} from '../src/board-restore.js';

const now = '2026-11-21T10:00:00.000Z';
const task = {
  id: 'checklist', title: 'Portability', brief: 'Check the imported checklist', priority: 2,
  sequence: 0, kind: 'checklist', state: 'done', mode: 'local', cloudAllowed: false,
  result: {
    text: 'Original checklist', source: 'LOCAL_DETERMINISTIC', createdAt: now,
    humanEdit: {text: 'Revised checklist 日本語', editedAt: now, approvedAt: now}, reviewApprovedAt: now,
  },
};
const backup = tasks => new Blob([JSON.stringify({version: 1, tasks})]);

test('retains edited checklist text, approval and original provenance without rewriting the task', async () => {
  const restored = await readBoardExportFile(backup([task]));
  assert.deepEqual(restored, {tasks: [task], permissionsCleared: 0, interrupted: 0});
  assert.equal(JSON.stringify(restored.tasks), JSON.stringify([task]));
});

test('clears routes and permission, recovers running work, and retains old inference receipts', async () => {
  const receipt = {version: 1, requestedMode: 'hybrid', actualSource: 'in_cloud', elapsedMs: 123};
  const previous = {
    ...task, id: 'prior', kind: 'ai', state: 'review', mode: 'hybrid', cloudAllowed: true,
    result: {text: 'Original AI draft', source: 'in_cloud', executionReceipt: receipt},
  };
  const running = {...previous, id: 'running', sequence: 1, state: 'running'};
  delete running.result;
  const blocked = {...running, id: 'blocked', sequence: 2, state: 'blocked', mode: 'local', cloudAllowed: false};
  const routeOnly = {...running, id: 'route-only', sequence: 3, state: 'queued', mode: 'cloud', cloudAllowed: false};
  const consentOnly = {...routeOnly, id: 'consent-only', sequence: 4, mode: 'local', cloudAllowed: true};
  const restored = await readBoardExportFile(backup([previous, running, blocked, routeOnly, consentOnly]));
  assert.equal(restored.permissionsCleared, 4);
  assert.equal(restored.interrupted, 1);
  assert.ok(restored.tasks.every(t => t.mode === 'local' && !t.cloudAllowed));
  assert.deepEqual(restored.tasks[0].result, previous.result);
  assert.equal(restored.tasks[1].state, 'blocked');
  assert.match(restored.tasks[1].error, /Retry explicitly/);
  assert.deepEqual(restored.tasks[2], blocked);
  assert.equal(restored.tasks[3].state, 'queued');
  assert.equal(restored.tasks[4].state, 'queued');
});

test('rejects broken file encoding, unreadable files and invalid backup envelopes', async () => {
  await assert.rejects(readBoardExportFile(), /No file selected/);
  await assert.rejects(readBoardExportFile({size: 32 * 1024 * 1024 + 1}), /larger than 32 MiB/);
  await assert.rejects(readBoardExportFile({size: 1, arrayBuffer: () => { throw Error('Gone'); }}), /File could not be read/);
  await assert.rejects(readBoardExportFile(new Blob([Uint8Array.of(0xff)])), /not valid UTF-8/);
  await assert.rejects(readBoardExportFile(new Blob(['{'])), /not valid JSON/);
  await assert.rejects(readBoardExportFile(new Blob(['[]'])), /Invalid board export envelope/);
  await assert.rejects(readBoardExportFile(new Blob(['{"version":2,"tasks":[]}'])), /Unsupported/);
  await assert.rejects(readBoardExportFile(new Blob(['{"version":1,"tasks":null}'])), /must be an array/);
  await assert.rejects(readBoardExportFile(backup([])), /Nothing to restore/);
});

test('rejects invalid task shape, inappropriate consent and inconsistent approval metadata', async () => {
  await assert.rejects(readBoardExportFile(backup([task, task])), /Duplicate task/);
  await assert.rejects(readBoardExportFile(backup([{...task, mode: 'cloud', cloudAllowed: true}])), /Invalid task/);
  await assert.rejects(readBoardExportFile(backup([{...task, result: undefined}])), /must include result/);
  await assert.rejects(readBoardExportFile(backup([{...task, result: 123}])), /result must be an object/);
  await assert.rejects(readBoardExportFile(backup([{...task, error: {reason: 'no'}}])), /Invalid task error/);
  const missingApproval = {...task.result, humanEdit: {text: 'Edit', editedAt: now}};
  await assert.rejects(readBoardExportFile(backup([{...task, result: missingApproval}])), /Invalid human-edited result/);
  const badReceipt = {version: 1, requestedMode: 'cloud', actualSource: 'in_cloud', elapsedMs: 'brief'};
  const badTask = {...task, kind: 'ai', result: {text: 'Draft', source: 'in_cloud', executionReceipt: badReceipt}};
  await assert.rejects(readBoardExportFile(backup([badTask])), /Invalid execution receipt/);
});
