import { defineQuery } from 'next-sanity'

const IMAGE = `{
  "url": asset->url,
  alt,
  "width": asset->metadata.dimensions.width,
  "height": asset->metadata.dimensions.height,
  "lqip": asset->metadata.lqip
}`

const CLUB = `{
  _id,
  name,
  "slug": slug.current,
  "market": market->{ code, name, locale, currency },
  tier,
  status,
  address,
  "geo": select(defined(geo.lat) => { "lat": geo.lat, "lng": geo.lng }),
  openingHours[]{ day, opens, closes },
  phone,
  facilities[]{ name, category, description },
  spaces[]{ id, name, category, description, typicalUses, openingHours[]{ day, opens, closes } },
  schedule[]{ day, time, name, spaceId, durationMin, intensity },
  facts[]{ label, value },
  seo
}`

export const CLUB_PAGE_QUERY = defineQuery(`
  *[_type == "clubPage" && club->slug.current == $slug && club->market->code == $market]
    | order(_updatedAt desc)[0]{
    _id,
    title,
    seo,
    "club": club->${CLUB},
    blocks[]{
      ...,
      _type == "heroBlock" => { "image": image${IMAGE} },
      _type == "spaRecoveryBlock" => { items[]{ ..., "image": image${IMAGE} } }
    },
    "faqs": *[_type == "faqItem" && club._ref == ^.club._ref && status == "approved"]
      | order(askedCount desc, _createdAt asc){ _id, question, answer }
  }
`)

export const CLUB_PAGES_QUERY = defineQuery(`
  *[_type == "clubPage" && defined(club->slug.current)] | order(club->name asc){
    title,
    "clubName": club->name,
    "slug": club->slug.current,
    "market": club->market->code,
    "status": club->status,
    "tier": club->tier,
    "locality": club->address.locality,
    "summary": coalesce(seo.description, blocks[_type == "heroBlock"][0].subheading),
    "image": blocks[_type == "heroBlock"][0].image${IMAGE},
    "updatedAt": _updatedAt
  }
`)

export const CLUB_BY_SLUG_QUERY = defineQuery(
  `*[_type == "club" && slug.current == $slug][0]${CLUB}`,
)

export const CLUB_BY_ID_QUERY = defineQuery(`*[_type == "club" && _id == $id][0]${CLUB}`)

export const APPROVED_FAQS_QUERY = defineQuery(`
  *[_type == "faqItem" && club._ref == $clubId && status == "approved"]
    | order(askedCount desc){ question, answer }
`)

export const FAQ_CANDIDATES_QUERY = defineQuery(`
  *[_type == "faqItem" && club._ref == $clubId && status in ["approved", "pending"]
    && !(_id in path("drafts.**"))]{ _id, question, answer, status, normalizedQuestion }
`)

// Raw perspective: a draft club page also counts as "has a page".
export const CLUBS_WITH_PAGE_STATE_QUERY = defineQuery(`
  *[_type == "club" && !(_id in path("drafts.**"))] | order(name asc){
    _id,
    name,
    "slug": slug.current,
    "hasPage": count(*[_type == "clubPage" && club._ref == ^._id]) > 0
  }
`)

export const DAY_PLAN_QUERY = defineQuery(`
  *[_type == "dayPlan" && publicId == $publicId][0]{
    publicId,
    "clubId": club._ref,
    day,
    summary,
    stops[]{ time, spaceId, className, activity, reason },
    recommendedPlanName,
    caveats,
    chips,
    createdAt
  }
`)
