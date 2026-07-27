import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchBoard, mutateBoard } from '../lib/githubStore';
import type { Board } from '../types';

const POLL_INTERVAL_MS = 15_000;

interface UseBoardDataResult {
  board: Board | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  applyMutation: (mutate: (board: Board) => Board) => Promise<void>;
}

export function useBoardData(): UseBoardDataResult {
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const isSavingRef = useRef(false);
  // Кожен запит (poll-refresh чи mutation) отримує зростаючий id. Якщо поки
  // запит летів, встиг стартувати й завершитись новіший запит - результат
  // старого ігнорується, щоб застарілий poll не перезаписав щойно збережені
  // локальні зміни (гонка між polling і user-initiated записом).
  const latestRequestIdRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    const requestId = ++latestRequestIdRef.current;
    try {
      const { board: nextBoard } = await fetchBoard();
      if (!isMountedRef.current || requestId !== latestRequestIdRef.current) return;
      setBoard(nextBoard);
      setError(null);
    } catch (err) {
      if (!isMountedRef.current || requestId !== latestRequestIdRef.current) return;
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const interval = setInterval(() => {
      // Пропускаємо poll, поки триває запис - інакше застарілий GET,
      // надісланий до завершення PUT, може перезатерти щойно збережений стан.
      if (!isSavingRef.current) {
        void refresh();
      }
    }, POLL_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isSavingRef.current) {
        void refresh();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [refresh]);

  const applyMutation = useCallback(
    async (mutate: (board: Board) => Board) => {
      isSavingRef.current = true;
      setSaving(true);
      const requestId = ++latestRequestIdRef.current;
      try {
        const { board: nextBoard } = await mutateBoard(mutate);
        if (!isMountedRef.current || requestId !== latestRequestIdRef.current) return;
        setBoard(nextBoard);
        setError(null);
      } catch (err) {
        if (!isMountedRef.current) return;
        setError(err instanceof Error ? err.message : String(err));
        await refresh();
      } finally {
        isSavingRef.current = false;
        if (isMountedRef.current) setSaving(false);
      }
    },
    [refresh]
  );

  return { board, loading, saving, error, refresh, applyMutation };
}
