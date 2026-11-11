import {copyFile} from 'node:fs/promises';
await copyFile('core/target/wasm32-unknown-unknown/release/relay_core.wasm','public/relay_core.wasm');
