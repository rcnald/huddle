# Huddle

Aplicativo mobile em React Native, Expo e TypeScript para encontrar, organizar e avaliar partidas de esportes coletivos: futebol, basquete, vôlei, handebol e queimada.

## Rodar

```sh
npm install
npm run web:8082
```

Abra `http://localhost:8082`. Para iniciar no Expo Go, use `npm run start` e escolha iOS ou Android. O login e os dados são simulados localmente; ainda não há backend.

Se o celular não conseguir alcançar o endereço local do Metro, use `npm run start:tunnel`. O túnel requer estar conectado à conta Expo.

Conta de demonstração: `marina@exemplo.com` / `huddle123`. Na tela inicial, “Explorar o app primeiro” abre a home com partidas de exemplo.

## Fluxos

- Boas-vindas, cadastro, login e recuperação de senha.
- Onboarding de região, escolha de esportes e habilidades específicas por esporte.
- Home com próxima partida, quota semanal, destaques de 24 horas, turma e partidas abertas.
- Busca por esporte, região, data, entrada livre e compatibilidade de nível.
- Detalhes da partida, organizadora, participantes, lista de espera e mapa.
- Criação em duas etapas, com formato, lotação, faixa de nível e aprovação.
- Confirmação de presença disponível nas 24 horas antes do jogo.
- Perfil com níveis separados por esporte, partidas futuras, histórico e avaliações específicas.
- Huddle+: entradas e criações sem limite semanal, 3 destaques por semana e preenchimento automático da lista de espera.

## Regras da quota

- Plano grátis: até 3 entradas e 2 partidas criadas por semana da data do jogo.
- Sair de uma partida futura libera a entrada da quota; partidas criadas continuam contando naquela semana.
- Huddle+: remove os limites de entrada e criação. Cada destaque dura 24 horas e usa um dos 3 créditos semanais.
- Uma vaga da lista de espera pode ser oferecida até 24 horas antes do jogo. Depois disso, a organização escolhe quem entra.

## Estrutura

- `src/navigation/RootNavigator.tsx`: estado do protótipo e rotas.
- `src/screens/`: telas de entrada, partidas, perfil, criação e Huddle+.
- `src/components/`: botões, marca, cards, navegação, avatars e controles.
- `src/data/sports.ts`: esportes e critérios de habilidade.
- `src/data/fixtures.ts`: perfil e partidas de demonstração.
- `src/utils.ts`: quotas semanais, destaques, datas e níveis.

O login, pagamentos, convites e confirmações são simulados em memória; ainda não há backend nem notificações push.
