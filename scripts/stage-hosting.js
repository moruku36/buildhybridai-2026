import {createHash} from 'node:crypto';
import {
  cpSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync,
} from 'node:fs';
import {isAbsolute, join, relative, resolve, sep} from 'node:path';

const hashedAsset = /^assets\/[A-Za-z0-9_-]+-[A-Za-z0-9_-]{8}\.[a-z0-9]+$/;
const immutable = 'public, max-age=31536000, immutable';

function regularFile(path) {
  if (!lstatSync(path).isFile()) throw new Error('Expected a regular file: ' + path);
  return readFileSync(path);
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function addAsset(assets, path, bytes, digest, current) {
  // Local staging can be case-insensitive even though Hosting URLs aren't.
  const key = path.toLowerCase();
  const existing = assets.get(key);
  if (existing && (existing.path !== path || !existing.bytes.equals(bytes))) {
    throw new Error('Hashed asset collision: ' + existing.path + ' vs ' + path);
  }
  if (!existing) assets.set(key, {path, bytes, digest, current});
}

function addArchivedAssets(assets, dist, manifest) {
  const directory = join(dist, 'assets');
  if (!lstatSync(dist).isDirectory() || !lstatSync(directory).isDirectory()) {
    throw new Error('Expected real directories for archived assets: ' + directory);
  }
  const paths = new Set();
  for (const line of regularFile(manifest).toString('utf8').trimEnd().split(/\r?\n/)) {
    const row = /^([0-9a-f]{64})  (.+)$/.exec(line);
    if (!row || !hashedAsset.test(row[2]) || paths.has(row[2])) {
      throw new Error('Invalid or duplicate asset checksum entry in ' + manifest + ': ' + line);
    }
    const [, digest, path] = row;
    paths.add(path);
    const source = join(dist, path);
    const bytes = regularFile(source);
    if (sha256(bytes) !== digest) throw new Error('SHA-256 mismatch: ' + source);
    addAsset(assets, path, bytes, digest, false);
  }
}

function stageHosting(output, archives) {
  const dist = resolve('dist');
  const outputFromDist = relative(dist, output);
  if (!outputFromDist || (!isAbsolute(outputFromDist) && outputFromDist.split(sep)[0] !== '..')) {
    throw new Error('The staging directory must be outside dist');
  }
  const stagedDist = join(output, 'dist');
  const config = JSON.parse(regularFile('firebase.json'));
  if (config.hosting.public !== 'dist') {
    throw new Error('Expected Firebase Hosting public directory to be dist');
  }

  // Reserve a fresh output directory so another invocation can't claim it.
  mkdirSync(output);
  try {
    cpSync(dist, stagedDist, {
      recursive: true,
      filter(path) {
        const entry = lstatSync(path);
        if (!entry.isDirectory() && !entry.isFile()) {
          throw new Error('Refusing to stage non-regular build path: ' + path);
        }
        return true;
      },
    });
    regularFile(join(stagedDist, 'index.html'));
    regularFile(join(stagedDist, 'relay_core.wasm'));

    const assets = new Map();
    for (const name of readdirSync(join(stagedDist, 'assets')).sort()) {
      const path = 'assets/' + name;
      if (!hashedAsset.test(path)) throw new Error('Expected a Vite hashed asset: ' + path);
      const bytes = regularFile(join(stagedDist, path));
      addAsset(assets, path, bytes, sha256(bytes), true);
    }
    const currentCount = assets.size;
    if (!currentCount) throw new Error('No current Vite assets found');

    for (let index = 0; index < archives.length; index += 2) {
      addArchivedAssets(assets, archives[index], archives[index + 1]);
    }

    const manifest = [];
    for (const {path, bytes, digest, current} of assets.values()) {
      if (current) {
        manifest.push(digest + '  ' + path);
      } else {
        writeFileSync(join(stagedDist, path), bytes, {flag: 'wx'});
      }
      config.hosting.headers.push({
        // A glob also matches a trailing slash in the emulator (a 404 here).
        regex: '^/' + path.replace('.', '\\.') + '$',
        headers: [{key: 'Cache-Control', value: immutable}],
      });
    }

    // Later releases choose their retention window, rather than carrying old assets forever.
    writeFileSync(join(output, 'current-assets.sha256'), manifest.join('\n') + '\n');
    writeFileSync(join(output, 'firebase.json'), JSON.stringify(config, null, 2) + '\n', {flag: 'wx'});
    console.log('Staged %d current and %d retained assets in %s', currentCount, assets.size - currentCount, output);
  } catch (error) {
    rmSync(output, {recursive: true, force: true});
    throw error;
  }
}

const [output, ...archives] = process.argv.slice(2);
try {
  if (!output || archives.length % 2 !== 0) {
    throw new Error('Usage: npm run stage:hosting -- <new-stage-dir> [<prior-dist> <prior-current-assets.sha256>]...');
  }
  stageHosting(resolve(output), archives);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
