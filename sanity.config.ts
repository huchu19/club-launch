'use client'

import { CheckmarkCircleIcon } from '@sanity/icons/CheckmarkCircle'
import { visionTool } from '@sanity/vision'
import { defineConfig } from 'sanity'
import { presentationTool } from 'sanity/presentation'
import { structureTool } from 'sanity/structure'
import { apiVersion, dataset, projectId } from './sanity/env'
import { resolve } from './sanity/presentation'
import { schemaTypes } from './sanity/schemaTypes'
import { ReadinessBadge } from './sanity/components/ReadinessBadge'
import { structure } from './sanity/structure'
import { ReadinessTool } from './sanity/tools/ReadinessTool'

export default defineConfig({
  name: 'club-launch',
  title: 'Club Launch Studio',
  basePath: '/studio',
  projectId: projectId || 'unconfigured',
  dataset,
  schema: {
    types: schemaTypes,
    // Day plans are written by the site, never created by hand.
    templates: (templates) => templates.filter((t) => t.schemaType !== 'dayPlan'),
  },
  document: {
    badges: (previous, context) =>
      context.schemaType === 'clubPage' ? [...previous, ReadinessBadge] : previous,
  },
  tools: (previous) => [
    ...previous,
    {
      name: 'readiness',
      title: 'Launch readiness',
      icon: CheckmarkCircleIcon,
      component: ReadinessTool,
    },
  ],
  plugins: [
    structureTool({ structure }),
    presentationTool({
      resolve,
      previewUrl: { previewMode: { enable: '/api/draft-mode/enable' } },
    }),
    visionTool({ defaultApiVersion: apiVersion }),
  ],
})
