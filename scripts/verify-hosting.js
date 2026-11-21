import {createHash} from 'node:crypto';
import {lstatSync, readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';

function readInventory(manifest) {
  const files = new Map();
  const directories = new Set();
  const lines = readFileSync(manifest, 'utf8').replace(/\r?\n$/, '').split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    const row = /^([0-9a-f]{64})  (.+)$/.exec(line);
    if (!row) throw new Error('Invalid inventory line ' + (index + 1));

    const [, digest, path] = row;
    const parts = path.split('/');
    if (/[\\:\x00]/.test(path) || parts.some(part => !part || part === '.' || part === '..')) {
      throw new Error('Invalid inventory path: ' + path);
    }
    if (files.has(path)) throw new Error('Duplicate inventory path: ' + path);
    files.set(path, digest);
    for (let count = 1; count < parts.length; count++) {
      directories.add(parts.slice(0, count).join('/'));
    }
  }
  for (const path of ['firebase.json', 'current-assets.sha256', 'dist/index.html', 'dist/relay_core.wasm']) {
    if (!files.has(path)) throw new Error('Approved inventory lacks ' + path);
  }
  return {files, directories};
}

function* stageFiles(directory, prefix, directories) {
  for (const entry of readdirSync(directory, {withFileTypes: true})) {
    const path = prefix + entry.name;
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!directories.has(path)) throw new Error('Unexpected stage directory: ' + path);
      yield* stageFiles(absolute, path + '/', directories);
    } else {
      if (!entry.isFile()) throw new Error('Expected a regular stage file: ' + path);
      yield [path, absolute];
    }
  }
}

try {
  const args = process.argv.slice(2);
  if (args.length !== 2) {
    throw new Error('Usage: npm run verify:hosting -- <stage-dir> <approved-bundle.sha256>');
  }
  const [stage, manifest] = args;
  if (!lstatSync(stage).isDirectory()) throw new Error('Expected a real stage directory: ' + stage);
  const {files, directories} = readInventory(manifest);
  const count = files.size;
  const mismatches = [];
  for (const [path, absolute] of stageFiles(stage, '', directories)) {
    const expected = files.get(path);
    if (!expected) throw new Error('Unexpected stage file: ' + path);
    const actual = createHash('sha256').update(readFileSync(absolute)).digest('hex');
    if (actual !== expected) mismatches.push(path);
    files.delete(path);
  }
  if (files.size) throw new Error('Missing stage files: ' + [...files.keys()].join(', '));
  if (mismatches.length) throw new Error('Stage SHA-256 mismatch: ' + mismatches.join(', '));
  console.log('Verified exact Hosting stage inventory and SHA-256 (%d files): %s', count, stage);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
