import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SOURCE_REVISION = '7e720a3de062059d4c5400a379146a601d9010e0'
const SOURCE_ROOT = `https://raw.githubusercontent.com/ofrohn/d3-celestial/${SOURCE_REVISION}/data`
const SOURCE_FILES = {
  stars: `${SOURCE_ROOT}/stars.6.json`,
  lines: `${SOURCE_ROOT}/constellations.lines.json`,
  constellations: `${SOURCE_ROOT}/constellations.json`,
}

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = resolve(projectRoot, 'src/data/celestialAtlas.json')

function round(value, digits) {
  const factor = 10 ** digits
  return Math.round(Number(value) * factor) / factor
}

function compactCoordinate(coordinate) {
  return [round(coordinate[0], 4), round(coordinate[1], 4)]
}

function assertFeatureCollection(data, sourceName) {
  if (data?.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
    throw new Error(`${sourceName} 不是有效的 GeoJSON FeatureCollection`)
  }
}

async function downloadJson(url) {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`下载失败 ${response.status}: ${url}`)
  }

  return response.json()
}

function buildStars(source) {
  return source.features
    .map((feature) => {
      const [lon, lat] = feature.geometry?.coordinates ?? []
      const mag = Number(feature.properties?.mag)
      const bv = Number(feature.properties?.bv)

      if (![lon, lat, mag].every(Number.isFinite) || mag > 6) {
        return null
      }

      // 精度高于屏幕渲染需求，因此取整可显著减少首屏数据体积。
      return [round(lon, 4), round(lat, 4), round(mag, 2), Number.isFinite(bv) ? round(bv, 3) : 0]
    })
    .filter(Boolean)
}

function buildConstellations(linesSource, labelsSource) {
  const labelsById = new Map()

  for (const feature of labelsSource.features) {
    const entries = labelsById.get(feature.id) ?? []
    entries.push(feature)
    labelsById.set(feature.id, entries)
  }

  return linesSource.features.map((feature) => {
    // 巨蛇座的头、尾共用 Ser 缩写，用队列配对才不会丢掉任一部分。
    const labelFeature = labelsById.get(feature.id)?.shift()
    const label = labelFeature?.geometry?.coordinates
    const lines = feature.geometry?.coordinates

    if (!labelFeature || !Array.isArray(label) || !Array.isArray(lines)) {
      throw new Error(`星座 ${feature.id} 缺少标签或连线数据`)
    }

    return {
      id: String(feature.id),
      name: String(labelFeature.properties?.name ?? feature.id),
      rank: Number.parseInt(labelFeature.properties?.rank ?? feature.properties?.rank ?? '3', 10),
      label: compactCoordinate(label),
      lines: lines.map((line) => line.map(compactCoordinate)),
    }
  })
}

async function main() {
  // 固定从同一上游目录并发获取，既保证数据彼此匹配，也让来源可审计。
  const [starsSource, linesSource, labelsSource] = await Promise.all([
    downloadJson(SOURCE_FILES.stars),
    downloadJson(SOURCE_FILES.lines),
    downloadJson(SOURCE_FILES.constellations),
  ])

  assertFeatureCollection(starsSource, 'stars.6.json')
  assertFeatureCollection(linesSource, 'constellations.lines.json')
  assertFeatureCollection(labelsSource, 'constellations.json')

  const atlas = {
    meta: {
      source: 'https://github.com/ofrohn/d3-celestial',
      revision: SOURCE_REVISION,
      license: 'BSD-3-Clause',
      epoch: 'J2000',
    },
    stars: buildStars(starsSource),
    constellations: buildConstellations(linesSource, labelsSource),
  }

  await mkdir(dirname(outputPath), { recursive: true })
  // 该文件是可重建的机械产物，紧凑 JSON 可减少网页加载与解析成本。
  await writeFile(outputPath, `${JSON.stringify(atlas)}\n`, 'utf8')

  const bytes = Buffer.byteLength(JSON.stringify(atlas))
  console.log(`已生成 ${outputPath}`)
  console.log(`星体: ${atlas.stars.length}`)
  console.log(`星座: ${atlas.constellations.length}`)
  console.log(`体积: ${bytes} bytes`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
