import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const script = fileURLToPath(new URL('../scripts/verify-hosting.js', import.meta.url));
const currentEntry = 'dist/assets/index-B7ctCCh8.js';
const retainedEntry = 'dist/assets/index-DpVJkeI0.js';
const files = {
  'firebase.json': '{"hosting":{"public":"dist"}}\n',
  'current-assets.sha256': 'stage-generated current-only metadata\n',
  'dist/index.html': '<script type="module" src="/assets/index-B7ctCCh8.js"></script>\n',
  'dist/relay_core.wasm': 'stable WASM bytes',
  [currentEntry]: 'current JS bytes',
  [retainedEntry]: 'retained JS bytes',
};

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'relay-verify-hosting-'));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  const stage = join(root, 'stage');
  const manifest = join(root, 'approved.bundle.sha256');
  const rows = [];
  for (const [path, bytes] of Object.entries(files)) {
    const target = join(stage, path);
    mkdirSync(dirname(target), {recursive: true});
    writeFileSync(target, bytes);
    rows.push(createHash('sha256').update(bytes).digest('hex') + '  ' + path);
  }
  writeFileSync(manifest, rows.join('\n') + '\n');
  return {
    stage, manifest, rows,
    verify(expectedError) {
      const result = spawnSync(process.execPath, [script, stage, manifest], {encoding: 'utf8'});
      assert.ifError(result.error);
      if (expectedError) {
        assert.equal(result.status, 1, result.stderr);
        assert.match(result.stderr, expectedError);
        assert.equal(result.stdout, '');
      } else {
        assert.equal(result.status, 0, result.stderr);
        assert.match(result.stdout, /Verified exact Hosting stage inventory and SHA-256 \(6 files\)/);
      }
    },
  };
}

test('accepts the exact approved Hosting stage', t => {
  fixture(t).verify();
});

test('rejects missing current or retained modules', t => {
  for (const entry of [currentEntry, retainedEntry]) {
    const staged = fixture(t);
    rmSync(join(staged.stage, entry));
    staged.verify(new RegExp('Missing stage files: ' + entry));
  }
});

test('rejects unlisted public files, stage metadata, and directories', t => {
  for (const entry of ['dist/extra.txt', '.firebaserc']) {
    const staged = fixture(t);
    writeFileSync(join(staged.stage, entry), 'unexpected');
    staged.verify(/Unexpected stage file:/);
  }
  const staged = fixture(t);
  mkdirSync(join(staged.stage, 'dist', 'unexpected'));
  staged.verify(/Unexpected stage directory:/);
});

test('rejects config, metadata, or asset bytes that differ from approval', t => {
  for (const entry of ['firebase.json', 'current-assets.sha256', retainedEntry]) {
    const staged = fixture(t);
    writeFileSync(join(staged.stage, entry), 'tampered');
    staged.verify(new RegExp('Stage SHA-256 mismatch: ' + entry));
  }
});

test('rejects incomplete, duplicate and escaping inventory rows', t => {
  const staged = fixture(t);
  const {manifest, rows} = staged;
  writeFileSync(manifest, rows.slice(1).join('\n') + '\n');
  staged.verify(/Approved inventory lacks firebase\.json/);
  writeFileSync(manifest, [...rows, rows[0]].join('\n') + '\n');
  staged.verify(/Duplicate inventory path: firebase\.json/);
  writeFileSync(manifest, [...rows, '0'.repeat(64) + '  dist/../outside'].join('\n') + '\n');
  staged.verify(/Invalid inventory path:/);
});

test('rejects symlinks even if their target has the expected bytes', {skip: process.platform === 'win32'}, t => {
  const staged = fixture(t);
  const source = join(dirname(staged.stage), 'module.js');
  const target = join(staged.stage, currentEntry);
  writeFileSync(source, files[currentEntry]);
  rmSync(target);
  symlinkSync(source, target);
  staged.verify(/Expected a regular stage file:/);
});
