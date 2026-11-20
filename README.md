# Huddle

Monorepo do app Huddle com aplicativo Expo/React Native e API REST em Express, Node.js e TypeScript. A API persiste contas, partidas, participantes, quotas e avaliações em SQLite.

## Requisitos

- Node.js 22.13 ou superior (recomendado: Node 22 LTS ou 26).
- npm com suporte a workspaces.

## Instalação

```sh
npm install
```

## Desenvolvimento local

Para iniciar a API em Docker e o Expo com túnel:

```sh
npm run dev
```

O comando aguarda a rota `/api/health` ficar pronta antes de abrir o Expo. `Ctrl+C` encerra o Expo e para o container se ele tiver sido iniciado por esse comando; o volume SQLite permanece salvo.

Se preferir iniciar os processos separados, rode a API:

```sh
npm run api:dev
```

Em outro terminal, inicie o app:

```sh
npm run mobile:start
```

A API escuta em `http://localhost:4000` e inicializa o banco em `apps/api/data/huddle.sqlite`. A rota `GET /api/health` informa se a API está disponível. Para iniciar apenas a API sem watch, use `npm run api:start`.

### API em Docker

Para rodar a API e manter o SQLite persistente em um volume do Docker:

```sh
docker compose up --build -d
docker compose ps
docker compose logs -f api
```

A API fica em `http://localhost:4000`. Como o banco é SQLite, ele roda como arquivo dentro de um volume persistente, sem serviço de banco separado. O volume `huddle_sqlite_data` sobrevive a `docker compose down`.

O cliente mobile infere o host da API a partir do host do Metro e usa a porta `4000`. Configure `EXPO_PUBLIC_API_URL` somente se a API estiver em outro endereço.

### Expo Go em um celular Android

Com `npm run dev`, configure uma URL de API acessível pelo celular em `apps/mobile/.env.local`. O túnel do Expo encaminha o Metro, não a porta da API:

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.10:4000/api
```

Mantenha o computador e o celular na mesma rede e deixe a API rodando. O Expo Tunnel encaminha o bundle do app, mas não encaminha automaticamente a API local; nesse caso use um endereço de API acessível ao celular.

## Workspaces

- `apps/mobile`: app Expo, telas, componentes e cliente HTTP.
- `apps/api`: API Express, autenticação por token, regras de partidas, quotas e SQLite.

## Comandos

- `npm run dev` — inicia a API em Docker e o Expo em modo LAN.
- `npm run mobile:start` — inicia Expo Go.
- `npm run mobile:tunnel` — inicia Expo pelo túnel.
- `npm run mobile:web` — abre a versão web.
- `npm run api:dev` — API em watch mode.
- `npm run api:start` — inicia a API.
- `npm run check` — Biome: lint, formato e imports.
- `npm run typecheck` — verifica TypeScript nos dois workspaces.

## Dados

Bancos novos começam vazios. Contas e partidas criadas anteriormente permanecem no banco existente. A ativação do Huddle+ ainda é simulada; pagamentos reais precisam de integração com um provedor.

## Rotas principais

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`
- `GET/PATCH /api/me`, `PUT /api/me/sports`, `GET /api/me/usage`, `GET /api/me/matches`
- `GET /api/matches`, `GET /api/matches/:id`, `POST /api/matches`
- `POST/DELETE /api/matches/:id/join`
- Rotas de espera, aprovação, confirmação de presença, destaque e avaliações em `apps/api/src/app.ts`.
