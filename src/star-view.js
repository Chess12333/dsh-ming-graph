/**
 * star-view.js —— 星图视图（银河系版，2026-11-07 12:15 重写）
 *
 * 上一版把 1153 条记忆全塞进一个圆里，糊成一团。这一版按她的要求做成「银河系」：
 *
 *   核心   人 + 项目，亮、密、在正中（相当于核球）
 *   旋臂   记忆按主题（第一个 tag）分成 5 条 + 杂项 1 条，沿对数螺旋铺开，越新越靠外
 *   景深   每个点有自己的 z，投影后按深度给透明度和大小（远的暗、近的亮）
 *   时间环 最外圈一条淡环，按日期把日记钉上去，像银河盘的边缘
 *   雾     三层极淡的径向渐变 + 旋臂描边，撑出「有东西在那里」的体积感
 *
 * 数据仍然只吃统一节点模型（/neurons/unified）：画出来的每个点都能点回它自己。
 * 不自动旋转（省电、也省得画面一直在动）；拖动转、滚轮缩放，松手就停。
 */
;(function () {
  'use strict'

  const ARM_COLORS = ['#5b8def', '#14b8a6', '#e0803a', '#e05a8a', '#a78bfa', '#8b8f96']
  const KIND_COLOR = { memory: '#14b8a6', diary: '#c9cdd4', person: '#e05a8a', project: '#5b8def' }
  const ARM_COUNT = 5          // 主题臂数量，剩下的进「杂项」
  const CORE_SHARE = 0.12      // 核球占半径的比例

  const CSS = `
.sv-root{position:relative;display:flex;flex-direction:column;height:100%;min-height:0}
.sv-head{display:flex;align-items:center;gap:10px;padding:6px 12px;font-size:12px;color:var(--dsw-alias-label-tertiary);border-bottom:1px solid var(--dsw-alias-separator-secondary)}
.sv-body{flex:1;min-height:0;display:flex}
.sv-stage{flex:1;min-width:0;position:relative;overflow:hidden}
.sv-stage canvas{display:block;width:100%;height:100%;cursor:grab}
.sv-stage canvas.drag{cursor:grabbing}
.sv-side{width:280px;flex:0 0 280px;border-left:1px solid var(--dsw-alias-separator-secondary);overflow:auto;padding:10px 12px;font-size:12.5px;line-height:19px;color:var(--dsw-alias-label-secondary)}
.sv-side h4{margin:0 0 6px;font-size:13px;color:var(--dsw-alias-label-primary);font-weight:600}
.sv-side .d{color:var(--dsw-alias-label-tertiary);font-size:11.5px;margin-bottom:8px}
.sv-side .b{white-space:pre-wrap;word-break:break-word}
.sv-side .empty{color:var(--dsw-alias-label-tertiary);font-size:12px}
.sv-side .arm{margin-top:10px;font-size:11.5px;color:var(--dsw-alias-label-tertiary)}
.sv-side .arm i{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:5px}
.sv-legend{display:flex;gap:10px;align-items:center;font-size:11.5px;color:var(--dsw-alias-label-tertiary)}
.sv-legend i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:4px}
`

  // 稳定哈希：同一个 id/tag 每次都落同一条臂、同一个亮度
  function hash(s) {
    let h = 2166136261
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
    return (h >>> 0)
  }

  function mount(host, data, opts) {
    opts = opts || {}
    host.innerHTML = ''
    const root = document.createElement('div'); root.className = 'sv-root'
    const style = document.createElement('style'); style.textContent = CSS
    root.appendChild(style)

    const nodes = (data && data.nodes) || []
    const stat = (data && data.stats) || {}

    const head = document.createElement('div'); head.className = 'sv-head'
    const title = document.createElement('span')
    title.textContent = `星图 · ${stat.unified || nodes.length} 个节点 · ${stat.chapters || 0} 章 · ${stat.diaries || 0} 篇日记`
    const hint = document.createElement('span'); hint.textContent = '拖动转、滚轮缩放'; hint.style.opacity = '0.7'
    const lg = document.createElement('span'); lg.className = 'sv-legend'
    lg.innerHTML = '<span><i style="background:#14b8a6"></i>记忆</span><span><i style="background:#e05a8a"></i>人</span><span><i style="background:#5b8def"></i>项目</span><span><i style="background:#c9cdd4"></i>日记</span>'
    const spacer = document.createElement('span'); spacer.style.flex = '1'
    head.appendChild(title); head.appendChild(spacer); head.appendChild(hint); head.appendChild(lg)

    const body = document.createElement('div'); body.className = 'sv-body'
    const stage = document.createElement('div'); stage.className = 'sv-stage'
    const canvas = document.createElement('canvas')
    stage.appendChild(canvas)
    const side = document.createElement('aside'); side.className = 'sv-side'
    side.innerHTML = '<div class="empty">点一颗星看原话。</div>'
    body.appendChild(stage); body.appendChild(side)
    root.appendChild(head); root.appendChild(body)
    host.appendChild(root)

    // ---------- 分臂 ----------
    const memories = nodes.filter((n) => n.kind === 'memory')
    const cores = nodes.filter((n) => n.kind === 'person' || n.kind === 'project')
    const diaries = nodes.filter((n) => n.kind === 'diary')

    const tagCount = new Map()
    for (const n of memories) {
      const t = (n.tags && n.tags[0]) || ''
      if (!t) continue
      tagCount.set(t, (tagCount.get(t) || 0) + 1)
    }
    const topTags = [...tagCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, ARM_COUNT).map(([t]) => t)
    const armOf = new Map()
    for (const n of memories) {
      const t = (n.tags && n.tags[0]) || ''
      armOf.set(n.id, topTags.indexOf(t) >= 0 ? t : '杂项')
    }
    const armNames = topTags.concat(memories.some((n) => armOf.get(n.id) === '杂项') ? ['杂项'] : [])
    const armIndex = new Map(armNames.map((t, i) => [t, i]))
    const armColor = (name) => ARM_COLORS[(armIndex.get(name) || 0) % ARM_COLORS.length]

    const buckets = new Map(armNames.map((r) => [r, []]))
    for (const n of memories) buckets.get(armOf.get(n.id)).push(n)
    for (const [, list] of buckets) list.sort((a, b) => ((a.at || 0) - (b.at || 0)))

    let W = 0, H = 0, cx = 0, cy = 0, R = 0
    let yaw = 0.4
    let zoom = 1
    let hover = null
    let selected = null
    const pos = new Map()

    function resize() {
      const r = stage.getBoundingClientRect()
      W = Math.max(240, Math.floor(r.width))
      H = Math.max(200, Math.floor(r.height))
      canvas.width = W
      canvas.height = H
      cx = W / 2
      cy = H / 2
      R = Math.min(W, H) * 0.46
      layout()
    }

    function layout() {
      pos.clear()
      const coreR = R * CORE_SHARE
      cores.forEach((n, i) => {
        const a = i * 2.39996
        const rr = coreR * Math.sqrt((i + 0.5) / Math.max(1, cores.length))
        pos.set(n.id, { x: Math.cos(a) * rr, y: Math.sin(a) * rr * 0.55, z: 0, r: 2.6, node: n, arm: -1 })
      })

      const inner = R * CORE_SHARE * 1.25
      const outer = R * 0.95
      armNames.forEach((name, ai) => {
        const list = buckets.get(name) || []
        const start = (ai / Math.max(1, armNames.length)) * Math.PI * 2
        const span = Math.PI * 1.45
        const n = list.length || 1
        list.forEach((node, i) => {
          const t = n <= 1 ? 0.5 : (i + 0.5) / n
          const theta = start + t * span
          const jitter = (hash(node.id) % 1000) / 1000 - 0.5
          const rr = inner + (outer - inner) * Math.pow(t, 0.85) + jitter * R * 0.05
          const x = Math.cos(theta) * rr
          const y = Math.sin(theta) * rr * 0.55 + jitter * R * 0.02
          const z = ((hash(node.id + 'z') % 1000) / 1000 - 0.5) * 0.55
          pos.set(node.id, { x, y, z, r: 1.7, node, arm: ai, t })
        })
      })

      const sorted = diaries.slice().sort((a, b) => (a.date < b.date ? -1 : 1))
      const ringR = outer * 1.06
      sorted.forEach((d, i) => {
        const a = (i / Math.max(1, sorted.length)) * Math.PI * 2 - Math.PI / 2
        pos.set(d.id, { x: Math.cos(a) * ringR, y: Math.sin(a) * ringR * 0.55, z: 0.6, r: 2.2, node: d, arm: -2 })
      })
    }

    function project(p) {
      const cy1 = Math.cos(yaw), sy1 = Math.sin(yaw)
      const x1 = p.x * cy1 - p.z * R * 0.35 * sy1
      const z1 = p.x * sy1 + p.z * R * 0.35 * cy1
      const s = 1 + z1 / (R * 4)
      return { x: cx + x1 * zoom, y: cy + (p.y + z1 * 0.12) * zoom, s, z: z1 }
    }

    function draw() {
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, W, H)
      const cs = getComputedStyle(document.body)
      const dim = cs.getPropertyValue('--dsw-alias-label-tertiary') || '#888'
      const strong = cs.getPropertyValue('--dsw-alias-label-primary') || '#fff'

      // 银河雾：三层径向渐变
      ctx.save()
      ctx.globalAlpha = 0.055
      for (const k of [1, 0.6, 0.3]) {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * k * 1.2)
        g.addColorStop(0, dim)
        g.addColorStop(1, 'transparent')
        ctx.fillStyle = g
        ctx.beginPath(); ctx.arc(cx, cy, R * k * 1.2, 0, Math.PI * 2); ctx.fill()
      }
      ctx.restore()

      // 旋臂描边
      ctx.save()
      ctx.globalAlpha = 0.12
      ctx.lineWidth = 1
      armNames.forEach((name) => {
        const pts = (buckets.get(name) || []).map((n) => pos.get(n.id)).filter(Boolean).map(project)
        if (pts.length < 2) return
        ctx.strokeStyle = armColor(name)
        ctx.beginPath()
        pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
        ctx.stroke()
      })
      ctx.restore()

      // 时间环
      if (diaries.length) {
        ctx.save()
        ctx.globalAlpha = 0.1
        ctx.strokeStyle = dim
        ctx.beginPath()
        for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.05) {
          const x = cx + Math.cos(a) * R * 0.95 * 1.06 * zoom
          const y = cy + Math.sin(a) * R * 0.95 * 1.06 * 0.55 * zoom
          a ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
        }
        ctx.stroke()
        ctx.restore()
      }

      // 点：按 z 排序
      const list = []
      for (const [, p] of pos) list.push({ p, q: project(p) })
      list.sort((a, b) => a.q.z - b.q.z)

      for (const { p, q } of list) {
        const n = p.node
        const depth = Math.max(0, Math.min(1, 0.45 + (q.z / (R * 0.9)) * 0.9 + 0.45))
        const isSel = selected && selected.id === n.id
        const isHov = hover && hover.id === n.id
        let color = KIND_COLOR[n.kind] || '#888'
        if (n.kind === 'memory' && p.arm >= 0) color = armColor(armOf.get(n.id))
        const rad = (p.r + (isSel || isHov ? 2.4 : 0)) * (0.75 + depth * 0.5) * zoom
        ctx.globalAlpha = 0.35 + depth * 0.6
        ctx.beginPath(); ctx.arc(q.x, q.y, rad, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
        if (n.kind === 'person' || n.kind === 'project' || isSel) {
          ctx.globalAlpha = 0.22
          ctx.beginPath(); ctx.arc(q.x, q.y, rad * 2.6, 0, Math.PI * 2)
          ctx.fillStyle = color; ctx.fill()
        }
        if (isSel) {
          ctx.globalAlpha = 1
          ctx.strokeStyle = strong; ctx.lineWidth = 1.2
          ctx.beginPath(); ctx.arc(q.x, q.y, rad + 5, 0, Math.PI * 2); ctx.stroke()
        }
      }
      ctx.globalAlpha = 1

      ctx.save()
      ctx.globalAlpha = 0.5
      ctx.font = '11px system-ui, sans-serif'
      ctx.fillStyle = dim
      ctx.textAlign = 'center'
      ctx.fillText('核心 · 人与项目 ' + cores.length, cx, cy + R * CORE_SHARE * 0.75 + 16)
      ctx.restore()
    }

    function pick(ev) {
      const r = canvas.getBoundingClientRect()
      const x = ev.clientX - r.left
      const y = ev.clientY - r.top
      let best = null, bd = 160
      for (const [, p] of pos) {
        const q = project(p)
        const d = (q.x - x) * (q.x - x) + (q.y - y) * (q.y - y)
        if (d < bd) { bd = d; best = p }
      }
      return best
    }

    function renderSide() {
      if (!selected) { side.innerHTML = '<div class="empty">点一颗星看原话。</div>'; return }
      const n = selected.node
      const ch = n.chapterName ? `第${n.chapter}章 · ${n.chapterName}` : '未分章'
      const armName = n.kind === 'memory' ? (armOf.get(n.id) || '') : (n.kind === 'diary' ? '时间环' : '核心')
      side.innerHTML = ''
      const h4 = document.createElement('h4'); h4.textContent = n.title || '(无标题)'
      const d = document.createElement('div'); d.className = 'd'
      d.textContent = [n.date || '', ch, n.source].filter(Boolean).join(' · ')
      const b = document.createElement('div'); b.className = 'b'
      b.textContent = String(n.body || n.excerpt || '').slice(0, 1600)
      side.appendChild(h4); side.appendChild(d); side.appendChild(b)
      if (armName) {
        const a = document.createElement('div'); a.className = 'arm'
        a.innerHTML = '<i style="background:' + (n.kind === 'memory' ? armColor(armName) : (KIND_COLOR[n.kind] || '#888')) + '"></i>' + armName
        side.appendChild(a)
      }
    }

    // ---------- 交互 ----------
    let dragging = false, lastX = 0
    canvas.addEventListener('mousedown', (ev) => { dragging = true; lastX = ev.clientX; canvas.classList.add('drag') })
    window.addEventListener('mouseup', () => { dragging = false; canvas.classList.remove('drag') })
    canvas.addEventListener('mousemove', (ev) => {
      if (dragging) {
        yaw += (ev.clientX - lastX) * 0.006
        lastX = ev.clientX
        draw()
        return
      }
      const p = pick(ev)
      const id = p ? p.node.id : null
      const cur = hover ? hover.id : null
      if (id !== cur) { hover = p ? p.node : null; draw(); canvas.style.cursor = p ? 'pointer' : 'grab' }
    })
    canvas.addEventListener('click', (ev) => {
      const p = pick(ev)
      if (!p) return
      selected = p.node
      renderSide()
      draw()
    })
    canvas.addEventListener('wheel', (ev) => {
      ev.preventDefault()
      zoom = Math.max(0.45, Math.min(2.8, zoom * (ev.deltaY > 0 ? 0.92 : 1.08)))
      draw()
    }, { passive: false })

    const ro = new ResizeObserver(() => { resize(); draw() })
    ro.observe(stage)
    resize(); draw()

    return {
      destroy() { ro.disconnect(); host.innerHTML = '' },
      stats() { return { nodes: pos.size, arms: armNames.length, arms_detail: armNames, cores: cores.length, diaries: diaries.length, zoom } },
      focus(id) { const p = pos.get(id); if (p) { selected = p.node; renderSide(); draw() } },
    }
  }

  const api = { mount }
  if (typeof window !== 'undefined') window.__MingStarView = api
  if (typeof module !== 'undefined' && module.exports) module.exports = api
})()
