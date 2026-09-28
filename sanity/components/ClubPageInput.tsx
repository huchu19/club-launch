import { WarningOutlineIcon } from '@sanity/icons/WarningOutline'
import { Card, Flex, Stack, Text } from '@sanity/ui'
import type { ObjectInputProps } from 'sanity'
import { findPlaceholders } from '../../lib/placeholders'
import { useReadiness } from '../readiness'
import { Checklist } from './Checklist'

/**
 * Wraps the club page form with a warning banner while the document still
 * contains [[placeholders]] left by the AI drafter.
 */
export function ClubPageInput(props: ObjectInputProps) {
  const placeholders = findPlaceholders(props.value)
  const unique = [...new Map(placeholders.map((p) => [p.raw, p])).values()]
  const readiness = useReadiness(props.value as Parameters<typeof useReadiness>[0])

  return (
    <Stack gap={4}>
      {unique.length > 0 ? (
        <Card tone="caution" padding={4} radius={3} border role="alert">
          <Flex gap={3} align="flex-start">
            <Text size={2}>
              <WarningOutlineIcon />
            </Text>
            <Stack gap={3}>
              <Text size={1} weight="semibold">
                {unique.length} placeholder{unique.length === 1 ? '' : 's'} to replace before
                publishing
              </Text>
              <Text size={1} muted>
                The AI drafter never invents prices, dates or numbers. Replace each value below with
                a confirmed fact.
              </Text>
              <Stack as="ul" gap={2} paddingLeft={3}>
                {unique.slice(0, 12).map((p) => (
                  <Text as="li" size={1} key={p.raw}>
                    <code>{p.raw}</code>
                  </Text>
                ))}
              </Stack>
            </Stack>
          </Flex>
        </Card>
      ) : null}
      {readiness && readiness.score < 100 ? (
        <Card tone="caution" padding={4} radius={3} border>
          <Stack gap={3}>
            <Text size={1} weight="semibold">
              Launch checklist: {readiness.score}% ready. Publishing unlocks at 100%.
            </Text>
            <Checklist checks={readiness.checks} />
          </Stack>
        </Card>
      ) : null}
      {props.renderDefault(props)}
    </Stack>
  )
}
