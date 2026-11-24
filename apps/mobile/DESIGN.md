# DESIGN.md · Huddle Mobile

## Product

Aplicativo mobile para encontrar, criar e participar de partidas de esportes coletivos. Esta tela ajuda uma pessoa que ainda não escolheu o esporte da partida a entender por que a faixa de nível exige essa informação e a configurar o esporte antes de tentar entrar.

## Audience and voice

Pessoas no Brasil que procuram partidas casuais ou por nível, desde iniciantes até jogadores regulares. Português brasileiro, frases diretas, acolhedoras e sem jargão.

## Mood

Words: social, claro, encorajador. Never like: interface competitiva que constrange iniciantes ou visual distante do Huddle atual. (Derivado do produto e das telas existentes.)

## Brand

Design system source: `../src/theme.ts` (from this directory); the Pen guide mirrors it. Manrope, canvas `#F1F1F3`, superfícies brancas, violeta Huddle `#5947C4`, texto `#202021`. Usar componentes existentes de cabeçalho, aviso, cartão e botão.

## References

- Telas atuais de detalhes da partida, seleção de esportes e habilidades no `huddle.pen` e no código — manter tipografia, cores, cartões e navegação do Huddle; evitar criar outra linguagem visual.

## Constraints

Uma tela mobile de 390 px dentro do fluxo de detalhes da partida. Mostrar o nome do esporte e a faixa exigida. A ação principal leva à escolha do esporte e à autoavaliação; depois de salvar, retornar aos detalhes para reavaliar a compatibilidade. Deve haver retorno sem alterações, erro ao salvar e texto longo sem cortes. Respeitar áreas seguras, acessibilidade e movimento reduzido. Não sugerir geolocalização.

## Decisions log

- 2026-11-24 — Usar uma etapa de orientação antes de adicionar o esporte — explicar a exigência da faixa e preservar o contexto da partida.
- 2026-11-24 — Proposta no Pen: após salvar o esporte e as habilidades, retornar aos detalhes e revalidar a faixa; oferecer saídas distintas para compatível, fora da faixa, falha e partida indisponível.
- 2026-11-24 — Diferenciar nível inicial sem avaliações de nível recalibrado com notas recebidas; revisar autoavaliação não deve prometer compatibilidade.
- 2026-11-24 — Partida restrita exige perfil do esporte; o fluxo permite adicioná-lo, salvar habilidades e retornar aos detalhes para verificar a faixa e as vagas.

## Open questions

- A regra de nível permanece com peso 3 para a autoavaliação e peso 1 por nota recebida. Confirmar se avaliações de outras pessoas devem se tornar absolutas após a primeira nota.
