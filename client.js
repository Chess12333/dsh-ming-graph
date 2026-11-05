/**
 * dsh-ming-graph —— 记忆关系图 / 记忆神经元（Client 半端）
 *
 * ⚠ 这个文件是 build.mjs 生成的：改代码请改 src/neuron-view.js 与 src/panel.js，然后 `node build.mjs`。
 *
 * 入口：左侧图标栏一个图标（sidebar.panellist），点开占满主区域（main 面板 key = ming-graph）。
 * 数据来自 Host 半端 /_dsh/dsh-ming-graph/neurons，自己拉、自己画，不经过模型。
 *
 * 一条规矩：每个点都是记忆库里一条真记忆，每条边都带 why（引用 / 共词 / 归属 / 补边四种之一）。
 */

window.__ModuleLoader__.load({
  id: 'dsh-ming-graph',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useState, useEffect, useRef, useCallback } = React

/**
 * neuron-view.js —— 「记忆神经元」渲染层（纯 DOM + Canvas，不依赖 React）
 *
 * 为什么要独立成一个文件：同一个文件既进 DSH 面板（build.mjs 拼进 client.js），
 * 也能直接丢进一个空 HTML 里对着 JSON 预览。两边看到的是同一份代码，
 * 不然「预览好看、面板难看」这种事根本查不出来。
 *
 * 数据从哪来：Host 半端 buildNeuron() 算好的 { nodes, edges }，
 * 每个节点是一条真记忆，每条边带 why。这里只负责画和点，不编任何东西。
 */
;(function () {
  'use strict'

  // ---------- 小工具 ----------
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0
      let t = Math.imul(a ^ (a >>> 15), 1 | a)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  const KIND_LABEL = { project: '项目归属', ref: '内容引用', cokey: '共同关键词', adjacent: '同项目补边', subject: '讲的是谁' }
  const KIND_COLOR = { project: '#5b8def', ref: '#14b8a6', cokey: '#a855f7', adjacent: '#e0803a', subject: '#e05a8a' }

  function fmtDate(ms) {
    if (!ms) return '—'
    const d = new Date(ms)
    if (Number.isNaN(d.getTime())) return '—'
    const p = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
  }

  const CSS = `
.nv-root{display:flex;flex-direction:column;height:100%;min-height:0;box-sizing:border-box;padding:14px 18px 16px;gap:10px;color:var(--dsw-alias-label-primary);font-size:13px}
.nv-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.nv-title{font-size:15px;font-weight:600;margin:0}
.nv-meta{color:var(--dsw-alias-label-tertiary);font-size:12px}
.nv-spacer{flex:1}
.nv-input{font:inherit;font-size:12px;height:26px;padding:0 9px;width:180px;border-radius:7px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);outline:none}
.nv-input:focus{border-color:var(--dsw-alias-border-l3)}
.nv-btn{font:inherit;font-size:12px;height:26px;padding:0 10px;border-radius:7px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);cursor:pointer}
.nv-btn:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l3)}
.nv-body{flex:1;display:flex;gap:12px;min-height:0}
.nv-stage{flex:1;min-width:0;min-height:0;position:relative;border:.5px solid var(--dsw-alias-border-l2);border-radius:12px;background:radial-gradient(circle at 50% 45%,var(--dsw-alias-bg-layer-2),var(--dsw-alias-bg-layer-1) 70%);overflow:hidden;cursor:grab}
.nv-stage[data-drag="1"]{cursor:grabbing}
.nv-stage canvas{display:block;width:100%;height:100%}
.nv-legend{position:absolute;left:10px;bottom:8px;display:flex;gap:10px;flex-wrap:wrap;font-size:11px;color:var(--dsw-alias-label-tertiary);pointer-events:none}
.nv-legend i{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:4px;vertical-align:-1px}
.nv-side{width:320px;flex:none;min-height:0;display:flex;flex-direction:column;gap:10px;border:.5px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-1);padding:12px 14px;overflow:auto}
.nv-side h4{margin:0;font-size:13px;font-weight:600;line-height:19px}
.nv-kv{display:flex;justify-content:space-between;gap:8px;font-size:12px;color:var(--dsw-alias-label-secondary);padding:2px 0}
.nv-kv b{color:var(--dsw-alias-label-primary);font-weight:600}
.nv-tags{display:flex;flex-wrap:wrap;gap:5px}
.nv-chip{font-size:11px;padding:1px 7px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary)}
.nv-bodytext{margin:0;font-size:12px;line-height:19px;color:var(--dsw-alias-label-secondary);white-space:pre-wrap;word-break:break-word;max-height:190px;overflow:auto;padding:8px 10px;border-radius:8px;background:var(--dsw-alias-bg-layer-2)}
.nv-edges{display:flex;flex-direction:column;gap:6px}
.nv-edge{display:flex;flex-direction:column;gap:2px;padding:6px 8px;border-radius:8px;background:var(--dsw-alias-bg-layer-2);cursor:pointer;border:0;text-align:left;font:inherit;color:inherit}
.nv-edge:hover{outline:1px solid var(--dsw-alias-border-l3)}
.nv-edge .top{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600}
.nv-edge .why{font-size:11.5px;line-height:17px;color:var(--dsw-alias-label-tertiary)}
.nv-empty{display:flex;align-items:center;justify-content:center;height:100%;color:var(--dsw-alias-label-tertiary);font-size:13px}
.nv-err{color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px}
`

  // ---------- 布局：球壳 + 项目聚团 + 小项目上环 ----------
  function layout(nodes, edges, opts) {
    const rnd = mulberry32(20261105)
    const projects = nodes.filter((n) => n.kind === 'project')
    const members = new Map()   // projectId -> node[]
    for (const p of projects) members.set(p.id, [])
    for (const n of nodes) {
      if (n.kind !== 'memory') continue
      const pid = `project:${n.project}`
      if (!members.has(pid)) members.set(pid, [])
      members.get(pid).push(n)
    }

    const clusters = [...members.entries()].map(([pid, list]) => ({ pid, list }))
      .sort((a, b) => b.list.length - a.list.length)

    const total = Math.max(1, nodes.filter((n) => n.kind === 'memory').length)
    // 小项目不挤球面，绕外圈成环（土星环）——小簇塞进球面只会糊成一团，看不出是另一类东西
    const ringThreshold = Math.max(6, Math.round(total * 0.012))
    const shell = clusters.filter((c) => c.list.length >= ringThreshold)
    const ring = clusters.filter((c) => c.list.length < ringThreshold)

    const pos = new Map()
    const setPos = (id, x, y, z) => pos.set(id, { x, y, z })

    // 球面锚点：Fibonacci 均匀分布，大簇优先占赤道附近（视觉上最显眼）
    const GOLD = Math.PI * (3 - Math.sqrt(5))
    shell.forEach((c, i) => {
      const t = (i + 0.5) / Math.max(1, shell.length)
      const y = 1 - 2 * t
      const r = Math.sqrt(Math.max(0, 1 - y * y))
      const th = GOLD * i
      c.anchor = { x: Math.cos(th) * r, y, z: Math.sin(th) * r }
      // 大头多占地方：角半径按 sqrt(占比)
      c.theta = Math.min(0.9, Math.max(0.13, 1.15 * Math.sqrt(c.list.length / total)))
    })

    for (const c of shell) {
      const proj = nodes.find((n) => n.id === c.pid)
      if (proj) setPos(proj.id, c.anchor.x * 1.0, c.anchor.y * 1.0, c.anchor.z * 1.0)
      for (const n of c.list) {
        // 在锚点周围的球冠里撒点：cos 采样保证面上均匀
        const u = rnd()
        const cosT = 1 - u * (1 - Math.cos(c.theta))
        const sinT = Math.sqrt(Math.max(0, 1 - cosT * cosT))
        const phi = rnd() * Math.PI * 2
        // 以锚点为极点的局部坐标 → 世界坐标
        const a = c.anchor
        const up = Math.abs(a.y) > 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 }
        let e1 = { x: up.y * a.z - up.z * a.y, y: up.z * a.x - up.x * a.z, z: up.x * a.y - up.y * a.x }
        const L = Math.hypot(e1.x, e1.y, e1.z) || 1
        e1 = { x: e1.x / L, y: e1.y / L, z: e1.z / L }
        const e2 = { x: a.y * e1.z - a.z * e1.y, y: a.z * e1.x - a.x * e1.z, z: a.x * e1.y - a.y * e1.x }
        const dir = {
          x: a.x * cosT + (e1.x * Math.cos(phi) + e2.x * Math.sin(phi)) * sinT,
          y: a.y * cosT + (e1.y * Math.cos(phi) + e2.y * Math.sin(phi)) * sinT,
          z: a.z * cosT + (e1.z * Math.cos(phi) + e2.z * Math.sin(phi)) * sinT,
        }
        const r = 0.965 + rnd() * 0.07
        setPos(n.id, dir.x * r, dir.y * r, dir.z * r)
      }
    }

    // 环：小项目围一圈，半径 1.30，按项目等分角度，项目内再摊开
    if (ring.length) {
      ring.forEach((c, i) => {
        const baseA = (i / ring.length) * Math.PI * 2
        const spread = Math.min(0.26, 0.9 / ring.length)
        const proj = nodes.find((n) => n.id === c.pid)
        if (proj) setPos(proj.id, Math.cos(baseA) * 1.3, 0, Math.sin(baseA) * 1.3)
        c.list.forEach((n, k) => {
          const a = baseA + ((k + 1) / (c.list.length + 1) - 0.5) * spread
          const r = 1.3 + (rnd() - 0.5) * 0.05
          setPos(n.id, Math.cos(a) * r, (rnd() - 0.5) * 0.035, Math.sin(a) * r)
        })
      })
    }

    for (const n of nodes) if (!pos.has(n.id)) setPos(n.id, (rnd() - 0.5) * 2, (rnd() - 0.5) * 2, (rnd() - 0.5) * 2)

    // 簇内松一松：点太密就分不清，这一步是真力（斥力），不是抖随机数
    for (const c of shell) {
      const list = c.list.map((n) => pos.get(n.id))
      const minD = Math.max(0.012, (c.theta * 0.9) / Math.sqrt(Math.max(1, list.length)))
      for (let iter = 0; iter < 24; iter++) {
        for (let i = 0; i < list.length; i++) {
          const a = list[i]
          for (let j = i + 1; j < list.length; j++) {
            const b = list[j]
            const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z
            const d = Math.hypot(dx, dy, dz)
            if (d > 1e-6 && d < minD) {
              const push = ((minD - d) / d) * 0.5 * 0.9
              a.x -= dx * push; a.y -= dy * push; a.z -= dz * push
              b.x += dx * push; b.y += dy * push; b.z += dz * push
            }
          }
        }
        // 球壳约束：拉回 |r| = 1
        for (const p of list) {
          const r = Math.hypot(p.x, p.y, p.z) || 1
          const k = 1 + (1 - r) * 0.5
          p.x *= k; p.y *= k; p.z *= k
        }
      }
    }

    return { pos, ringCount: ring.reduce((s, c) => s + c.list.length, 0) }
  }

  // ---------- 视图 ----------
  function mount(host, data, opts) {
    opts = opts || {}
    host.innerHTML = ''
    const style = document.createElement('style')
    style.textContent = CSS
    host.appendChild(style)

    const root = document.createElement('div')
    root.className = 'nv-root'
    host.appendChild(root)

    const nodes = data.nodes || []
    const edges = data.edges || []
    const byId = new Map(nodes.map((n) => [n.id, n]))
    const stat = data.stats || {}

    // 头部
    const head = document.createElement('div'); head.className = 'nv-head'
    const title = document.createElement('h3'); title.className = 'nv-title'; title.textContent = '记忆神经元'
    const meta = document.createElement('span'); meta.className = 'nv-meta'
    meta.textContent = `${stat.memories || 0} 条记忆 · ${stat.projects || 0} 个项目 · ${stat.edges || 0} 条边（${Object.entries(stat.byKind || {}).map(([k, v]) => `${KIND_LABEL[k] || k} ${v}`).join(' / ')}）· 孤立 ${stat.orphans || 0}`
    const spacer = document.createElement('div'); spacer.className = 'nv-spacer'
    const search = document.createElement('input')
    search.className = 'nv-input'; search.placeholder = '搜标题 / 正文里的词'
    const reset = document.createElement('button'); reset.className = 'nv-btn'; reset.textContent = '重置视角'
    head.appendChild(title); head.appendChild(meta); head.appendChild(spacer); head.appendChild(search); head.appendChild(reset)

    const body = document.createElement('div'); body.className = 'nv-body'
    const stage = document.createElement('div'); stage.className = 'nv-stage'
    const canvas = document.createElement('canvas')
    stage.appendChild(canvas)
    const legend = document.createElement('div'); legend.className = 'nv-legend'
    legend.innerHTML = '<span><i style="background:#14b8a6"></i>DSH 记忆</span><span><i style="background:#e0803a"></i>QQ 观察</span><span><i style="background:#5b8def"></i>项目</span><span><i style="background:#e05a8a"></i>人</span>'
    stage.appendChild(legend)
    const side = document.createElement('aside'); side.className = 'nv-side'
    body.appendChild(stage); body.appendChild(side)
    root.appendChild(head); root.appendChild(body)

    // 布局
    const L = layout(nodes, edges, opts)
    const pos = L.pos

    // 邻接
    const adj = new Map()
    for (const e of edges) {
      if (!adj.has(e.a)) adj.set(e.a, [])
      if (!adj.has(e.b)) adj.set(e.b, [])
      adj.get(e.a).push(e)
      adj.get(e.b).push(e)
    }

    // 颜色（从主题里读一次，canvas 用不了 CSS 变量）
    const cs = getComputedStyle(document.body)
    const colDsh = opts.colorDsh || '#14b8a6'
    const colQq = opts.colorQq || '#e0803a'
    const colProj = opts.colorProj || '#5b8def'
    const colPerson = opts.colorPerson || '#e05a8a'
    const colDim = cs.getPropertyValue('--dsw-alias-label-tertiary') || '#888'

    // 光晕贴图（像素图，别逐帧画渐变）
    function sprite(color, size) {
      const c = document.createElement('canvas')
      c.width = c.height = size
      const g = c.getContext('2d')
      const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
      grd.addColorStop(0, color)
      grd.addColorStop(0.35, color + '88')
      grd.addColorStop(1, color + '00')
      g.fillStyle = grd
      g.fillRect(0, 0, size, size)
      return c
    }
    const SPR = 64
    const spriteDsh = sprite(colDsh, SPR)
    const spriteQq = sprite(colQq, SPR)
    const spriteProj = sprite(colProj, SPR)
    const spritePerson = sprite(colPerson, SPR)

    let W = 0, H = 0, cx = 0, cy = 0, RAD = 200
    let yaw = 0.6, pitch = -0.35, zoom = 1
    let hover = null, selected = null
    let screen = new Map()

    function resize() {
      const r = stage.getBoundingClientRect()
      // 性能红线：devicePixelRatio 钳到 1，高清屏上 4 倍像素能把单核拖满
      const dpr = 1
      W = Math.max(120, Math.floor(r.width))
      H = Math.max(120, Math.floor(r.height))
      canvas.width = Math.floor(W * dpr)
      canvas.height = Math.floor(H * dpr)
      canvas.style.width = W + 'px'
      canvas.style.height = H + 'px'
      const ctx = canvas.getContext('2d')
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      cx = W / 2; cy = H / 2
      RAD = Math.min(W, H) * 0.36
    }

    function rot(p) {
      const cyw = Math.cos(yaw), syw = Math.sin(yaw)
      const x1 = p.x * cyw + p.z * syw
      const z1 = -p.x * syw + p.z * cyw
      const cp = Math.cos(pitch), sp = Math.sin(pitch)
      const y2 = p.y * cp - z1 * sp
      const z2 = p.y * sp + z1 * cp
      return { x: x1, y: y2, z: z2 }
    }

    function project(r) {
      const f = 3.2
      const s = f / (f - r.z * 0.85)
      return { x: cx + r.x * RAD * s * zoom, y: cy - r.y * RAD * s * zoom, s, z: r.z }
    }

    function draw() {
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, W, H)
      const focus = selected || hover
      const focusEdges = focus ? new Set((adj.get(focus) || []).map((e) => e)) : null

      // 投影所有点，按 z 排序
      const pts = []
      for (const n of nodes) {
        const p = pos.get(n.id)
        if (!p) continue
        const r = rot(p)
        const q = project(r)
        pts.push({ n, q })
        screen.set(n.id, q)
      }
      pts.sort((a, b) => a.q.z - b.q.z)

      // 边：分两桶（粗 / 细），命中焦点的那几条单独画
      const strong = [], faint = []
      for (const e of edges) {
        const pa = screen.get(e.a), pb = screen.get(e.b)
        if (!pa || !pb) continue
        if (focusEdges && focusEdges.has(e)) continue
        ;(e.w >= 2.2 ? strong : faint).push([e, pa, pb])
      }
      const drawEdges = (list, color, alpha, width) => {
        if (!list.length) return
        ctx.save()
        ctx.globalAlpha = alpha
        ctx.strokeStyle = color
        ctx.lineWidth = width
        ctx.beginPath()
        for (const [, a, b] of list) {
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
        }
        ctx.stroke()
        ctx.restore()
      }
      drawEdges(faint, colDim, 0.05, 0.55)
      drawEdges(strong, colDim, 0.14, 0.9)

      // 焦点边：按类型上色
      if (focusEdges) {
        for (const e of edges) {
          if (!focusEdges.has(e)) continue
          const a = screen.get(e.a), b = screen.get(e.b)
          if (!a || !b) continue
          ctx.save()
          ctx.globalAlpha = 0.95
          ctx.strokeStyle = KIND_COLOR[e.kind] || colDim
          ctx.lineWidth = e.kind === 'project' ? 1.4 : 1.8
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
          ctx.restore()
        }
      }

      // 点：光晕贴图 + 实心核
      for (const { n, q } of pts) {
        const isProj = n.kind === 'project'
        const isPerson = n.kind === 'person'
        const isBig = isProj || isPerson
        const isFocus = focus === n.id
        const isNear = focusEdges ? (adj.get(focus) || []).some((e) => e.a === n.id || e.b === n.id) : false
        const base = isBig ? 3.2 + Math.min(3, Math.log((n.count || 1) + 1)) : 1.55
        const rad = Math.max(0.9, base * q.s)
        const sp = isPerson ? spritePerson : n.side === 'dsh' ? spriteDsh : n.side === 'qq' ? spriteQq : spriteProj
        const glow = rad * (isFocus ? 7 : isBig ? 4.2 : 3.2)
        ctx.globalAlpha = isFocus ? 0.95 : isNear ? 0.85 : isBig ? 0.7 : 0.5
        ctx.drawImage(sp, q.x - glow / 2, q.y - glow / 2, glow, glow)
        ctx.globalAlpha = isFocus ? 1 : isNear ? 1 : 0.9
        ctx.fillStyle = isPerson ? colPerson : isProj ? colProj : n.side === 'dsh' ? colDsh : colQq
        ctx.beginPath(); ctx.arc(q.x, q.y, rad, 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalAlpha = 1

      // 标签：项目名 + 焦点
      ctx.font = '11px system-ui, -apple-system, "Segoe UI", sans-serif'
      ctx.textBaseline = 'middle'
      // 标签会互相压住：先来的占位，后来的撞上就不画（悬停时单个节点仍然有标签）
      const placed = []
      const hits = (x, y, w, h) => placed.some((r) => x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y)
      const isLabelled = (n) => n.kind === 'project' || n.kind === 'person'
      const ordered = pts.slice().sort((a, b) => (isLabelled(b.n) ? 1 : 0) - (isLabelled(a.n) ? 1 : 0) ||
        (b.n.count || 0) - (a.n.count || 0))
      for (const { n, q } of ordered) {
        const isProj = isLabelled(n)
        const isPerson = n.kind === 'person'
        const isFocus = n.id === focus
        if (!isProj && !isFocus) continue
        if (isProj && !isFocus && (n.count || 0) < 3) continue
        if (q.z < -0.2 && !isFocus) continue
        if (q.x < 2 || q.x > W - 2 || q.y < 2 || q.y > H - 2) continue
        const label = isPerson ? n.title : isProj ? n.title : (n.title || '').slice(0, 16)
        const w = ctx.measureText(label).width
        const box = { x: q.x + 6, y: q.y - 8, w: w + 6, h: 16 }
        if (!isFocus && hits(box.x, box.y, box.w, box.h)) continue
        placed.push(box)
        ctx.globalAlpha = isProj ? 0.9 : 1
        ctx.fillStyle = 'rgba(0,0,0,0.45)'
        ctx.fillRect(box.x, box.y, box.w, box.h)
        ctx.fillStyle = isPerson ? '#ffd6e6' : isProj ? '#cfd8ff' : '#ffffff'
        ctx.fillText(label, q.x + 9, q.y)
      }
      ctx.globalAlpha = 1
    }

    // ---------- 详情 ----------
    function renderSide() {
      side.innerHTML = ''
      const n = selected ? byId.get(selected) : null
      if (!n) {
        const p = document.createElement('p')
        p.className = 'nv-kv'
        p.style.display = 'block'
        p.style.lineHeight = '19px'
        p.style.color = 'var(--dsw-alias-label-tertiary)'
        p.textContent = `每个点都是记忆库里的一条真记忆，不编、不插演示数据。${L.ringCount ? ` 外圈那 ${L.ringCount} 条来自小项目，被放到环上而不是挤进球面。` : ''} 悬停看连线，点开看这条的正文和每条连线凭什么连。`
        side.appendChild(p)
        return
      }
      const h = document.createElement('h4'); h.textContent = n.title || '(无标题)'
      side.appendChild(h)

      const mk = (k, v) => { const d = document.createElement('div'); d.className = 'nv-kv'; d.innerHTML = `<span>${k}</span><b>${v}</b>`; side.appendChild(d) }
      mk('来源', n.kind === 'project' ? '项目（聚合点）' : n.side === 'dsh' ? 'DSH 归档记忆' : 'QQ 观察')
      if (n.kind === 'memory') {
        mk('归类', n.projectLabel || n.project || '—')
        mk('时间', fmtDate(n.at))
        mk('ID', `<span style="font-size:11px;font-weight:400">${n.id}</span>`)
        if (n.tags && n.tags.length) {
          const row = document.createElement('div'); row.className = 'nv-tags'
          for (const t of n.tags) { const c = document.createElement('span'); c.className = 'nv-chip'; c.textContent = t; row.appendChild(c) }
          side.appendChild(row)
        }
        const pre = document.createElement('p'); pre.className = 'nv-bodytext'; pre.textContent = n.body || '(没有正文)'
        side.appendChild(pre)
      } else {
        mk('这条项目下', `${n.count || 0} 条记忆`)
      }

      const list = (adj.get(n.id) || []).slice().sort((a, b) => (b.w || 0) - (a.w || 0))
      const t = document.createElement('div')
      t.className = 'nv-kv'
      t.style.marginTop = '4px'
      t.innerHTML = `<span>连出去的边</span><b>${list.length} 条</b>`
      side.appendChild(t)
      const box = document.createElement('div'); box.className = 'nv-edges'
      for (const e of list.slice(0, 60)) {
        const otherId = e.a === n.id ? e.b : e.a
        const other = byId.get(otherId)
        if (!other) continue
        const btn = document.createElement('button')
        btn.className = 'nv-edge'
        btn.innerHTML = `<span class="top"><span style="color:${KIND_COLOR[e.kind] || '#888'}">${KIND_LABEL[e.kind] || e.kind}</span><span style="font-weight:400;color:var(--dsw-alias-label-secondary)">${(other.title || '').slice(0, 22)}</span></span><span class="why">${e.why}</span>`
        btn.onclick = () => { selected = otherId; renderSide(); draw() }
        box.appendChild(btn)
      }
      side.appendChild(box)
    }

    // ---------- 交互 ----------
    let dragging = false, moved = false, lastX = 0, lastY = 0
    function pick(x, y) {
      let best = null, bestD = 13
      for (const n of nodes) {
        const q = screen.get(n.id)
        if (!q) continue
        const d = Math.hypot(q.x - x, q.y - y)
        if (d < bestD) { bestD = d; best = n.id }
      }
      return best
    }

    canvas.addEventListener('pointerdown', (e) => {
      dragging = true; moved = false; lastX = e.clientX; lastY = e.clientY
      stage.dataset.drag = '1'
      canvas.setPointerCapture(e.pointerId)
    })
    canvas.addEventListener('pointermove', (e) => {
      const rect = canvas.getBoundingClientRect()
      if (dragging) {
        const dx = e.clientX - lastX, dy = e.clientY - lastY
        if (Math.abs(dx) + Math.abs(dy) > 2) moved = true
        yaw += dx * 0.008
        pitch += dy * 0.008   // 不设上下限：转到底还想接着转（2026-11-05 15:00 她要的）
        lastX = e.clientX; lastY = e.clientY
        schedule()
        return
      }
      const hv = pick(e.clientX - rect.left, e.clientY - rect.top)
      if (hv !== hover) { hover = hv; schedule() }
    })
    canvas.addEventListener('pointerup', (e) => {
      if (!moved) {
        const rect = canvas.getBoundingClientRect()
        const hit = pick(e.clientX - rect.left, e.clientY - rect.top)
        selected = hit
        renderSide()
      }
      dragging = false
      stage.dataset.drag = '0'
      draw()
    })
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault()
      zoom = Math.max(0.55, Math.min(3.2, zoom * (e.deltaY > 0 ? 0.92 : 1.08)))
      schedule()
    }, { passive: false })
    reset.onclick = () => { yaw = 0.6; pitch = -0.35; zoom = 1; schedule() }
    search.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return
      const q = search.value.trim().toLowerCase()
      if (!q) return
      const hit = nodes.find((n) => ((n.title || '') + ' ' + (n.body || '')).toLowerCase().includes(q))
      if (hit) { selected = hit.id; renderSide(); schedule() }
    })

    let raf = 0
    function schedule() {
      if (raf) return
      raf = requestAnimationFrame(() => { raf = 0; draw() })
    }

    const ro = new ResizeObserver(() => { resize(); schedule() })
    ro.observe(stage)
    resize()
    renderSide()
    draw()

    return {
      destroy() {
        ro.disconnect()
        if (raf) cancelAnimationFrame(raf)
        host.innerHTML = ''
      },
      select(id) { selected = id; renderSide(); draw() },
    }
  }

  const api = { mount, layout }
  if (typeof window !== 'undefined') window.__MingNeuronView = api
  if (typeof module !== 'undefined' && module.exports) module.exports = api
})()


/**
 * panel.js —— DSH 面板外壳（React 只做一件事：把 neuron-view 挂进一个 div）
 *
 * 画图、交互、点开看正文全在 neuron-view.js 里，那边不依赖 React。
 * 这样同一份代码既能跑在面板里，也能直接丢进一个空 HTML 对 JSON 预览 ——
 * 「预览好看、面板难看」这种事，就是因为两边跑的不是同一份代码。
 */

const API = '/_dsh/dsh-ming-graph'

const PAGE_CSS = `
.mg-mount{height:100%;min-height:0;display:flex;flex-direction:column;position:relative}
.mg-holder{flex:1;min-height:0;display:flex;flex-direction:column}
.mg-msg{display:flex;align-items:center;justify-content:center;height:100%;color:var(--dsw-alias-label-tertiary);font-size:13px;padding:20px;text-align:center;line-height:20px}
.mg-msg.err{color:var(--dsw-alias-state-error-primary)}
.mg-bar{display:flex;align-items:center;gap:10px;padding:6px 12px;border-bottom:1px solid var(--dsw-alias-separator-secondary);font-size:12px;color:var(--dsw-alias-label-tertiary)}
.mg-bar .mg-meta{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mg-btn{appearance:none;border:1px solid var(--dsw-alias-separator-secondary);background:transparent;color:var(--dsw-alias-label-secondary);border-radius:6px;padding:3px 10px;font-size:12px;cursor:pointer}
.mg-btn:hover:not(:disabled){color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-secondary)}
.mg-btn:disabled{opacity:.5;cursor:default}
`

// ---------------- 侧栏图标 ----------------
// sidebar.panellist 只问「图标长什么样」：owner props = { size, active }
function GraphIcon(props) {
  const s = props && typeof props.size === 'number' ? props.size : 20
  const on = !!(props && props.active)
  const color = on ? 'var(--dsw-alias-label-primary)' : 'var(--dsw-alias-label-secondary)'
  return h('svg', {
    width: s, height: s, viewBox: '0 0 20 20', fill: 'none',
    stroke: color, strokeWidth: 1.3, strokeLinecap: 'round',
    'aria-hidden': 'true', focusable: 'false',
  },
    h('line', { x1: 10, y1: 5.6, x2: 4.8, y2: 13.2 }),
    h('line', { x1: 10, y1: 5.6, x2: 15.2, y2: 13.2 }),
    h('line', { x1: 4.8, y1: 13.2, x2: 15.2, y2: 13.2, opacity: 0.5 }),
    h('circle', { cx: 10, cy: 5.6, r: 2.5, fill: color, stroke: 'none' }),
    h('circle', { cx: 4.8, cy: 13.2, r: 1.9, fill: color, stroke: 'none' }),
    h('circle', { cx: 15.2, cy: 13.2, r: 1.9, fill: color, stroke: 'none' }),
  )
}

function NeuronPanel() {
  const holder = useRef(null)
  const viewRef = useRef(null)
  const [status, setStatus] = useState('loading')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [info, setInfo] = useState(null)

  // force=false 走缓存；force=true 走 /neurons/refresh（Host 重读文件、重新加载 neuron.js）
  const load = useCallback((force) => {
    setBusy(true)
    const url = API + (force ? '/neurons/refresh' : '/neurons')
    return fetch(url, { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json() })
      .then((d) => {
        if (d && d.error) { setErr(String(d.error)); setStatus('error'); return }
        if (!window.__MingNeuronView) { setErr('渲染层没装上（neuron-view 未加载）'); setStatus('error'); return }
        if (viewRef.current && viewRef.current.destroy) viewRef.current.destroy()
        viewRef.current = window.__MingNeuronView.mount(holder.current, d, {})
        setStatus('ready')
        setErr('')
        setInfo({
          at: d.generatedAt || 0,
          memories: (d.stats && d.stats.memories) || 0,
          edges: (d.stats && d.stats.edges) || 0,
          loadError: d.neuronLoadError || '',
        })
      })
      .catch((e) => { setErr(String((e && e.message) || e)); setStatus('error') })
      .finally(() => setBusy(false))
  }, [])

  useEffect(() => {
    let alive = true
    load(false)
    return () => {
      alive = false
      if (viewRef.current && viewRef.current.destroy) { viewRef.current.destroy(); viewRef.current = null }
    }
  }, [])

  const when = info && info.at ? new Date(info.at).toLocaleTimeString('zh-CN', { hour12: false }) : ''
  const meta = info
    ? `更新于 ${when} · ${info.memories} 条记忆 / ${info.edges} 条线${info.loadError ? ' · 建图代码加载失败，用的是旧模块' : ''}`
    : ''

  return h('div', { className: 'mg-mount' },
    h('style', null, PAGE_CSS),
    h('div', { className: 'mg-bar' },
      h('span', { className: 'mg-meta' }, status === 'ready' ? meta : ''),
      h('button', {
        className: 'mg-btn',
        disabled: busy,
        title: '重读两侧记忆库，并重新加载建图代码（改了 neuron.js 也按这个就生效）',
        onClick: () => load(true),
      }, busy ? '刷新中…' : '刷新')
    ),
    h('div', { ref: holder, className: 'mg-holder', style: status === 'ready' ? null : { display: 'none' } }),
    status === 'loading' ? h('div', { className: 'mg-msg' }, '正在读两侧记忆库…（第一次要扫一遍文件，大约两秒）') : null,
    status === 'error' ? h('div', { className: 'mg-msg err' }, '读不到：' + err) : null,
  )
}

return {
  inject: ['slots'],
  apply(ctx) {
    ctx.slots.inject('main', () => ctx.slots.register({
      name: 'main',
      key: 'ming-graph',
    }, NeuronPanel))
    ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
      name: 'sidebar.panellist',
      id: 'ming-graph',
      order: 22,
      label: () => '关系图',
    }, GraphIcon))
  },
}

  },
})
