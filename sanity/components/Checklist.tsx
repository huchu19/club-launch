import { Box, Stack, Text } from '@sanity/ui'
import type { ReadinessCheck } from '../../lib/readiness/checks'

/** Each check with a tick or a cross, and what to do about failures. */
export function Checklist({ checks }: { checks: ReadinessCheck[] }) {
  return (
    <Stack as="ul" gap={3}>
      {checks.map((check) => (
        <Box as="li" key={check.id}>
          <Stack gap={2}>
            <Text size={1} weight={check.ok ? 'regular' : 'semibold'}>
              <span aria-hidden="true">{check.ok ? '✓' : '✗'}</span> <span>{check.label}</span>
              <span
                style={{
                  position: 'absolute',
                  width: 1,
                  height: 1,
                  overflow: 'hidden',
                  clip: 'rect(0 0 0 0)',
                }}
              >
                {check.ok ? ' (passed)' : ' (not yet)'}
              </span>
            </Text>
            {check.problems.map((problem) => (
              <Text key={problem} size={1} muted>
                {problem}
              </Text>
            ))}
          </Stack>
        </Box>
      ))}
    </Stack>
  )
}
