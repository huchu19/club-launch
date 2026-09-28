import { Badge, Card, Container, Flex, Heading, Spinner, Stack, Text } from '@sanity/ui'
import { useEffect, useState } from 'react'
import { useClient } from 'sanity'
import { IntentLink } from 'sanity/router'
import { readinessChecks, readinessScore, type ReadinessCheck } from '../../lib/readiness/checks'
import { Checklist } from '../components/Checklist'
import { READINESS_API_VERSION } from '../readiness-rule'

// A Studio tool listing every club page with its launch readiness. Drafts win
// over published versions, since the draft is what would be published next.

const ALL_PAGES = `*[_type == "clubPage"]{
  _id, title, seo, blocks,
  "clubName": club->name,
  "club": club->{ openingHours, seo },
  "approvedFaqs": count(*[_type == "faqItem" && club._ref == ^.club._ref && status == "approved"
    && !(_id in path("drafts.**"))])
}`

type Row = {
  id: string
  title: string
  clubName?: string
  isDraft: boolean
  checks: ReadinessCheck[]
  score: number
}

type RawPage = {
  _id: string
  title?: string
  seo?: { title?: string; description?: string }
  blocks?: Array<{ _type?: string }>
  clubName?: string
  club?: { openingHours?: Array<{ day?: string; opens?: string; closes?: string }>; seo?: object }
  approvedFaqs: number
}

export function ReadinessTool() {
  const client = useClient({ apiVersion: READINESS_API_VERSION }).withConfig({ perspective: 'raw' })
  const [rows, setRows] = useState<Row[] | null>(null)

  useEffect(() => {
    let cancelled = false
    client.fetch<RawPage[]>(ALL_PAGES).then((pages) => {
      const byId = new Map<string, RawPage>()
      for (const page of pages) {
        const id = page._id.replace(/^drafts\./, '')
        if (page._id.startsWith('drafts.') || !byId.has(id)) byId.set(id, page)
      }
      const result = [...byId.entries()].map(([id, page]) => {
        const checks = readinessChecks({
          page,
          club: page.club,
          approvedFaqCount: page.approvedFaqs,
        })
        return {
          id,
          title: page.title ?? 'Untitled page',
          clubName: page.clubName,
          isDraft: page._id.startsWith('drafts.'),
          checks,
          score: readinessScore(checks),
        }
      })
      if (!cancelled) setRows(result.sort((a, b) => a.score - b.score))
    })
    return () => {
      cancelled = true
    }
  }, [client])

  return (
    <Container width={2} padding={5}>
      <Stack gap={5}>
        <Stack gap={3}>
          <Heading as="h1" size={3}>
            Launch readiness
          </Heading>
          <Text muted>
            A club page can be published once every check passes. Pages that need the most work are
            listed first.
          </Text>
        </Stack>
        {rows === null ? (
          <Flex justify="center" padding={5}>
            <Spinner muted />
          </Flex>
        ) : rows.length === 0 ? (
          <Text muted>No club pages yet.</Text>
        ) : (
          <Stack as="ul" gap={3}>
            {rows.map((row) => (
              <Card as="li" key={row.id} padding={4} radius={2} border>
                <Stack gap={4}>
                  <Flex justify="space-between" align="flex-start" gap={3}>
                    <Stack gap={2}>
                      <Text weight="semibold">
                        <IntentLink intent="edit" params={{ id: row.id, type: 'clubPage' }}>
                          {row.title}
                        </IntentLink>
                      </Text>
                      <Text size={1} muted>
                        {[row.clubName, row.isDraft ? 'Unpublished changes' : 'Published']
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </Stack>
                    <Badge
                      tone={row.score === 100 ? 'positive' : 'caution'}
                      fontSize={1}
                      padding={2}
                    >
                      {row.score === 100 ? 'Ready' : `${row.score}% ready`}
                    </Badge>
                  </Flex>
                  <Checklist checks={row.checks} />
                </Stack>
              </Card>
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  )
}
