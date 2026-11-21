import { validateTasks, recover } from './policy.js';

const MAX_BYTES = 32 * 1024 * 1024;

function fail(message) {
  const error = new Error(message);
  error.name = 'BoardRestoreError';
  return error;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateResult(task) {
  if (['done', 'review'].includes(task.state) && task.result == null) {
    throw fail(`Task ${task.id} in state ${task.state} must include result`);
  }

  if (task.result == null) return;

  if (!isPlainObject(task.result)) {
    throw fail(`Task ${task.id} result must be an object`);
  }

  if (typeof task.result.text !== 'string') {
    throw fail(`Task ${task.id} result.text must be a string`);
  }

  if (typeof task.result.source !== 'string' || task.result.source.trim() === '') {
    throw fail(`Task ${task.id} result.source must be a non-empty string`);
  }

  if (task.result.createdAt !== undefined && typeof task.result.createdAt !== 'string') {
    throw fail(`Task ${task.id} result.createdAt must be a string when present`);
  }
}

function parseBoardExport(parsed) {
  if (!isPlainObject(parsed)) throw fail('Invalid board export envelope');
  if (parsed.version !== 1) throw fail('Unsupported board export version');
  if (!Array.isArray(parsed.tasks)) throw fail('Board export tasks must be an array');
  if (parsed.tasks.length === 0) throw fail('Nothing to restore');

  validateTasks(parsed.tasks);

  let permissionsCleared = 0;
  let interrupted = 0;
  const tasks = parsed.tasks.map((task) => {
    const error = task.error;
    if (
      error !== null &&
      error !== undefined &&
      typeof error !== 'string' &&
      typeof error !== 'boolean' &&
      typeof error !== 'number'
    ) {
      throw fail('Invalid task error');
    }

    validateResult(task);

    if (task.state === 'running') interrupted += 1;
    if (task.mode === 'local' && !task.cloudAllowed) return task;

    permissionsCleared += 1;
    return { ...task, mode: 'local', cloudAllowed: false };
  });

  return {
    tasks: recover(tasks),
    permissionsCleared,
    interrupted,
  };
}

export async function readBoardExportFile(file) {
  if (!file) throw fail('No file selected');
  if (file.size > MAX_BYTES) throw fail('File is larger than 32 MiB');

  let buffer;
  try {
    buffer = await file.arrayBuffer();
  } catch {
    throw fail('File could not be read. Select the backup file again and retry.');
  }

  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    throw fail('File is not valid UTF-8');
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw fail('File is not valid JSON. Export a fresh board backup from the original board or choose another backup.');
  }

  return parseBoardExport(parsed);
}
