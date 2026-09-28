import { CheckmarkCircleIcon } from '@sanity/icons/CheckmarkCircle'
import { ClockIcon } from '@sanity/icons/Clock'
import { CloseCircleIcon } from '@sanity/icons/CloseCircle'
import { HelpCircleIcon } from '@sanity/icons/HelpCircle'
import type { StructureResolver } from 'sanity/structure'

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      S.documentTypeListItem('clubPage').title('Club pages'),
      S.documentTypeListItem('club').title('Clubs'),
      S.divider(),
      S.listItem()
        .title('FAQ')
        .icon(HelpCircleIcon)
        .child(
          S.list()
            .title('FAQ')
            .items([
              S.listItem()
                .title('Pending review')
                .icon(ClockIcon)
                .child(
                  S.documentTypeList('faqItem')
                    .title('Pending review')
                    .filter('_type == "faqItem" && status == "pending"')
                    .defaultOrdering([{ field: 'askedCount', direction: 'desc' }]),
                ),
              S.listItem()
                .title('Approved')
                .icon(CheckmarkCircleIcon)
                .child(
                  S.documentTypeList('faqItem')
                    .title('Approved')
                    .filter('_type == "faqItem" && status == "approved"'),
                ),
              S.listItem()
                .title('Rejected')
                .icon(CloseCircleIcon)
                .child(
                  S.documentTypeList('faqItem')
                    .title('Rejected')
                    .filter('_type == "faqItem" && status == "rejected"'),
                ),
              S.divider(),
              S.documentTypeListItem('faqItem').title('All FAQ items'),
            ]),
        ),
      S.divider(),
      S.documentTypeListItem('dayPlan').title('Day plans'),
      S.documentTypeListItem('foundingPlaces').title('Founding places'),
      S.documentTypeListItem('market').title('Markets'),
    ])
