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

Por padrão, o app aponta para `https://huddle.rcnald.dev/api`. Para desenvolvimento local, defina `EXPO_PUBLIC_API_URL` em `apps/mobile/.env.local` antes de iniciar o Expo.

### Expo Go em um celular Android

Com `npm run dev`, configure uma URL de API acessível pelo celular em `apps/mobile/.env.local`. O túnel do Expo encaminha o Metro, não a porta da API:

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.10:4000/api
```

Mantenha o computador e o celular na mesma rede e deixe a API rodando. O Expo Tunnel encaminha o bundle do app, mas não encaminha automaticamente a API local; nesse caso use um endereço de API acessível ao celular, como `http://192.168.1.10:4000/api`.

No iPhone, configure também `EXPO_PUBLIC_API_URL` em `apps/mobile/.env.local` para um endereço acessível pelo aparelho. O túnel do Expo não encaminha a porta local da API.

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

Bancos novos começam vazios. Contas e partidas criadas anteriormente permanecem no banco existente.

O schema evolui por migrations em `apps/api/src/migrations`: `001_init.sql` é a base e as seguintes (`002_...`, `003_...`) rodam uma única vez ao iniciar a API, registradas na tabela `schema_migrations`, sem apagar dados. A migration `003_legal_acceptances.sql` armazena as versões dos termos e da política aceitas no cadastro e a data/hora do aceite.

Os textos legais atuais são transcritos do relatório técnico e ainda têm campos pendentes e cláusulas que precisam de revisão jurídica e alinhamento com as funções do MVP. O cadastro grava o aceite como `relatorio-v1`; atualize a versão quando os documentos forem revisados.

### Dados de demonstração

Para a apresentação, popule um banco **vazio** com contas, partidas, avaliações e torneios:

```sh
npm run api:seed
```

No Docker: `docker compose exec api npm run seed --workspace=@huddle/api`.

Contas criadas (senha `huddle123`): `marina@exemplo.com` (plano grátis) e `ana@exemplo.com` (Huddle+), além de outros jogadores `@exemplo.com`.

### Regras principais

- **Nível recalibrado**: cada habilidade vale `(nota declarada × 3 + soma das notas recebidas) / (3 + nº de notas)`. Esse nível libera as partidas por faixa.
- **Foto na entrada**: ao entrar numa partida, as habilidades declaradas naquele momento ficam salvas; a avaliação compara o desempenho com elas.
- **Reputação**: vem só dos votos Abaixo/Certo/Acima (`1 + 4 × % de "Certo"`).
- **Torneios (Huddle+)**: só assinantes criam e entram. O ranking não usa placar, só as notas de habilidade recebidas em torneios (média suavizada × 200, faixas Bronze/Prata/Ouro/Diamante).
- **Encerramento automático**: partidas não finalizadas fecham 24 horas após o início.
- **Organização sai = partida cancelada**.
- **Plano grátis** cria e entra em partidas sem limite; o Huddle+ (R$ 9,90/mês) libera destaques, métricas de desempenho e torneios.
- **Pagamento simulado**: `POST /api/billing/checkout` só troca o plano; não há provedor de pagamento nem coleta de dados de cartão. Em produção a rota fica desligada, a menos que `ALLOW_SIMULATED_PLUS=true`.

## Rotas principais

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`
- `GET/PATCH/DELETE /api/me`, `PUT /api/me/sports`, `GET /api/me/usage`, `GET /api/me/matches`
- `GET /api/me/metrics` (Huddle+), `GET /api/rankings/:sport` (Huddle+), `GET /api/users/:id` (perfil público)
- `GET /api/matches`, `GET /api/matches/:id`, `POST /api/matches`
- `POST/DELETE /api/matches/:id/join`, `POST /api/matches/:id/cancel`
- `POST /api/billing/checkout`, `POST /api/billing/cancel` (simulados)
- Rotas de espera, aprovação, confirmação de presença, destaque e avaliações em `apps/api/src/app.ts`.
