import { Text } from 'react-native';
import { AppCard, BackHeader, InlineNotice, PageTitle, ScreenScroll } from '../components/Blocks';
import { ActionButton } from '../components/Controls';
import { type LegalDocument, legalDocuments } from '../data/legal';
import { colors } from '../theme';

export function LegalScreen({ document, onBack }: { document: LegalDocument; onBack: () => void }) {
  const content = legalDocuments[document];
  return (
    <ScreenScroll>
      <BackHeader onBack={onBack} />
      <PageTitle
        title={content.title.replace(' DO APLICATIVO HUDDLE', '')}
        subtitle="Transcrito do relatório técnico."
      />
      <InlineNotice
        title="Rascunho do relatório"
        message="Este documento contém campos pendentes e condições que precisam ser verificadas e revisadas juridicamente antes do uso público."
        tone="warning"
      />
      <AppCard style={{ gap: 16 }}>
        {content.paragraphs.map((paragraph) => (
          <Text
            key={paragraph.text}
            style={{
              color: paragraph.heading ? colors.ink : colors.muted,
              fontFamily: 'Manrope',
              fontSize: paragraph.heading ? 15 : 14,
              fontWeight: paragraph.heading ? '700' : '400',
              lineHeight: 21,
            }}
          >
            {paragraph.text}
          </Text>
        ))}
      </AppCard>
      <ActionButton title="Voltar" icon="back" onPress={onBack} />
    </ScreenScroll>
  );
}
