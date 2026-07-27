# Todo Board

Простий Kanban-подібний todo-застосунок без сервера: колонка **Backlog** із задачами
та по одній колонці на кожного доданого юзера. Задачі перетягуються з Backlog на
юзера (drag & drop), і в кожної задачі є перемикач статусу **Opened / In progress / Done**.

Даних-бекенду немає — весь "бекенд" це файл [`data/board.json`](data/board.json) у цьому ж
репозиторії. Фронтенд читає й пише його прямо через GitHub REST (Contents) API, а
деплой сайту відбувається лише через GitHub Actions → GitHub Pages.

## Як це працює

```
Browser (React SPA на GitHub Pages)
  --GET-->  GitHub Contents API  --> data/board.json (читання, без токена)
  --PUT-->  GitHub Contents API  --> data/board.json (запис, потрібен PAT)
```

- Немає логіна користувачів — просто відкриваєте сайт і працюєте з дошкою.
- Немає realtime — застосунок періодично (кожні 15 с) перечитує `board.json`,
  плюс одразу після повернення фокусу на вкладку.
- Запис (додати задачу/юзера, перетягнути картку, змінити статус) відбувається
  комітом у `data/board.json` через GitHub API. Використовується SHA-based
  optimistic lock: якщо між читанням і записом хтось інший вже закомітив файл,
  застосунок автоматично перечитує найсвіжіший стан і повторює спробу (до 3 разів).

## Важливо: компромісний момент безпеки

Запис через GitHub API вимагає токена (Personal Access Token) з правом
`contents: write`. Оскільки в застосунку немає логіна користувачів, єдиний спосіб
дозволити запис із браузера — вбудувати цей токен у зібраний JS-бандл (через
GitHub Actions secret на етапі build, **не** в git-історію).

**Це означає: будь-хто, хто відкриє публічний сайт і подивиться JS-бандл,
технічно може дістати токен і писати в цей репозиторій** (в межах прав токена).
Прийнятно для довіреної команди/особистого використання, **не** підходить, якщо
дошка має бути відкрита для незнайомих людей в інтернеті.

Щоб мінімізувати ризик:

- Використовуйте **fine-grained PAT**, обмежений тільки цим одним репозиторієм,
  з єдиним правом **Contents: Read and write** — без доступу до інших репо чи
  інших прав (Actions, Admin, Issues тощо).
- За бажанням зробіть репозиторій приватним (GitHub Pages для приватних репо
  доступний на GitHub Pro/Team/Enterprise) — тоді токен так само буде видно
  в бандлі, але сам сайт вже не буде публічно доступним будь-кому.
- Періодично ротуйте токен.

## Локальний запуск

```bash
npm install
cp .env.example .env
# відредагуйте .env: вкажіть VITE_GITHUB_OWNER, VITE_GITHUB_REPO і, за потреби, VITE_GITHUB_PAT
npm run dev
```

Без `VITE_GITHUB_PAT` застосунок працює в режимі "тільки читання" (жовтий банер
про це) — можна переглядати дошку, але не можна додавати задачі/юзерів чи
перетягувати картки.

### Створення fine-grained PAT для локальної розробки

1. GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token.
2. Repository access: **Only select repositories** → виберіть цей репозиторій.
3. Permissions → Repository permissions → **Contents: Read and write**. Більше нічого не вмикайте.
4. Скопіюйте токен у `.env` як `VITE_GITHUB_PAT` (файл вже в `.gitignore`, не потрапить у git).

## Налаштування деплою на GitHub Pages

1. Створіть репозиторій на GitHub і запуште туди цей проєкт (branch `main`).
2. У репозиторії: Settings → Pages → Build and deployment → Source: **GitHub Actions**.
3. Створіть той самий fine-grained PAT, що й вище (Contents: Read and write, лише цей репозиторій).
4. Settings → Secrets and variables → Actions → New repository secret:
   - Name: `BOARD_WRITE_PAT`
   - Value: значення токена
5. Запуште зміни (або запустіть workflow вручну через Actions → Deploy to GitHub Pages → Run workflow).
   Workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) зібере проєкт і
   задеплоїть `dist/` на GitHub Pages. Власник/назва репозиторію підставляються
   автоматично (`github.repository_owner` / `github.event.repository.name`),
   тож нічого хардкодити не треба.
6. Сайт буде доступний за адресою `https://<ваш-юзернейм>.github.io/<назва-репо>/`.
   Якщо назва репозиторію відрізняється від `todo-board`, оновіть `base` у
   [`vite.config.ts`](vite.config.ts) відповідно.

## Модель даних (`data/board.json`)

```typescript
type TaskStatus = 'opened' | 'in_progress' | 'done';

interface User {
  id: string;
  name: string;
  color: string;
}

interface Task {
  id: string;
  title: string;
  createdAt: string;
  assigneeId: string | null; // null = в Backlog
  status: TaskStatus;
}

interface Board {
  users: User[];
  tasks: Task[];
}
```

## Стек

- React + TypeScript + Vite
- [`@dnd-kit/core`](https://dndkit.com/) — drag & drop карточок
- [`@octokit/rest`](https://github.com/octokit/rest.js) — читання/запис `data/board.json` через GitHub API

## Команди

```bash
npm run dev      # локальний dev-сервер
npm run build    # production build у dist/
npm run preview  # прев'ю production build локально
```
