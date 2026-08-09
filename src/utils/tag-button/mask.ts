export type NotchSide = 'left' | 'right'
export type OutsetSide = NotchSide

export type TagButtonMaskParams = {
  notchSide: NotchSide
  notchDepth: number
  outsetDepth: number
  apexRadius: number
  cornerRadius: number
}

export function outsetSideFor(notchSide: NotchSide): OutsetSide {
  return notchSide === 'right' ? 'left' : 'right'
}

/**
 * Cuts a tag button into its luggage-label shape — a bite out of one end, a
 * point on the other — so one flat colour paints the whole silhouette.
 *
 * Set the result on both `mask` and `-webkit-mask`.
 */
export function buildTagButtonMask(params: TagButtonMaskParams): string {
  const { notchSide, notchDepth: n, outsetDepth: o, apexRadius: k, cornerRadius: cr } = params
  const outsetSide = outsetSideFor(notchSide)

  const notchPath = buildNotchPath({ side: notchSide, depth: n, apexRadius: k, cornerRadius: cr })
  const outsetPath = buildOutsetPath({ side: outsetSide, depth: o, apexRadius: k })

  const notchPos = notchSide === 'right' ? 'right' : 'left'
  const outsetPos = outsetSide
  const basePos = outsetSide === 'left' ? `${o}px 0` : `${n}px 0`

  const notchSvg = buildSvg(n, notchPath)
  const outsetSvg = buildSvg(o, outsetPath)
  const notchUrl = `url("data:image/svg+xml;utf8,${notchSvg}")`
  const outsetUrl = `url("data:image/svg+xml;utf8,${outsetSvg}")`

  return (
    `linear-gradient(#fff, #fff) ${basePos} / calc(100% - ${n + o}px) 100% no-repeat, ` +
    `${notchUrl} ${notchPos} 0 / ${n}px 100% no-repeat, ` +
    `${outsetUrl} ${outsetPos} 0 / ${o}px 100% no-repeat`
  )
}

function buildNotchPath(args: {
  side: NotchSide
  depth: number
  apexRadius: number
  cornerRadius: number
}): string {
  const { side, depth: n, apexRadius: k, cornerRadius: cr } = args
  const len = Math.sqrt(n * n + 0.25)
  const nux = (k * n) / len
  const nuy = (k * 0.5) / len
  const crxN = (cr * n) / len
  const cryN = (cr * 0.5) / len

  if (side === 'right') {
    return (
      `M0 0 ` +
      `L${n - cr} 0 Q${n} 0 ${n - crxN} ${cryN} ` +
      `L${nux} ${0.5 - nuy} Q0 0.5 ${nux} ${0.5 + nuy} ` +
      `L${n - crxN} ${1 - cryN} Q${n} 1 ${n - cr} 1 ` +
      `L0 1 Z`
    )
  }

  return (
    `M${cr} 0 Q0 0 ${crxN} ${cryN} ` +
    `L${n - nux} ${0.5 - nuy} Q${n} 0.5 ${n - nux} ${0.5 + nuy} ` +
    `L${crxN} ${1 - cryN} Q0 1 ${cr} 1 ` +
    `L${n} 1 L${n} 0 Z`
  )
}

function buildOutsetPath(args: { side: OutsetSide; depth: number; apexRadius: number }): string {
  const { side, depth: o, apexRadius: k } = args
  const len = Math.sqrt(o * o + 0.25)
  const oux = (k * o) / len
  const ouy = (k * 0.5) / len

  if (side === 'left') {
    return `M${o} 0 L${oux} ${0.5 - ouy} Q0 0.5 ${oux} ${0.5 + ouy} L${o} 1 Z`
  }

  return `M0 0 L${o - oux} ${0.5 - ouy} Q${o} 0.5 ${o - oux} ${0.5 + ouy} L0 1 Z`
}

function buildSvg(width: number, path: string): string {
  return (
    `<svg xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none' ` +
    `viewBox='0 0 ${width} 1' width='${width}' height='100%' shape-rendering='geometricPrecision'>` +
    `<path d='${path}' fill='white'/></svg>`
  )
}
