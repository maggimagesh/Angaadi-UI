// The static catalogue must keep matching the live /products category list,
// every art slot must have a rendered file, and Vision must stay the default.
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import path from 'node:path'
import test, { describe } from 'node:test'
import {
  ALL_DEPARTMENT_COUNT,
  CATALOG_ARTS,
  DEPARTMENTS,
  HEADER_CATEGORIES,
  artForName,
  artUrl,
  artVariantUrl,
  placeholderFor,
  resolveDepartment,
} from '../../src/data/catalog.ts'
import { DEFAULT_THEME, THEMES, defaultAppearance } from '../../src/theme/theme.ts'

const publicDir = path.resolve(import.meta.dirname, '../../public')

// What GET /api/v1/products returns today: id → description.
const LIVE: Record<number, string> = {
  1: 'Mobiles & Tablets',
  2: 'Laptops & Computers',
  3: 'Fashion & Lifestyle',
  4: 'Home & Kitchen',
  5: 'Beauty & Personal Care',
  6: 'Books & Media',
  7: 'Sports & Fitness',
  8: 'Grocery & Gourmet',
  9: 'TVs & Appliances',
  10: 'Audio & Headphones',
}

describe('departments', () => {
  test('ids and names line up with the live category list', () => {
    assert.equal(DEPARTMENTS.length, ALL_DEPARTMENT_COUNT)
    for (const d of DEPARTMENTS) assert.equal(LIVE[d.id], d.name, `department ${d.slug}`)
  })

  test('header chips point at the live departments they are named for', () => {
    const byId = new Map(DEPARTMENTS.map((d) => [d.id, d]))
    for (const chip of HEADER_CATEGORIES) {
      const dept = byId.get(chip.id)
      assert.ok(dept, `chip ${chip.name} has a department`)
      assert.equal(dept.slug, chip.slug)
    }
  })

  test('a slug in the URL wins over a stale numeric id', () => {
    assert.equal(resolveDepartment('tvs-appliances', 3)?.id, 9)
    assert.equal(resolveDepartment(null, 4)?.slug, 'home-kitchen')
    assert.equal(resolveDepartment('smartwatches', 11)?.slug, 'mobiles-tablets')
    assert.equal(resolveDepartment('audioand-headphones', null)?.id, 10)
    assert.equal(resolveDepartment('all', null), undefined)
  })
})

describe('catalogue art', () => {
  test('every slot has a wide render and four colourways on disk', () => {
    for (const art of CATALOG_ARTS) {
      assert.ok(existsSync(path.join(publicDir, artUrl(art))), `${art}.jpg`)
      for (let v = 0; v < 4; v++) assert.ok(existsSync(path.join(publicDir, artVariantUrl(art, v))), `${art}-${v + 1}.jpg`)
    }
  })

  test('colourway index wraps and never goes negative', () => {
    assert.equal(artVariantUrl('tv', 0), '/images/catalog/tv-1.jpg')
    assert.equal(artVariantUrl('tv', 5), '/images/catalog/tv-2.jpg')
    assert.equal(artVariantUrl('tv', -1), '/images/catalog/tv-4.jpg')
  })

  test('placeholders choose the department render, then fall back on the name', () => {
    assert.equal(placeholderFor({ categoryId: 5 }), '/images/catalog/beauty.jpg')
    assert.equal(placeholderFor({ slug: 'sports-fitness' }), '/images/catalog/sports.jpg')
    assert.equal(placeholderFor({ name: 'Prestige electric kettle' }), '/images/catalog/kitchen.jpg')
    assert.equal(artForName('books & media'), '/images/catalog/books.jpg')
  })
})

describe('themes', () => {
  test('Vision is the default and opens dark; the other themes stay light', () => {
    assert.equal(DEFAULT_THEME, 'vision')
    assert.deepEqual([...THEMES], ['vision', 'apple', 'macos-27'])
    assert.equal(defaultAppearance('vision'), 'dark')
    assert.equal(defaultAppearance('apple'), 'light')
    assert.equal(defaultAppearance('macos-27'), 'light')
  })
})
