import { Octokit } from '@octokit/rest';
import type { Board } from '../types';

const GITHUB_OWNER = import.meta.env.VITE_GITHUB_OWNER as string;
const GITHUB_REPO = import.meta.env.VITE_GITHUB_REPO as string;
const GITHUB_BRANCH = (import.meta.env.VITE_GITHUB_BRANCH as string) || 'main';
const GITHUB_DATA_PATH = (import.meta.env.VITE_GITHUB_DATA_PATH as string) || 'data/board.json';
const GITHUB_PAT = import.meta.env.VITE_GITHUB_PAT as string;

const MAX_SAVE_RETRIES = 3;
const LOCAL_STORAGE_KEY = 'todo-board:local-board';
const LOCAL_SHA = 'local';

/**
 * Без VITE_GITHUB_OWNER/VITE_GITHUB_REPO застосунок ще не прив'язаний до
 * жодного репозиторію (типовий випадок локальної розробки без .env) — тоді
 * дошка живе в localStorage браузера, повністю функціональна, але не
 * синхронізована з GitHub. Це вмикається лише за відсутності конфігурації,
 * production build у CI завжди отримує ці змінні з GitHub Actions.
 */
function isGithubConfigured(): boolean {
  return Boolean(GITHUB_OWNER && GITHUB_REPO);
}

function readLocalBoard(): Board {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (raw) {
    return JSON.parse(raw) as Board;
  }
  const empty: Board = { users: [], tasks: [] };
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(empty));
  return empty;
}

function writeLocalBoard(board: Board): void {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(board));
}

function getOctokit(): Octokit {
  return new Octokit(GITHUB_PAT ? { auth: GITHUB_PAT } : {});
}

export interface BoardWithSha {
  board: Board;
  sha: string;
}

function decodeBase64Utf8(base64: string): string {
  const binary = atob(base64.replace(/\n/g, ''));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}

function encodeUtf8Base64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  return btoa(binary);
}

/**
 * Октокіт-запити для GET йшли через звичайний fetch(), який браузер міг
 * обслуговувати з локального HTTP-кешу для однакового URL — тобто наступне
 * читання після запису могло повернути ЗАСТАРІЛИЙ sha, і збереження раз за
 * разом ловило 409-конфлікт, аж поки retry не закінчувались. Тут читаємо
 * напряму через fetch з cache: 'no-store' і унікальним query-параметром,
 * щоб гарантовано отримувати актуальні дані з GitHub, а не з кешу браузера.
 */
export async function fetchBoard(): Promise<BoardWithSha> {
  if (!isGithubConfigured()) {
    return { board: readLocalBoard(), sha: LOCAL_SHA };
  }

  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_DATA_PATH}?ref=${encodeURIComponent(GITHUB_BRANCH)}&_=${Date.now()}`;

  const response = await fetch(url, {
    cache: 'no-store',
    headers: {
      Accept: 'application/vnd.github+json',
      ...(GITHUB_PAT ? { Authorization: `Bearer ${GITHUB_PAT}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Не вдалося прочитати ${GITHUB_DATA_PATH} з GitHub (HTTP ${response.status}).`);
  }

  const data = (await response.json()) as { type?: string; content?: string; sha: string };
  if (data.type !== 'file' || !data.content) {
    throw new Error(`Очікувався файл за шляхом ${GITHUB_DATA_PATH}, отримано щось інше.`);
  }

  const json = decodeBase64Utf8(data.content);
  const board = JSON.parse(json) as Board;
  return { board, sha: data.sha };
}

class SaveConflictError extends Error {
  constructor() {
    super('Конфлікт запису: board.json було змінено іншим користувачем.');
    this.name = 'SaveConflictError';
  }
}

export async function saveBoard(board: Board, sha: string): Promise<string> {
  if (!isGithubConfigured()) {
    writeLocalBoard(board);
    return LOCAL_SHA;
  }

  if (!GITHUB_PAT) {
    throw new Error(
      'Не задано VITE_GITHUB_PAT — запис у GitHub недоступний без токена (Contents: Read and write).'
    );
  }
  const octokit = getOctokit();

  try {
    const response = await octokit.repos.createOrUpdateFileContents({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: GITHUB_DATA_PATH,
      branch: GITHUB_BRANCH,
      message: 'chore: update board.json',
      content: encodeUtf8Base64(JSON.stringify(board, null, 2)),
      sha,
    });
    const newSha = response.data.content?.sha;
    if (!newSha) {
      throw new Error('GitHub API не повернув sha оновленого файлу.');
    }
    return newSha;
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 409 || status === 422) {
      throw new SaveConflictError();
    }
    throw error;
  }
}

/**
 * Читає поточний board, застосовує mutate, і зберігає. Якщо між читанням і
 * записом інший клієнт встиг закомітити board.json (409/422 на sha),
 * повторно читає найсвіжіший стан, застосовує mutate ще раз і намагається
 * зберегти знову — до MAX_SAVE_RETRIES спроб.
 */
export async function mutateBoard(
  mutate: (board: Board) => Board
): Promise<BoardWithSha> {
  let attempt = 0;
  let lastError: unknown;

  while (attempt < MAX_SAVE_RETRIES) {
    attempt += 1;
    const { board, sha } = await fetchBoard();
    const nextBoard = mutate(board);
    try {
      const newSha = await saveBoard(nextBoard, sha);
      return { board: nextBoard, sha: newSha };
    } catch (error) {
      lastError = error;
      if (!(error instanceof SaveConflictError)) {
        throw error;
      }
    }
  }

  throw lastError ?? new SaveConflictError();
}

export function isGithubWriteConfigured(): boolean {
  if (!isGithubConfigured()) return true; // локальний режим завжди дозволяє запис
  return Boolean(GITHUB_PAT);
}

export function isLocalMode(): boolean {
  return !isGithubConfigured();
}
