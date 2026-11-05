/**
 * people-merge.mjs —— 把「按房间分开的人」并回一个人（2026-11-05 定的）
 *
 * 她原话：「人就是人，不用分房间管，所有的不同都将汇聚成一个人，
 * 所以就算不同群、私聊还是群聊，都会汇聚到那个人上。」
 *
 * 所以：同一个 QQ 号 = 同一个人，跨群跨私聊都是一个点。
 * 「在哪间说的」不删，它留在边上那句 why 里（那条 why 由建图那边写），
 * 这里的合并只做三件事：把同号的点并成一个、把边接过去、把房间分布写进 body。
 *
 * 单独放一个文件，是因为建图那边（neuron.js）正在被另一个壳改，
 * 这个改动能独立存在、也能随时并回去（它只吃 buildNeuron 的输出）。
 */
export function mergePeople(graph) {
  if (!graph || !Array.isArray(graph.nodes)) return graph
  const nodes = graph.nodes
  const edges = graph.edges || []

  const byQq = new Map()
  for (const n of nodes) {
    if (n.kind !== 'person') continue
    const qq = String(n.qq || n.subjectId || '')
    if (!qq) continue
    if (!byQq.has(qq)) byQq.set(qq, [])
    byQq.get(qq).push(n)
  }
  if (!byQq.size) return graph

  const remap = new Map()
  const merged = []
  for (const [qq, list] of byQq) {
    const id = 'person:' + qq
    // 名字：旧版标题形如「名字 · 私聊 号码」，去掉房间尾巴
    const base = String(list[0].title || qq).split(' · ')[0].trim() || qq
    let count = 0
    const rooms = new Map()
    for (const n of list) {
      count += Number(n.count || 0)
      // 新版 neuron.js 已经把房间做成属性（rooms 数组）：有就照抄，旧版才从 title 尾巴里拆
      if (Array.isArray(n.rooms) && n.rooms.length) {
        for (const r of n.rooms) {
          const label = String(r.label || r.key || '')
          if (label) rooms.set(label, (rooms.get(label) || 0) + Number(r.count || 0))
        }
      } else {
        const suffix = String(n.title || '').split(' · ')[1]
        if (suffix) rooms.set(suffix, (rooms.get(suffix) || 0) + Number(n.count || 0))
      }
      remap.set(n.id, id)
    }
    const roomText = [...rooms.entries()].sort((a, b) => b[1] - a[1]).map(([r, k]) => r + ' ' + k).join('、')
    const body = rooms.size
      ? '记到他/她 ' + count + ' 条，散在 ' + rooms.size + ' 个地方：' + roomText + '。'
      : '记到他/她 ' + count + ' 条。'
    merged.push({
      id, kind: 'person', side: 'person', qq,
      title: base, body, tags: [], at: null, count, subjectId: qq,
      rooms: [...rooms.entries()].sort((a, b) => b[1] - a[1]).map(([label, k]) => ({ key: label, label, count: k })),
    })
  }

  const keep = nodes.filter((n) => n.kind !== 'person').concat(merged)
  const seen = new Set()
  const outEdges = []
  for (const e of edges) {
    const a = remap.get(e.a) || e.a
    const b = remap.get(e.b) || e.b
    if (a === b) continue
    const key = a + '|' + b + '|' + e.kind
    if (seen.has(key)) continue
    seen.add(key)
    outEdges.push(a === e.a && b === e.b ? e : { ...e, a, b })
  }

  const stats = { ...(graph.stats || {}) }
  stats.people = merged.length
  stats.edges = outEdges.length
  const byKind = {}
  for (const e of outEdges) byKind[e.kind] = (byKind[e.kind] || 0) + 1
  stats.byKind = byKind
  const deg = new Map()
  for (const e of outEdges) {
    deg.set(e.a, (deg.get(e.a) || 0) + 1)
    deg.set(e.b, (deg.get(e.b) || 0) + 1)
  }
  stats.orphans = keep.filter((n) => !deg.get(n.id)).length
  stats.orphanRate = Math.round((stats.orphans / (keep.length || 1)) * 1000) / 10

  return { ...graph, nodes: keep, edges: outEdges, stats }
}
