import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';

const script = fileURLToPath(new URL('../scripts/stage-hosting.js', import.meta.url));
const config = readFileSync(new URL('../firebase.json', import.meta.url));
const current = 'assets/index-New12345.js';
const prior = 'assets/index-Old12345.js';

function checksum(bytes, path) {
  return createHash('sha256').update(bytes).digest('hex') + '  ' + path + '\n';
}

function setup(t) {
  const root = mkdtempSync(join(tmpdir(), 'relay-hosting-'));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  mkdirSync(join(root, 'dist', 'assets'), {recursive: true});
  mkdirSync(join(root, 'prior', 'assets'), {recursive: true});
  writeFileSync(join(root, 'firebase.json'), config);
  writeFileSync(join(root, 'dist', 'index.html'), 'current HTML');
  writeFileSync(join(root, 'dist', 'relay_core.wasm'), 'current WASM');
  writeFileSync(join(root, 'dist', current), 'current JS');
  writeFileSync(join(root, 'prior', 'index.html'), 'prior HTML');
  writeFileSync(join(root, 'prior', 'relay_core.wasm'), 'prior WASM');
  writeFileSync(join(root, 'prior', prior), 'prior JS');
  writeFileSync(join(root, 'prior.sha256'), checksum('prior JS', prior));
  return root;
}

function run(root, ...archiveArgs) {
  const result = spawnSync(process.execPath, [script, 'stage', ...archiveArgs], {
    cwd: root,
    encoding: 'utf8',
  });
  if (result.error) throw result.error;
  return result;
}

test('stage retains only verified prior assets and gives exact URLs immutable caching', t => {
  const root = setup(t);
  writeFileSync(join(root, 'prior', current), 'current JS');
  writeFileSync(join(root, 'prior.sha256'), checksum('prior JS', prior) + checksum('current JS', current));
  writeFileSync(join(root, 'prior', 'assets', 'index-Older123.js'), 'unlisted old JS');

  const result = run(root, 'prior', 'prior.sha256');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(join(root, 'stage', 'dist', prior), 'utf8'), 'prior JS');
  assert.equal(readFileSync(join(root, 'stage', 'dist', current), 'utf8'), 'current JS');
  assert.equal(readFileSync(join(root, 'stage', 'dist', 'index.html'), 'utf8'), 'current HTML');
  assert.equal(readFileSync(join(root, 'stage', 'dist', 'relay_core.wasm'), 'utf8'), 'current WASM');
  assert.equal(readFileSync(join(root, 'stage', 'current-assets.sha256'), 'utf8'), checksum('current JS', current));
  assert.equal(existsSync(join(root, 'stage', 'dist', 'assets', 'index-Older123.js')), false);
  assert.equal(existsSync(join(root, 'dist', prior)), false);

  const headers = JSON.parse(readFileSync(join(root, 'stage', 'firebase.json'))).hosting.headers;
  const immutable = headers.filter(rule => rule.headers.some(header => header.value.includes('immutable')));
  assert.equal(immutable.length, 2);
  for (const path of [current, prior]) {
    const rule = immutable.find(candidate => new RegExp(candidate.regex).test('/' + path));
    assert.ok(rule, path);
    assert.equal(new RegExp(rule.regex).test('/' + path + '/'), false);
  }
});

test('stage rejects a prior digest mismatch without leaving deployable output', t => {
  const root = setup(t);
  writeFileSync(join(root, 'prior', prior), 'damaged JS');
  const result = run(root, 'prior', 'prior.sha256');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /SHA-256 mismatch/);
  assert.equal(existsSync(join(root, 'stage')), false);
});

test('stage rejects different verified bytes at the same hashed URL', t => {
  const root = setup(t);
  writeFileSync(join(root, 'prior', current), 'different JS');
  writeFileSync(join(root, 'prior.sha256'), checksum('different JS', current));
  const result = run(root, 'prior', 'prior.sha256');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Hashed asset collision/);
  assert.equal(existsSync(join(root, 'stage')), false);
});

test('stage rejects a traversal entry or symlink in the archived assets', t => {
  const root = setup(t);
  writeFileSync(join(root, 'prior.sha256'), checksum('prior JS', 'assets/../index-Old12345.js'));
  const traversal = run(root, 'prior', 'prior.sha256');
  assert.equal(traversal.status, 1);
  assert.match(traversal.stderr, /Invalid or duplicate asset checksum entry/);
  assert.equal(existsSync(join(root, 'stage')), false);

  const link = 'assets/linked-Sym12345.js';
  try {
    symlinkSync(join(root, 'prior', prior), join(root, 'prior', link));
  } catch (error) {
    if (process.platform === 'win32' && error.code === 'EPERM') return;
    throw error;
  }
  writeFileSync(join(root, 'prior.sha256'), checksum('prior JS', link));
  const symlink = run(root, 'prior', 'prior.sha256');
  assert.equal(symlink.status, 1);
  assert.match(symlink.stderr, /Expected a regular file/);
  assert.equal(existsSync(join(root, 'stage')), false);
});

test('stage without a predecessor works and refuses to overwrite an existing output', t => {
  const root = setup(t);
  const first = run(root);
  assert.equal(first.status, 0, first.stderr);
  const repeat = run(root, 'prior', 'prior.sha256');
  assert.equal(repeat.status, 1);
  assert.match(repeat.stderr, /EEXIST/);
  assert.equal(readFileSync(join(root, 'stage', 'dist', current), 'utf8'), 'current JS');
  assert.equal(existsSync(join(root, 'stage', 'dist', prior)), false);
});
