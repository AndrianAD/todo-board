import { Board } from './components/Board';
import { useBoardData } from './hooks/useBoardData';
import { isGithubWriteConfigured, isLocalMode } from './lib/githubStore';
import './App.css';

function App() {
  const { board, loading, saving, error, applyMutation, refresh } = useBoardData();

  return (
    <div className="app">
      {isLocalMode() && (
        <div className="app__banner app__banner--info">
          Локальний режим: VITE_GITHUB_OWNER/VITE_GITHUB_REPO не задані, тому дошка
          зберігається лише в localStorage цього браузера і не синхронізується з GitHub.
          Заповніть .env, щоб працювати з реальним репозиторієм.
        </div>
      )}

      {!isLocalMode() && !isGithubWriteConfigured() && (
        <div className="app__banner app__banner--warning">
          VITE_GITHUB_PAT не задано — застосунок працює лише в режимі читання. Задачі/юзерів
          не можна додавати чи переміщувати без токена з правом Contents: Read and write.
        </div>
      )}

      {error && (
        <div className="app__banner app__banner--error">
          {error}
          <button type="button" className="app__retry-btn" onClick={() => void refresh()}>
            Спробувати ще раз
          </button>
        </div>
      )}

      {loading && <div className="app__loading">Завантаження...</div>}

      {!loading && board && (
        <Board board={board} saving={saving} onMutate={(mutate) => void applyMutation(mutate)} />
      )}
    </div>
  );
}

export default App;
