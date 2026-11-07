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

// ⚠ 由 dsh-ming-ui/sync.mjs 生成，不要手改。改 C:\dsh\dsh-ming-ui\src\theme.js
/**
 * dsh-ming-ui —— 我们自己那批插件的共用皮（2026-11-07 立）
 *
 * 一条规矩：**只写 --dsw-alias-* token，不写死颜色、不写死 px 颜色值**。
 * 现在宿主是浅色，`dsh-myskin` 换主题时这些面板要跟着变；写死一个 #fff，
 * 深色底下就是一整块白。
 *
 * 为什么是这么个怪文件：各插件的 build.mjs 是「读源码文本 → 拼进 client.js」，
 * 不是真打包。所以这份源码里不能出现 import/export（拼进 CJS 工厂会炸），
 * 写成 IIFE 挂在 MING_UI 上；末尾留一句 module.exports，Node 里也能 require。
 *
 * 用法（插件里）：
 *   const MING_UI = require('./theme.js')   // 或者直接内联，同名变量已在作用域里
 *   style.textContent = MING_UI.css('ming') // 前缀用来避开宿主的同名类
 *   尺寸走 MING_UI.SCALE，颜色走 MING_UI.TOKENS.xxx
 *
 * 这一份是**唯一源**。改这里，然后 `node sync.mjs` 推到各插件的 src/theme.js。
 */
const MING_UI = (() => {
  /** 颜色：全部对到宿主的 alias token。名字按「用在哪」取，不按色值取。 */
  const TOKENS = {
    bg: 'var(--dsw-alias-bg-base)',
    surface: 'var(--dsw-alias-bg-layer-1)',
    surfaceAlt: 'var(--dsw-alias-bg-layer-2)',
    overlay: 'var(--dsw-alias-bg-overlay)',
    border: 'var(--dsw-alias-border-l2)',
    borderSoft: 'var(--dsw-alias-border-l1)',
    borderStrong: 'var(--dsw-alias-border-l3)',
    separator: 'var(--dsw-alias-separator-secondary)',
    text: 'var(--dsw-alias-label-primary)',
    textDim: 'var(--dsw-alias-label-secondary)',
    textFaint: 'var(--dsw-alias-label-tertiary)',
    accent: 'var(--dsw-alias-brand-primary)',
    hover: 'var(--dsw-alias-interactive-bg-hover)',
    active: 'var(--dsw-alias-interactive-bg-active)',
    danger: 'var(--dsw-alias-state-error-primary)',
    warn: 'var(--dsw-alias-state-warn-primary)',
    ok: 'var(--dsw-alias-state-success-primary)',
  }

  /** 尺子：间距/圆角/字号只从这里取，别在组件里现编一个 7px。 */
  const SCALE = {
    gap: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
    radius: { sm: 6, md: 10, lg: 14 },
    font: { xs: 11, sm: 12, md: 13, lg: 15, xl: 18, hero: 22 },
    line: 1.55,
  }

  /**
   * 生成一份样式表。prefix 默认 ming，用来避开宿主或其他插件的同名类。
   * 面板骨架只有六个：panel / head / card / row / stat / empty。多一个算我输。
   */
  function css(prefix) {
    const p = prefix || 'ming'
    const S = SCALE
    return `
.${p}-panel {
  display: flex; flex-direction: column; height: 100%; min-height: 0;
  background: ${TOKENS.bg}; color: ${TOKENS.text};
  font-size: ${S.font.md}px; line-height: ${S.line};
}
.${p}-head {
  display: flex; align-items: center; gap: ${S.gap.md}px;
  padding: ${S.gap.md}px ${S.gap.lg}px; border-bottom: 1px solid ${TOKENS.separator};
  flex: 0 0 auto;
}
.${p}-title { font-size: ${S.font.lg}px; font-weight: 600; color: ${TOKENS.text}; }
.${p}-sub { font-size: ${S.font.sm}px; color: ${TOKENS.textFaint}; }
.${p}-body {
  flex: 1 1 auto; min-height: 0; overflow: auto;
  padding: ${S.gap.lg}px; display: flex; flex-direction: column; gap: ${S.gap.md}px;
}
.${p}-card {
  background: ${TOKENS.surface}; border: 1px solid ${TOKENS.borderSoft};
  border-radius: ${S.radius.md}px; padding: ${S.gap.md}px ${S.gap.lg}px;
}
.${p}-row {
  display: flex; align-items: center; gap: ${S.gap.md}px;
  padding: ${S.gap.sm}px ${S.gap.md}px; border-radius: ${S.radius.sm}px;
  border-bottom: 1px solid ${TOKENS.separator};
}
.${p}-row:last-child { border-bottom: none; }
.${p}-row:hover { background: ${TOKENS.hover}; }
.${p}-stat { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.${p}-kpi { font-size: ${S.font.hero}px; font-weight: 600; color: ${TOKENS.text}; letter-spacing: -0.02em; }
.${p}-empty {
  margin: auto; padding: ${S.gap.xl}px; text-align: center;
  color: ${TOKENS.textFaint}; font-size: ${S.font.sm}px;
}
.${p}-pill {
  display: inline-flex; align-items: center; gap: ${S.gap.xs}px;
  padding: 1px 8px; border-radius: 999px; font-size: ${S.font.xs}px;
  background: ${TOKENS.surfaceAlt}; color: ${TOKENS.textDim};
  border: 1px solid ${TOKENS.borderSoft};
}
.${p}-pill[data-tone="ok"] { color: ${TOKENS.ok}; border-color: ${TOKENS.ok}; }
.${p}-pill[data-tone="warn"] { color: ${TOKENS.warn}; border-color: ${TOKENS.warn}; }
.${p}-pill[data-tone="danger"] { color: ${TOKENS.danger}; border-color: ${TOKENS.danger}; }
.${p}-btn {
  font: inherit; font-size: ${S.font.sm}px; cursor: pointer;
  padding: ${S.gap.xs}px ${S.gap.md}px; border-radius: ${S.radius.sm}px;
  background: ${TOKENS.surfaceAlt}; color: ${TOKENS.text};
  border: 1px solid ${TOKENS.border};
}
.${p}-btn:hover { background: ${TOKENS.hover}; }
.${p}-btn:active { background: ${TOKENS.active}; }
.${p}-btn[data-primary="1"] { background: ${TOKENS.accent}; color: #fff; border-color: transparent; }
.${p}-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
.${p}-scroll::-webkit-scrollbar-thumb { background: var(--dsw-alias-scrollbar-bg-l1); border-radius: 4px; }
.${p}-scroll::-webkit-scrollbar-thumb:hover { background: var(--dsw-alias-scrollbar-hover-l1); }
`
  }

  return { TOKENS, SCALE, css, version: '0.1.0' }
})()

if (typeof module !== 'undefined' && module.exports) module.exports = MING_UI


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
.nv-root{position:relative;display:flex;flex-direction:column;height:100%;width:100%;flex:1 1 auto;min-width:0;min-height:0;box-sizing:border-box;padding:14px 18px 16px;gap:10px;color:var(--dsw-alias-label-primary);font-size:13px}
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
.nv-expand{width:100%;height:30px;font-size:12.5px;font-weight:600;color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l3);background:var(--dsw-alias-bg-layer-2);border-radius:8px;cursor:pointer;font-family:inherit}
.nv-expand:hover{background:var(--dsw-alias-bg-layer-3,var(--dsw-alias-bg-layer-2))}
.nv-plane{position:absolute;inset:0;z-index:30;display:flex;flex-direction:column;background:var(--dsw-alias-bg-layer-1);border-radius:12px;box-shadow:0 12px 48px rgba(0,0,0,.3);overflow:hidden;transform-origin:50% 50%;transition:opacity .18s ease,transform .18s ease}
.nv-plane[data-fade="out"]{opacity:0;transform:scale(.985)}
.nv-plane[data-fade="in"]{opacity:0;transform:scale(.985)}
@keyframes nvRise{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
.nv-plane-head{display:flex;align-items:center;gap:8px;padding:8px 12px;flex-wrap:wrap;border-bottom:.5px solid var(--dsw-alias-border-l2)}
.nv-crumb{display:flex;align-items:center;gap:6px;min-width:0;font-size:12px;color:var(--dsw-alias-label-tertiary)}
.nv-crumb b{max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600;color:var(--dsw-alias-label-primary)}
.nv-crumb .nv-chip{cursor:pointer;border:0;font-family:inherit}
.nv-crumb .nv-chip:hover{color:var(--dsw-alias-label-primary)}
.nv-plane-body{flex:1;display:flex;min-height:0}
.nv-plane-stage{flex:1;min-width:0;position:relative;overflow:hidden;background:radial-gradient(circle at 50% 50%,var(--dsw-alias-bg-layer-2),var(--dsw-alias-bg-layer-1) 72%)}
.nv-plane-stage canvas{display:block;width:100%;height:100%}
.nv-plane-note{position:absolute;left:10px;bottom:8px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary);pointer-events:none;max-width:70%;padding:3px 7px;border-radius:6px;background:var(--dsw-alias-bg-layer-1);opacity:.86}
.nv-plane-list{width:340px;flex:none;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:6px;padding:10px 12px 16px;border-left:.5px solid var(--dsw-alias-border-l2)}
.nv-plane-list h4{margin:0 0 2px;font-size:13px;font-weight:600;line-height:19px}
.nv-grp{display:flex;align-items:center;gap:6px;margin:8px 0 0;font-size:11px;color:var(--dsw-alias-label-tertiary)}
.nv-grp i{width:7px;height:7px;border-radius:2px;flex:none}
.nv-grp b{font-weight:600;color:var(--dsw-alias-label-secondary)}
.nv-hit{display:flex;flex-direction:column;gap:2px;padding:6px 8px;border-radius:8px;border:0;background:var(--dsw-alias-bg-layer-2);cursor:pointer;text-align:left;font:inherit;color:inherit;animation:nvRise .24s ease both;transition:outline-color .12s ease}
.nv-hit:hover,.nv-hit.on{outline:1px solid var(--dsw-alias-border-l3)}
.nv-hit .top{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600}
.nv-hit .top span.t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nv-hit .top span.w{font-size:10.5px;font-weight:400;color:var(--dsw-alias-label-tertiary);flex:none}
.nv-hit .why{font-size:11.5px;line-height:17px;color:var(--dsw-alias-label-tertiary);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
`

  // ---------- 银河布局（2026-11-07，她要求「照神经元的效果做银河」） ----------
  // 不另写渲染：用的还是这套 3D 球面投影，只换坐标怎么摆。
  //   核球 = 人 + 项目（贴中心，略鼓）
  //   旋臂 = 记忆按第一个 tag 分 5 条 + 杂项，沿螺旋摊在 y≈0 的盘面上
  //   时间环 = 日记钉在外圈
  // 坐标范围跟原布局一样是 [-1,1]：RAD / 拖拽 / 侧栏 / 搜索全部复用。
  function layoutGalaxy(nodes, opts) {
    const rnd = mulberry32(20261107)
    const pos = new Map()
    const set = (id, x, y, z) => pos.set(id, { x, y, z })
    const GOLD = Math.PI * (3 - Math.sqrt(5))

    const cores = nodes.filter((n) => n.kind === 'person' || n.kind === 'project')
    const memories = nodes.filter((n) => n.kind === 'memory')
    const diaries = nodes.filter((n) => n.kind === 'diary')

    cores.forEach((n, i) => {
      const a = i * GOLD
      const r = 0.17 * Math.sqrt((i + 0.5) / Math.max(1, cores.length))
      set(n.id, Math.cos(a) * r, 0.06 + (rnd() - 0.5) * 0.12, Math.sin(a) * r)
    })

    const tagCount = new Map()
    for (const n of memories) {
      const t = (n.tags && n.tags[0]) || ''
      if (t) tagCount.set(t, (tagCount.get(t) || 0) + 1)
    }
    const topTags = [...tagCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t)
    const armOf = new Map()
    for (const n of memories) {
      const t = (n.tags && n.tags[0]) || ''
      armOf.set(n.id, topTags.indexOf(t) >= 0 ? t : '杂项')
    }
    const arms = topTags.concat(memories.some((n) => armOf.get(n.id) === '杂项') ? ['杂项'] : [])
    const buckets = new Map(arms.map((a) => [a, []]))
    for (const n of memories) buckets.get(armOf.get(n.id)).push(n)
    for (const [, list] of buckets) list.sort((a, b) => ((a.at || 0) - (b.at || 0)))

    arms.forEach((name, ai) => {
      const list = buckets.get(name) || []
      const start = (ai / Math.max(1, arms.length)) * Math.PI * 2
      const span = Math.PI * 1.35
      const n = list.length || 1
      list.forEach((node, i) => {
        const t = n <= 1 ? 0.5 : (i + 0.5) / n
        const th = start + t * span
        const rr = 0.26 + Math.pow(t, 0.82) * 0.70 + (rnd() - 0.5) * 0.05
        const thick = 0.16 * (1 - t * 0.6)
        const y = (rnd() - 0.5) * thick + (t < 0.18 ? (0.18 - t) * 0.35 : 0)
        set(node.id, Math.cos(th) * rr, y, Math.sin(th) * rr)
      })
    })

    const sorted = diaries.slice().sort((a, b) => (a.date < b.date ? -1 : 1))
    sorted.forEach((d, i) => {
      const a = (i / Math.max(1, sorted.length)) * Math.PI * 2 - Math.PI / 2
      set(d.id, Math.cos(a) * 0.99, (rnd() - 0.5) * 0.04, Math.sin(a) * 0.99)
    })

    return { pos, ringCount: 0 }
  }

  // ---------- 时间 × 主题地图（2026-11-07 13:37，她说「听你的」） ----------
  // 横轴 = 时间（最早 → 最新），纵轴 = 主题行（第一个 tag，取前 10，其余「其他」）。
  // 为什么不是天文：1153 条挤 6 条轨道，每圈 190 个点、相邻只有 7px，几何上必然糊。
  // 平面网格里每个点独占位置，而且能直接看出「哪段时间在写什么、哪段是空的」。
  // 不走 3D 旋转，由 projectAtlas 铺满画布。
  function layoutAtlas(nodes, opts) {
    const pos = new Map()
    const timed = nodes.filter((n) => n.at)
    const t0 = timed.length ? Math.min(...timed.map((n) => n.at)) : 0
    const t1 = timed.length ? Math.max(...timed.map((n) => n.at)) : 1
    const DAY = 86400000
    const days = Math.max(1, Math.floor((t1 - t0) / DAY) + 1)

    // 2026-11-07 13:45：纵轴不用「项目/主题」——量过，40 个「项目」其实全是群名，
    // 前 4 个占 72%，按它分行必然塌成一条带。数据里唯一分布均匀的维度是**来源**，
    // 所以压成 5 类：两个大群 + 浅水区 + 其他群 + 私聊/系统。
    // 横轴按「天」分桶，同一天的点叠在一列里——重叠处自然变亮，就是热力的效果。
    // 2026-11-07 22:1x：群号不进仓库（这个仓是公开的）。行名和归属由本机配置下发——
    // panel 把 /neurons 返回里的 roomLabels 挂到 window.__MING_ROOMS。
    // 没配就只剩「其他群/私聊/系统」三行，布局照旧，不崩。
    const ROOM_MAP = (typeof window !== 'undefined' && window.__MING_ROOMS) || {}
    const ROOM_ROWS = Object.keys(ROOM_MAP)
      .filter((k) => k.startsWith('group:'))
      .slice(0, 3)
      .map((k) => ({ key: k, label: String(ROOM_MAP[k] || '').replace(/^群\s*·\s*/, '') || '群' }))
    const ROWS = ROOM_ROWS.map((r) => r.label).concat(['其他群', '私聊', '系统'])
    const rowOf = new Map(ROWS.map((r, i) => [r, i]))
    const rowY = (i) => (ROWS.length <= 1 ? 0 : -1 + (i / (ROWS.length - 1)) * 2)
    // 2026-11-07 13:49：来源只能看 room（'group:<id>' 这种）。
    // projectLabel 是项目短名（ming / DSH 杂项），分不出是哪个群——用它分五行，
    // 1001 条全落进「私聊/系统」，又是一条底带。这次先量过字段值才写。
    const rowKey = (n) => {
      const room = String(n.room || '')
      const hit = ROOM_ROWS.find((r) => r.key === room)
      if (hit) return hit.label
      if (room.startsWith('group')) return '其他群'
      if (room.startsWith('private')) return '私聊'
      return '系统'
    }

    for (const n of nodes) {
      const ri = rowOf.has(rowKey(n)) ? rowOf.get(rowKey(n)) : ROWS.length - 1
      const d = n.at ? Math.floor((n.at - t0) / DAY) : 0
      const x = days <= 1 ? 0 : (d / (days - 1)) * 2 - 1
      // 稳定抖动（由 id 决定，刷新不变），让同一格里散开一点，叠起来才有疏密
      let h = 0
      for (let i = 0; i < n.id.length; i++) h = (h * 31 + n.id.charCodeAt(i)) | 0
      const jitter = ((Math.abs(h) % 11) - 5) * 0.018
      pos.set(n.id, { x, y: rowY(ri) + jitter, z: 0, row: ri })
    }
    return { pos, ringCount: 0, rows: ROWS.length, rowsDetail: ROWS, days }
  }


  // ---------- 太阳系布局（2026-11-07 13:25，她说「想要太阳系那种，不是银河系」） ----------
  // 同心轨道，从里往外：
  //   0.18  人（最内圈，离太阳最近）
  //   0.32  项目
  //   0.50 起，每个主题（第一个 tag）一条轨道，向外递增
  //   最外  日记（时间环）
  // 每条轨道上的点均分角度，加一点抖动；y 是盘面厚度。3D 投影转起来就是一圈圈绕。
  function layoutSolar(nodes, opts) {
    const rnd = mulberry32(20261107)
    const pos = new Map()
    const set = (id, x, y, z) => pos.set(id, { x, y, z })

    const people = nodes.filter((n) => n.kind === 'person')
    const projects = nodes.filter((n) => n.kind === 'project')
    const memories = nodes.filter((n) => n.kind === 'memory')
    const diaries = nodes.filter((n) => n.kind === 'diary')

    const orbit = (list, radius, spread) => {
      const n = list.length || 1
      list.forEach((node, i) => {
        const a = (i / n) * Math.PI * 2 + (rnd() - 0.5) * 0.12
        const r = radius + (rnd() - 0.5) * 0.012
        set(node.id, Math.cos(a) * r, (rnd() - 0.5) * (spread || 0.03), Math.sin(a) * r)
      })
    }

    orbit(people, 0.18, 0.02)
    orbit(projects, 0.32, 0.03)

    // 记忆按主题分轨：出现最多的 6 个 tag 各一条，其余「杂项」
    const tagCount = new Map()
    for (const n of memories) {
      const t = (n.tags && n.tags[0]) || ''
      if (t) tagCount.set(t, (tagCount.get(t) || 0) + 1)
    }
    const topTags = [...tagCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([t]) => t)
    const armOf = new Map()
    for (const n of memories) {
      const t = (n.tags && n.tags[0]) || ''
      armOf.set(n.id, topTags.indexOf(t) >= 0 ? t : '杂项')
    }
    const rings = topTags.concat(memories.some((n) => armOf.get(n.id) === '杂项') ? ['杂项'] : [])
    const buckets = new Map(rings.map((k) => [k, []]))
    for (const n of memories) buckets.get(armOf.get(n.id)).push(n)
    for (const [, list] of buckets) list.sort((a, b) => ((a.at || 0) - (b.at || 0)))

    rings.forEach((name, i) => {
      const radius = 0.50 + i * 0.075
      orbit(buckets.get(name) || [], Math.min(radius, 0.93), 0.035)
    })

    orbit(diaries, 1.0, 0.012)
    return { pos, ringCount: 0, rings: rings.length }
  }

  // ---------- 布局：球壳 + 项目聚团 + 小项目上环 ----------
  function layout(nodes, edges, opts) {
    if (opts && opts.mode === 'atlas') return layoutAtlas(nodes, opts)
    if (opts && opts.mode === 'solar') return layoutSolar(nodes, opts)
    if (opts && opts.mode === 'galaxy') return layoutGalaxy(nodes, opts)
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
    const title = document.createElement('h3'); title.className = 'nv-title'; title.textContent = opts.title || '记忆神经元'
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

    // 边类型筛选（2026-11-07 top 栏加的入口）：
    // 按 Host 给的 e.kind 分类，**不按 why 文本里有没有那几个字**——
    // why 是给人读的一句话（「这条内存的归类标签是…」「这条记忆的主语是…」），
    // 里面根本没有「归属」「补边」这些词，按文本匹配会把一大半边丢进「其他」。
    const WAY_KINDS = ['引用', '共词', '归属', '补边', '主语']
    const KIND_TO_WAY = { ref: '引用', cokey: '共词', project: '归属', adjacent: '补边', subject: '主语' }
    const whyType = (e) => KIND_TO_WAY[(e && e.kind) || ''] || '其他'
    let wayOn = new Set(WAY_KINDS)
    const liveEdges = () => edges.filter((e) => wayOn.has(whyType(e)))

    // 邻接
    let adj = new Map()
    function recalcAdj() {
      adj = new Map()
      for (const e of liveEdges()) {
        if (!adj.has(e.a)) adj.set(e.a, [])
        if (!adj.has(e.b)) adj.set(e.b, [])
        adj.get(e.a).push(e)
        adj.get(e.b).push(e)
      }
    }
    recalcAdj()

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
    // 2026-11-07：日记（星图时间环用）自己的灰，不然会落进 QQ 那档橙色
    const colDiary = opts.colorDiary || '#c9cdd4'
    const spriteDiary = sprite(colDiary, SPR)

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
      // 2026-11-07 13:09：**不再写内联 style.width/height**。
      // CSS 里 `.nv-stage canvas{width:100%;height:100%}` 已经管显示尺寸；
      // 再写一次像素值会让「设尺寸 → 布局变 → ResizeObserver 再触发」变成循环，
      // 每轮 canvas.width= 都会清空画布——画完立刻被下一次 resize 抹掉，屏幕上就是空的。
      // 证据：诊断里 W=801 而 canvas.width=802，两个测量值在同一帧里对不上，就是抖动。
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

    // 2026-11-07 13:38：atlas（时间×主题地图）是平面图，不走 3D 旋转，
    // 直接铺满画布宽高；其余模式照旧。
    function projectAtlas(p) {
      return { x: cx + p.x * (W * 0.46), y: cy + p.y * (H * 0.44), s: 1, z: 0 }
    }
    const projPoint = (p) => (opts && opts.mode === 'atlas' ? projectAtlas(p) : project(rot(p)))

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
        const q = projPoint(p)
        pts.push({ n, q })
        screen.set(n.id, q)
      }
      pts.sort((a, b) => a.q.z - b.q.z)

      // 边：分两桶（粗 / 细），命中焦点的那几条单独画
      const strong = [], faint = []
      for (const e of liveEdges()) {
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
        for (const e of liveEdges()) {
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
        // 被检索叫起过的记忆会长大一点：hot 已经含了「隔了多少次检索」的衰减
        const hotBoost = isBig ? 0 : Math.min(1.6, (n.hot || 0) * 0.9)
        const base = isBig ? 3.2 + Math.min(3, Math.log((n.count || 1) + 1)) : 1.55 + hotBoost
        const rad = Math.max(0.9, base * q.s)
        const sp = isPerson ? spritePerson : n.kind === 'diary' ? spriteDiary : n.side === 'dsh' ? spriteDsh : n.side === 'qq' ? spriteQq : spriteProj
        const glow = rad * (isFocus ? 7 : isBig ? 4.2 : 3.2)
        // 越新越亮（2026-11-07，借自星汐）：老记忆只是变暗，不会消失。
        // at 是毫秒时间戳；项目和人是聚合节点（at 为 null），不参与衰减。
        const fresh = (() => {
          if (isBig || !n.at) return 1
          const age = Date.now() - n.at
          const FULL = 7 * 864e5 // 一周内满亮
          const OLD = 120 * 864e5 // 四个月外最暗
          if (age <= FULL) return 1
          if (age >= OLD) return 0.42
          return 1 - 0.58 * ((age - FULL) / (OLD - FULL))
        })()
        ctx.globalAlpha = (isFocus ? 0.95 : isNear ? 0.85 : isBig ? 0.7 : 0.5) * fresh
        ctx.drawImage(sp, q.x - glow / 2, q.y - glow / 2, glow, glow)
        ctx.globalAlpha = (isFocus ? 1 : isNear ? 1 : 0.9) * fresh
        ctx.fillStyle = isPerson ? colPerson : isProj ? colProj : n.kind === 'diary' ? colDiary : n.side === 'dsh' ? colDsh : colQq
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
      // 2026-11-07 13:03：面板上那句「没图」查了五轮还没定位。把 draw 的关键数字直接写出来：
      // 有坐标没点数、有点数没坐标、或者坐标落到画布外，三种答案互斥，一看就分得开。
      if (opts.__debug) {
        const p0 = pts[0]
        try {
          window.__NV_DEBUG = {
            mode: opts.mode || 'default', nodes: nodes.length, posN: pos.size, ptsN: pts.length,
            W, H, cx, cy, RAD,
            first: p0 ? { id: String(p0.n.id).slice(0, 18), x: Math.round(p0.q.x), y: Math.round(p0.q.y), s: Number((p0.q.s || 0).toFixed(2)) } : null,
          }
        } catch (e) { window.__NV_DEBUG = { err: String((e && e.message) || e) } }
      }
    }

    // ---------- 平面展开：以一个点为心，把所有相关摊在一个平面上 ----------
    // 球面那个视图只回答了「谁和谁连着」；这里回答「这条记忆到底和哪些东西有关、各凭什么」。
    const KIND_ORDER = ['project', 'subject', 'ref', 'cokey', 'adjacent']
    let plane = null

    function planeGroups(id) {
      const map = new Map()
      for (const e of (adj.get(id) || [])) {
        const other = byId.get(e.a === id ? e.b : e.a)
        if (!other || other.id === id) continue
        const k = e.kind || 'other'
        if (!map.has(k)) map.set(k, [])
        map.get(k).push({ e: e, node: other })
      }
      const out = [...map.entries()]
      out.sort((x, y) => {
        const ix = KIND_ORDER.indexOf(x[0]), iy = KIND_ORDER.indexOf(y[0])
        return (ix < 0 ? 99 : ix) - (iy < 0 ? 99 : iy)
      })
      return out
    }

    // 扇区按类分（同类挨在一起），组内按环排：弧长 34px 一个点，放不下换下一环
    function layoutPlane(groups, Wp, Hp) {
      const total = groups.reduce((s, g) => s + g[1].length, 0)
      const cx = Wp / 2, cy = Hp / 2
      const R0 = Math.max(104, Math.min(Wp, Hp) * 0.185)
      const FULL = Math.PI * 2 * 0.94
      const out = []
      let a = -Math.PI / 2
      for (const [kind, list] of groups) {
        const share = total ? list.length / total : 1 / Math.max(1, groups.length)
        const span = Math.max(0.5, FULL * share)
        const a0 = a + 0.03, a1 = a + span - 0.03
        a += span
        const sorted = list.slice().sort((x, y) => (y.e.w || 0) - (x.e.w || 0))
        let i = 0, r = R0
        while (i < sorted.length) {
          const step = 34 / r
          const cap = Math.max(1, Math.floor(Math.max(0.2, a1 - a0) / step))
          const n = Math.min(cap, sorted.length - i)
          for (let j = 0; j < n; j++) {
            const t = n === 1 ? 0.5 : j / (n - 1)
            const ang = a0 + (a1 - a0) * t
            out.push({ node: sorted[i + j].node, e: sorted[i + j].e, kind: kind, ang: ang, r: r })
          }
          i += n
          r += 58
        }
      }
      let maxR = 0
      for (const it of out) maxR = Math.max(maxR, it.r)
      const limit = Math.max(90, Math.min(Wp, Hp) / 2 - 34)
      const k = maxR > limit ? limit / maxR : 1
      for (const it of out) {
        it.r *= k
        it.x = cx + Math.cos(it.ang) * it.r
        it.y = cy + Math.sin(it.ang) * it.r
      }
      return { cx: cx, cy: cy, items: out }
    }

    function buildPlane() {
      const el = document.createElement('div'); el.className = 'nv-plane'; el.style.display = 'none'

      const head = document.createElement('div'); head.className = 'nv-plane-head'
      const crumb = document.createElement('div'); crumb.className = 'nv-crumb'
      const title = document.createElement('span'); title.className = 'nv-meta'; title.textContent = '平面展开'
      const filter = document.createElement('input')
      filter.className = 'nv-input'; filter.placeholder = '在这个网里过滤（标题 / 理由）'; filter.style.width = '200px'
      const sp = document.createElement('div'); sp.className = 'nv-spacer'
      const close = document.createElement('button'); close.className = 'nv-btn'; close.textContent = '关闭 Esc'
      head.appendChild(title); head.appendChild(crumb); head.appendChild(sp); head.appendChild(filter); head.appendChild(close)

      const bodyEl = document.createElement('div'); bodyEl.className = 'nv-plane-body'
      const stageEl = document.createElement('div'); stageEl.className = 'nv-plane-stage'
      const cv = document.createElement('canvas')
      const note = document.createElement('div'); note.className = 'nv-plane-note'
      stageEl.appendChild(cv); stageEl.appendChild(note)
      const list = document.createElement('aside'); list.className = 'nv-plane-list'
      bodyEl.appendChild(stageEl); bodyEl.appendChild(list)
      el.appendChild(head); el.appendChild(bodyEl)
      root.appendChild(el)

      const p = { el: el, cv: cv, ctx: cv.getContext('2d'), stage: stageEl, list: list, crumb: crumb, note: note,
        filter: filter, center: null, stack: [], groups: [], layout: null, hl: null, q: '', anim: null, raf: 0 }
      plane = p

      close.onclick = () => closePlane()
      filter.oninput = () => { p.q = filter.value.trim(); refreshPlane() }
      cv.addEventListener('pointermove', (ev) => {
        const rect = cv.getBoundingClientRect()
        const hit = pickPlane(ev.clientX - rect.left, ev.clientY - rect.top)
        cv.style.cursor = hit ? 'pointer' : 'default'
        if (p.hl !== (hit ? hit.node.id : null)) {
          p.hl = hit ? hit.node.id : null
          drawPlane()
          for (const b of list.querySelectorAll('.nv-hit')) b.classList.toggle('on', b.dataset.id === p.hl)
        }
      })
      cv.addEventListener('pointerup', (ev) => {
        const rect = cv.getBoundingClientRect()
        const hit = pickPlane(ev.clientX - rect.left, ev.clientY - rect.top)
        if (hit) goPlane(hit.node.id)
      })
      p.onKey = (ev) => { if (ev.key === 'Escape' && plane && plane.el.style.display !== 'none') closePlane() }
      document.addEventListener('keydown', p.onKey)
      const ro = new ResizeObserver(() => { if (plane.el.style.display !== 'none') drawPlane() })
      ro.observe(stageEl)
      p.ro = ro
      return p
    }

    function pickPlane(x, y) {
      const p = plane
      // 展开动画还没跑完时点不中（点都还在飞）
      if (!p || !p.layout || p.anim) return null
      let best = null, bestD = 14
      for (const it of p.layout.items) {
        const d = Math.hypot(it.x - x, it.y - y)
        if (d < bestD) { bestD = d; best = it }
      }
      return best
    }

    // 让这个圈从中心往外长出来。减少动效的系统偏好下直接给最终状态。
    function startPlaneAnim(p) {
      const reduce = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      // 调试钩子：window.__MING_PLANE_ANIM_MS 可以把这个时长改长，方便截中间帧
      const dbg = typeof window !== 'undefined' ? window.__MING_PLANE_ANIM_MS : null
      const dur = reduce ? 0 : (typeof dbg === 'number' ? dbg : 460)
      p.anim = { start: (typeof performance !== 'undefined' ? performance.now() : Date.now()), dur: dur }
    }

    function openPlane(id) {
      if (!byId.get(id)) return
      if (!plane) buildPlane()
      plane.stack = []
      plane.center = id
      plane.q = ''; plane.filter.value = ''
      plane.hl = null
      const el = plane.el
      el.style.display = 'flex'
      el.dataset.fade = 'in'
      void el.offsetWidth                // 先把起始态刷进去，过渡才跑得出来
      delete el.dataset.fade
      startPlaneAnim(plane)
      refreshPlane()
      // 面板刚显示时有布局过渡，量两遍尺寸
      requestAnimationFrame(() => refreshPlane())
    }

    function closePlane() {
      if (!plane) return
      const p = plane
      p.el.dataset.fade = 'out'
      p.anim = null
      p.hl = null
      setTimeout(() => {
        if (p.el.dataset.fade !== 'out') return
        p.el.style.display = 'none'
        delete p.el.dataset.fade
      }, 180)
    }

    function goPlane(id) {
      const p = plane
      if (!p || !byId.get(id)) return
      if (id !== p.center) p.stack.push(p.center)
      p.center = id
      p.q = ''; p.filter.value = ''
      p.hl = null
      startPlaneAnim(p)
      refreshPlane()
    }

    function planeBack() {
      const p = plane
      const prev = p.stack.pop()
      if (prev) { p.center = prev; p.q = ''; p.filter.value = ''; p.hl = null; startPlaneAnim(p); refreshPlane() }
    }

    function refreshPlane() {
      const p = plane
      const n = byId.get(p.center)
      if (!n) return
      const groups = planeGroups(p.center)
      const q = p.q.toLowerCase()
      p.groups = groups
        .map((g) => [g[0], q ? g[1].filter((x) => (((x.node.title || '') + ' ' + (x.node.body || '') + ' ' + (x.e.why || '')).toLowerCase().indexOf(q) >= 0)) : g[1]])
        .filter((g) => g[1].length > 0)
      renderPlaneCrumb(n)
      renderPlaneList(n, groups)
      drawPlane()
    }

    function renderPlaneCrumb(n) {
      const p = plane
      p.crumb.innerHTML = ''
      if (p.stack.length) {
        const back = document.createElement('button'); back.className = 'nv-chip'; back.textContent = '← 返回'
        back.onclick = planeBack
        p.crumb.appendChild(back)
      }
      const seen = p.stack.slice(-3)
      for (const id of seen) {
        const s = byId.get(id)
        if (!s) continue
        const b = document.createElement('button'); b.className = 'nv-chip'
        b.textContent = (s.title || '(无标题)').slice(0, 12)
        b.onclick = () => goPlane(id)
        p.crumb.appendChild(b)
      }
      const b = document.createElement('b'); b.textContent = (n.title || '(无标题)')
      p.crumb.appendChild(b)
    }

    function renderPlaneList(n, allGroups) {
      const p = plane
      const list = p.list
      list.innerHTML = ''
      const h = document.createElement('h4'); h.textContent = n.title || '(无标题)'
      list.appendChild(h)

      const kindRow = document.createElement('div'); kindRow.className = 'nv-kv'
      kindRow.innerHTML = '<span>来源</span><b>' + (n.kind === 'project' ? '项目（聚合点）' : n.kind === 'person' ? '人' : n.side === 'dsh' ? 'DSH 归档记忆' : 'QQ 观察') + '</b>'
      list.appendChild(kindRow)
      if (n.kind === 'project') {
        const r = document.createElement('div'); r.className = 'nv-kv'
        r.innerHTML = '<span>这条项目下</span><b>' + (n.count || 0) + ' 条记忆</b>'
        list.appendChild(r)
      } else if (n.at) {
        const r = document.createElement('div'); r.className = 'nv-kv'
        r.innerHTML = '<span>时间</span><b>' + fmtDate(n.at) + '</b>'
        list.appendChild(r)
      }
      if (n.kind === 'memory' && n.heat > 0) {
        const r = document.createElement('div'); r.className = 'nv-kv'
        const when = n.lastRecalledAt ? '（最近 ' + fmtDate(Date.parse(n.lastRecalledAt)) + '）' : ''
        r.innerHTML = '<span>被召唤</span><b>' + n.heat + ' 次' + when + '</b>'
        list.appendChild(r)
      }
      if (n.tags && n.tags.length) {
        const row = document.createElement('div'); row.className = 'nv-tags'
        for (const t of n.tags) { const c = document.createElement('span'); c.className = 'nv-chip'; c.textContent = t; row.appendChild(c) }
        list.appendChild(row)
      }
      if (n.body) {
        const pre = document.createElement('p'); pre.className = 'nv-bodytext'; pre.textContent = n.body
        list.appendChild(pre)
      }

      const totalAll = allGroups.reduce((s, g) => s + g[1].length, 0)
      const totalShown = p.groups.reduce((s, g) => s + g[1].length, 0)
      const cnt = document.createElement('div'); cnt.className = 'nv-kv'
      cnt.style.marginTop = '4px'
      cnt.innerHTML = '<span>相关</span><b>' + (p.q ? totalShown + ' / ' + totalAll + ' 条' : totalAll + ' 条') + '</b>'
      list.appendChild(cnt)

      for (const [kind, items] of p.groups) {
        const gh = document.createElement('div'); gh.className = 'nv-grp'
        gh.innerHTML = '<i style="background:' + (KIND_COLOR[kind] || '#888') + '"></i><b>' + (KIND_LABEL[kind] || kind) + '</b> ' + items.length + ' 条'
        list.appendChild(gh)
        const sorted = items.slice().sort((x, y) => (y.e.w || 0) - (x.e.w || 0))
        for (const it of sorted) {
          const b = document.createElement('button'); b.className = 'nv-hit'
          b.dataset.id = it.node.id
          // 一条条淡上来，最多错开前 14 条（再多就只是慢，不是好看）
          if (sorted.indexOf(it) < 14) b.style.animationDelay = (sorted.indexOf(it) * 16) + 'ms'
          const top = document.createElement('span'); top.className = 'top'
          const t = document.createElement('span'); t.className = 't'; t.textContent = it.node.title || '(无标题)'
          const w = document.createElement('span'); w.className = 'w'; w.textContent = '权重 ' + (it.e.w || 1).toFixed(1)
          top.appendChild(t); top.appendChild(w)
          const why = document.createElement('span'); why.className = 'why'; why.textContent = it.e.why || ''
          b.appendChild(top); b.appendChild(why)
          b.onclick = () => goPlane(it.node.id)
          b.onmouseenter = () => { p.hl = it.node.id; drawPlane() }
          b.onmouseleave = () => { p.hl = null; drawPlane() }
          list.appendChild(b)
        }
      }
      if (!totalShown) {
        const e = document.createElement('p'); e.className = 'nv-kv'; e.style.display = 'block'
        e.textContent = p.q ? '没有匹配的相关条目。' : '这条没有任何连线（孤立点）。'
        list.appendChild(e)
      }
    }

    function drawPlane() {
      const p = plane
      if (!p || p.el.style.display === 'none' || !p.center) return
      const rect = p.stage.getBoundingClientRect()
      const Wp = Math.max(160, Math.floor(rect.width))
      const Hp = Math.max(160, Math.floor(rect.height))
      if (p.cv.width !== Wp || p.cv.height !== Hp) {
        p.cv.width = Wp; p.cv.height = Hp
        p.cv.style.width = Wp + 'px'; p.cv.style.height = Hp + 'px'
      }
      const ctx = p.ctx
      ctx.clearRect(0, 0, Wp, Hp)
      const lay = layoutPlane(p.groups, Wp, Hp)
      p.layout = lay
      const hl = p.hl

      // 展开进度：0 时所有点挤在中心，1 是最终位置
      let t = 1
      if (p.anim) {
        const nowT = typeof performance !== 'undefined' ? performance.now() : Date.now()
        const dur = p.anim.dur
        t = dur <= 0 ? 1 : Math.min(1, (nowT - p.anim.start) / dur)
        t = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2   // easeInOutQuad
        if (t >= 1) p.anim = null
      }
      const grow = 0.03 + 0.97 * t
      const labelA = t <= 0.42 ? 0 : Math.min(1, (t - 0.42) / 0.4)
      for (const it of lay.items) {
        it.dx = lay.cx + (it.x - lay.cx) * grow
        it.dy = lay.cy + (it.y - lay.cy) * grow
      }

      // 连线：颜色是关系类型，粗细是权重
      for (const it of lay.items) {
        ctx.save()
        ctx.globalAlpha = (hl ? (hl === it.node.id ? 0.95 : 0.12) : 0.5) * (0.2 + 0.8 * t)
        ctx.strokeStyle = KIND_COLOR[it.kind] || '#888'
        ctx.lineWidth = Math.min(2.6, 0.8 + (it.e.w || 1) * 0.35)
        ctx.beginPath(); ctx.moveTo(lay.cx, lay.cy); ctx.lineTo(it.dx, it.dy); ctx.stroke()
        ctx.restore()
      }

      // 外圈点
      for (const it of lay.items) {
        const n = it.node
        const big = n.kind === 'project' || n.kind === 'person'
        const on = !hl || hl === n.id
        ctx.save()
        ctx.globalAlpha = (on ? 1 : 0.28) * Math.min(1, t * 2.2)
        ctx.fillStyle = n.kind === 'person' ? colPerson : n.kind === 'project' ? colProj : n.side === 'dsh' ? colDsh : colQq
        ctx.beginPath(); ctx.arc(it.dx, it.dy, (big ? 5.2 : 3.2) * (0.4 + 0.6 * t), 0, Math.PI * 2); ctx.fill()
        ctx.restore()
      }

      // 标签：径向往外放，撞上就不画（悬停那一条永远画）
      ctx.font = '11px system-ui, -apple-system, "Segoe UI", sans-serif'
      ctx.textBaseline = 'middle'
      const placed = []
      const hits = (x, y, w, h) => placed.some((r) => x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y)
      const ordered = lay.items.slice().sort((a, b) => (b.node.kind === 'project' || b.node.kind === 'person' ? 1 : 0) - (a.node.kind === 'project' || a.node.kind === 'person' ? 1 : 0) || (b.e.w || 0) - (a.e.w || 0))
      for (const it of ordered) {
        const isHl = hl === it.node.id
        if (hl && !isHl) continue
        if (labelA <= 0) continue
        const label = (it.node.title || '(无标题)').slice(0, 18)
        const w = ctx.measureText(label).width
        const cos = Math.cos(it.ang), sin = Math.sin(it.ang)
        let x = it.dx + (cos >= 0 ? 8 : -8 - w)
        let y = it.dy - 7
        // 贴边那几条别把字画出画布外
        x = Math.max(3, Math.min(Wp - w - 3, x))
        y = Math.max(2, Math.min(Hp - 16, y))
        const box = { x: x - 1, y: y, w: w + 2, h: 14 }
        if (!isHl && hits(box.x, box.y, box.w, box.h)) continue
        placed.push(box)
        ctx.save()
        ctx.globalAlpha = labelA
        ctx.fillStyle = 'rgba(0,0,0,0.42)'
        ctx.fillRect(box.x, box.y, box.w, box.h)
        ctx.fillStyle = 'rgba(255,255,255,0.94)'
        ctx.fillText(label, x, y + 7)
        ctx.restore()
      }

      // 中心
      const cn = byId.get(p.center)
      ctx.save()
      ctx.globalAlpha = Math.min(1, 0.25 + t)
      ctx.fillStyle = 'rgba(255,255,255,0.10)'
      ctx.beginPath(); ctx.arc(lay.cx, lay.cy, 15 * (0.5 + 0.5 * t), 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.beginPath(); ctx.arc(lay.cx, lay.cy, 8 * (0.4 + 0.6 * t), 0, Math.PI * 2); ctx.fill()
      ctx.restore()
      ctx.save()
      ctx.globalAlpha = labelA
      ctx.font = '600 12px system-ui, -apple-system, "Segoe UI", sans-serif'
      ctx.textAlign = 'center'
      const ct = ((cn && cn.title) || '(无标题)').slice(0, 26)
      const cw = ctx.measureText(ct).width
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      ctx.fillRect(lay.cx - cw / 2 - 5, lay.cy + 18, cw + 10, 17)
      ctx.fillStyle = '#ffffff'
      ctx.fillText(ct, lay.cx, lay.cy + 27)
      ctx.restore()
      ctx.textAlign = 'left'

      const total = p.groups.reduce((s, g) => s + g[1].length, 0)
      p.note.textContent = '以这条为心 · ' + total + ' 条相关 · 点外圈任一点换中心 · 点列表里的条目也一样'
      if (t < 1 && p.anim) p.raf = requestAnimationFrame(drawPlane)
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

      const ex = document.createElement('button')
      ex.className = 'nv-expand'
      ex.textContent = '在平面上展开这张网（' + (adj.get(n.id) || []).length + ' 条相关）'
      ex.onclick = () => openPlane(n.id)
      side.appendChild(ex)

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
    // 双击一个点直接在平面上展开，不用先选中再点按钮
    canvas.addEventListener('dblclick', (e) => {
      const rect = canvas.getBoundingClientRect()
      const hit = pick(e.clientX - rect.left, e.clientY - rect.top)
      if (hit) openPlane(hit)
    })
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
        if (plane) {
          if (plane.raf) cancelAnimationFrame(plane.raf)
          if (plane.onKey) document.removeEventListener('keydown', plane.onKey)
          if (plane.ro) plane.ro.disconnect()
          plane = null
        }
        host.innerHTML = ''
      },
      select(id) { selected = id; renderSide(); draw() },
      plane(id) { openPlane(id) },
      // ---- top 栏（2026-11-07）：面板外壳通过这三个口子驱动视图，不直接碰内部状态 ----
      setQuery(q) { search.value = String(q || ''); search.dispatchEvent(new Event('input')) },
      setWayFilter(list) {
        const next = new Set((list || []).filter((x) => WAY_KINDS.indexOf(x) >= 0))
        wayOn = next.size ? next : new Set(WAY_KINDS)
        recalcAdj(); draw(); renderSide()
      },
      ways() { return WAY_KINDS.slice() },
      stats() { return { nodes: nodes.length, edges: edges.length, shownEdges: liveEdges().length } },
      snapshot() { return data },
    }
  }

  const api = { mount, layout }
  if (typeof window !== 'undefined') window.__MingNeuronView = api
  if (typeof module !== 'undefined' && module.exports) module.exports = api
})()


/**
 * star-view.js —— 星图视图（银河系 · DOM 版）
 *
 * 2026-11-07 15:00 重写。上一版是 canvas，今天在画布上耗了一小时：投影、尺寸链、RO 抖动，
 * 每一层都能让图变成空白，而且「空白」和「没加载」长得一模一样。13:50 一度退成色块网格。
 *
 * 这一版不碰 canvas：每个点就是一个 div，位置用 translate3d，大小用 scale，
 * 景深用透明度。1271 个 div 的 transform 每帧刷新，比一次 drawImage 稳得多——
 * 画不出来只可能是「没挂上」，不可能是「画错了」。
 *
 * 布局照旧（12:15 那版，她说的「银河系」）：
 *   核心   人 + 项目，亮、密、在正中
 *   旋臂   记忆按第一个 tag 分 5 条 + 杂项，沿对数螺旋铺开，越新越靠外
 *   时间环 最外圈一条淡环，按日期钉日记
 *   雾     三层极淡的径向渐变，撑体积
 * 数据只吃统一节点模型（/neurons/unified）：点开的每个点都能回它自己。
 */
;(function () {
  'use strict'

  const ARM_COLORS = ['#5b8def', '#14b8a6', '#e0803a', '#e05a8a', '#a78bfa', '#8b8f96']
  const KIND_COLOR = { memory: '#14b8a6', diary: '#c9cdd4', person: '#e05a8a', project: '#5b8def' }
  const ARM_COUNT = 8          // 主题臂数量，剩下的进「杂项」
  const CORE_SHARE = 0.12      // 核球占半径的比例
  const DOT = 10               // 每个点的基准边长(px)，真大小靠 scale

  const CSS = `
.svx-root{position:relative;display:flex;flex-direction:column;height:100%;min-height:0}
.svx-head{display:flex;align-items:center;gap:10px;padding:6px 12px;font-size:12px;color:var(--dsw-alias-label-tertiary);border-bottom:1px solid var(--dsw-alias-separator-secondary)}
.svx-head .sp{flex:1}
.svx-legend{display:flex;gap:10px;align-items:center;font-size:11.5px;opacity:.85}
.svx-legend i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:4px}
.svx-body{flex:1;min-height:0;display:flex}
.svx-stage{flex:1;min-width:0;position:relative;overflow:hidden;cursor:grab;user-select:none;-webkit-user-select:none}
.svx-stage.drag{cursor:grabbing}
.svx-fog{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);border-radius:50%;pointer-events:none}
.svx-svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.svx-dot{position:absolute;left:0;top:0;width:${DOT}px;height:${DOT}px;border-radius:50%;pointer-events:none;will-change:transform,opacity}
.svx-dot.sel{outline:1px solid var(--dsw-alias-label-primary);outline-offset:2px}
.svx-arm-label{position:absolute;user-select:none;font-size:11px;transform:translate(-50%,0);pointer-events:none;white-space:nowrap;opacity:.85}
.svx-core-label{position:absolute;font-size:11px;color:var(--dsw-alias-label-tertiary);transform:translate(-50%,0);pointer-events:none;white-space:nowrap;opacity:.8}
.svx-side{width:280px;flex:0 0 280px;border-left:1px solid var(--dsw-alias-separator-secondary);overflow:auto;padding:10px 12px;font-size:12.5px;line-height:19px;color:var(--dsw-alias-label-secondary)}
.svx-side h4{margin:0 0 6px;font-size:13px;color:var(--dsw-alias-label-primary);font-weight:600}
.svx-side .d{color:var(--dsw-alias-label-tertiary);font-size:11.5px;margin-bottom:8px}
.svx-side .b{white-space:pre-wrap;word-break:break-word}
.svx-side .empty{color:var(--dsw-alias-label-tertiary);font-size:12px}
.svx-side .arm{margin-top:10px;font-size:11.5px;color:var(--dsw-alias-label-tertiary)}
.svx-side .arm i{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:5px}
`

  // 稳定哈希：同一个 id 每次都落同一条臂、同一个亮度
  function hash(s) {
    let h = 2166136261
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
    return (h >>> 0)
  }

  function mount(host, data, opts) {
    opts = opts || {}
    if (!host) return { destroy() {} }
    host.innerHTML = ''
    const root = document.createElement('div'); root.className = 'svx-root'
    const style = document.createElement('style'); style.textContent = CSS
    root.appendChild(style)

    const nodes = (data && data.nodes) || []
    const stat = (data && data.stats) || {}

    // ---------- 头 ----------
    const head = document.createElement('div'); head.className = 'svx-head'
    const title = document.createElement('span')
    const chN = stat.chapters || nodes.filter((n) => n.chapter).length || 0
    const diaryN = stat.diaries || nodes.filter((n) => n.kind === 'diary').length
    title.textContent = `星图 · ${stat.unified || nodes.length} 个节点 · ${chN} 章 · ${diaryN} 篇日记`
    const sp = document.createElement('span'); sp.className = 'sp'
    const hint = document.createElement('span'); hint.textContent = '拖动转 · 滚轮缩放 · 点一颗看原话'; hint.style.opacity = '0.7'
    const lg = document.createElement('span'); lg.className = 'svx-legend'
    lg.innerHTML = '<span><i style="background:#14b8a6"></i>记忆</span><span><i style="background:#e05a8a"></i>人</span><span><i style="background:#5b8def"></i>项目</span><span><i style="background:#c9cdd4"></i>日记</span>'
    head.appendChild(title); head.appendChild(sp); head.appendChild(hint); head.appendChild(lg)

    // ---------- 体 ----------
    const body = document.createElement('div'); body.className = 'svx-body'
    const stage = document.createElement('div'); stage.className = 'svx-stage'
    const side = document.createElement('aside'); side.className = 'svx-side'
    side.innerHTML = '<div class="empty">点一颗星看原话。</div>'
    body.appendChild(stage); body.appendChild(side)
    root.appendChild(head); root.appendChild(body)
    host.appendChild(root)

    // 雾（静态，三层）：撑出「有东西在那里」的体积
    for (const k of [0.95, 0.62, 0.34]) {
      const f = document.createElement('div'); f.className = 'svx-fog'
      const d = Math.round(k * 100)
      f.style.width = d + '%'; f.style.height = d + '%'
      f.style.background = 'radial-gradient(closest-side, rgba(160,160,180,.055), rgba(160,160,180,0))'
      stage.appendChild(f)
    }

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('class', 'svx-svg')
    stage.appendChild(svg)
    const armPaths = []
    const ringEl = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse')
    ringEl.setAttribute('fill', 'none')
    ringEl.setAttribute('stroke', 'rgba(150,150,170,.13)')
    ringEl.setAttribute('stroke-width', '1')
    ringEl.style.display = 'none'
    svg.appendChild(ringEl)

    // ---------- 分臂 ----------
    const memories = nodes.filter((n) => n.kind === 'memory')
    const cores = nodes.filter((n) => n.kind === 'person' || n.kind === 'project')
    const diaries = nodes.filter((n) => n.kind === 'diary')

    // 2026-11-07 18:2x：分臂只用章。上一版[有章用章、没章用来源]，结果一条臂叫[第4章 机器]、
    // 旁边一条叫[深水区]，同一张图上两套尺子。没章的进[未分章]，跟记忆卡那边一样不硬塞。
    const keyOf = (n) => (n.chapter ? ('第' + n.chapter + '章 ' + (n.chapterName || '')) : '未分章')
    const tagCount = new Map()
    for (const n of memories) {
      const t = keyOf(n)
      tagCount.set(t, (tagCount.get(t) || 0) + 1)
    }
    const topTags = [...tagCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, ARM_COUNT).map(([t]) => t)
    const armOf = new Map()
    for (const n of memories) {
      const t = keyOf(n)
      armOf.set(n.id, topTags.indexOf(t) >= 0 ? t : '杂项')
    }
    const armNames = topTags.concat(memories.some((n) => armOf.get(n.id) === '杂项') ? ['杂项'] : [])
    const armIndex = new Map(armNames.map((t, i) => [t, i]))
    const armColor = (name) => ARM_COLORS[(armIndex.get(name) || 0) % ARM_COLORS.length]

    const buckets = new Map(armNames.map((r) => [r, []]))
    for (const n of memories) {
      const k = armOf.get(n.id)
      if (!buckets.has(k)) buckets.set(k, [])
      buckets.get(k).push(n)
    }
    for (const [, list] of buckets) list.sort((a, b) => ((a.at || 0) - (b.at || 0)))

    let W = 0, H = 0, cx = 0, cy = 0, R = 0
    let yaw = 0.4
    let pitch = 0.16          // 上下点头：往上拖 = 从上往下看
    let zoom = 1
    let hover = null
    let selected = null
    const pos = new Map()
    const dotEl = new Map()

    // 先建点：1271 个 div 一次性 append，之后只改 style，不再增删
    const frag = document.createDocumentFragment()
    for (const n of nodes) {
      const el = document.createElement('i')
      el.className = 'svx-dot'
      el.setAttribute('data-id', n.id)
      el.style.opacity = '0.5'
      dotEl.set(n.id, el)
      frag.appendChild(el)
    }
    stage.appendChild(frag)

    const armLabels = new Map()
    function armLabel(name) {
      let el = armLabels.get(name)
      if (!el) {
        el = document.createElement('div')
        el.className = 'svx-arm-label'
        el.textContent = String(name).replace(/^群 · /, '').slice(0, 12)
        stage.appendChild(el)
        armLabels.set(name, el)
      }
      return el
    }

    const coreLabel = document.createElement('div')
    coreLabel.className = 'svx-core-label'
    stage.appendChild(coreLabel)

    function measure() {
      const r = stage.getBoundingClientRect()
      let w = Math.floor(r.width), h = Math.floor(r.height)
      // 零尺寸保护：刚挂上、或父级还在 display:none 时量到 0。
      // 不在这里报错，退回一个能看的默认尺寸，RO 下一帧会修正。
      if (w < 40) w = Math.max(320, host.clientWidth || 0) || 720
      if (h < 40) h = Math.max(240, host.clientHeight || 0) || 520
      W = w; H = h
      cx = W / 2; cy = H / 2
      R = Math.min(W, H) * 0.46
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

      const sorted = diaries.slice().sort((a, b) => ((a.date || '') < (b.date || '') ? -1 : 1))
      const ringR = outer * 1.06
      sorted.forEach((d, i) => {
        const a = (i / Math.max(1, sorted.length)) * Math.PI * 2 - Math.PI / 2
        pos.set(d.id, { x: Math.cos(a) * ringR, y: Math.sin(a) * ringR * 0.55, z: 0.6, r: 2.2, node: d, arm: -2 })
      })
    }

    function project(p) {
      const cy1 = Math.cos(yaw), sy1 = Math.sin(yaw)
      const cp = Math.cos(pitch), sp = Math.sin(pitch)
      // 先绕竖轴转（左右拖）
      const x1 = p.x * cy1 - p.z * R * 0.35 * sy1
      const z1 = p.x * sy1 + p.z * R * 0.35 * cy1
      // 再绕横轴点头（上下拖）：2026-11-07 18:2x 加，她说不能上下转
      const y2 = p.y * cp - z1 * sp
      const z2 = p.y * sp + z1 * cp
      const s = 1 + z2 / (R * 4)
      return { x: cx + x1 * zoom, y: cy + (y2 + z2 * 0.12) * zoom, s, z: z2 }
    }

    let raf = 0
    function schedule() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; paint(false) }) }

    // full=false：只挪位置（拖动中用）；full=true：连透明度/大小/颜色一起刷
    function paint(full) {
      if (!W) measure()
      for (const [id, p] of pos) {
        const el = dotEl.get(id)
        if (!el) continue
        const q = project(p)
        const depth = Math.max(0, Math.min(1, 0.45 + (q.z / (R * 0.9)) * 0.9 + 0.45))
        const isSel = selected && selected.id === id
        const isHov = hover && hover.id === id
        const rad = (p.r + (isSel || isHov ? 2.4 : 0)) * (0.75 + depth * 0.5) * zoom
        const k = Math.max(0.35, rad / (DOT / 2))
        el.style.transform = 'translate3d(' + (q.x - DOT / 2).toFixed(1) + 'px,' + (q.y - DOT / 2).toFixed(1) + 'px,0) scale(' + k.toFixed(2) + ')'
        if (full) {
          el.style.opacity = (0.35 + depth * 0.6).toFixed(2)
          const tag = p.arm + '|' + (isSel ? 1 : 0) + '|' + (isHov ? 1 : 0)
          if (el.__painted !== tag) {
            el.__painted = tag
            el.style.background = p.node.kind === 'memory' && p.arm >= 0
              ? armColor(armOf.get(id))
              : (KIND_COLOR[p.node.kind] || '#888')
            el.className = 'svx-dot' + (isSel ? ' sel' : '')
          }
        }
      }

      // 2026-11-07 19:4x：这一段原来是 if(full)，于是拖动时标签和旋臂线留在原地不动。
      // 位置类的更新每帧都要跑；只有颜色/透明度那类才需要 full。
      {
        // 旋臂描边
        armNames.forEach((name, ai) => {
          const pts = (buckets.get(name) || []).map((n) => pos.get(n.id)).filter(Boolean).map(project)
          let d = ''
          pts.forEach((q, i) => { d += (i ? 'L' : 'M') + q.x.toFixed(1) + ' ' + q.y.toFixed(1) })
          let path = armPaths[ai]
          if (!path) {
            path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
            path.setAttribute('fill', 'none')
            path.setAttribute('stroke-width', '1')
            path.setAttribute('stroke', armColor(name))
            path.setAttribute('opacity', '0.12')
            svg.insertBefore(path, ringEl)
            armPaths[ai] = path
          }
          path.setAttribute('d', d)
        })
        // 时间环
        if (diaries.length) {
          ringEl.style.display = ''
          ringEl.setAttribute('cx', String(cx)); ringEl.setAttribute('cy', String(cy))
          ringEl.setAttribute('rx', String(R * 0.95 * 1.06 * zoom))
          ringEl.setAttribute('ry', String(R * 0.95 * 1.06 * 0.55 * zoom))
        }
        armNames.forEach((name) => {
          const list = buckets.get(name) || []
          const el = armLabel(name)
          const last = list[list.length - 1]
          if (!last || !pos.get(last.id)) { el.style.display = 'none'; return }
          const q = project(pos.get(last.id))
          el.style.display = ''
          el.style.left = q.x.toFixed(0) + 'px'
          el.style.top = (q.y - 14).toFixed(0) + 'px'
          el.style.color = armColor(name)
        })
        coreLabel.textContent = '核心 · 人与项目 ' + cores.length
        coreLabel.style.left = cx + 'px'
        coreLabel.style.top = (cy + R * CORE_SHARE * 0.75 + 14) + 'px'
        stage.setAttribute('data-dots', String(pos.size))
      }
    }

    function relayout() {
      measure()
      layout()
      paint(true)
    }

    function pick(mx, my) {
      let best = null, bd = 26 * 26
      for (const [, p] of pos) {
        const q = project(p)
        const dx = q.x - mx, dy = q.y - my
        const d = dx * dx + dy * dy
        if (d < bd) { bd = d; best = p }
      }
      return best
    }

    function renderSide() {
      if (!selected) { side.innerHTML = '<div class="empty">点一颗星看原话。</div>'; return }
      // 2026-11-07 18:2x：selected 存的是节点本身，不是 pos 项。上一版这里取 selected.node，
      // 结果是 undefined，侧栏一选中就抛错、什么都没显示——她说的[没有对应的话]就是这个。
      const n = (selected && selected.node) ? selected.node : selected
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
    let dragging = false, lastX = 0, lastY = 0, downX = 0, downY = 0, movedPx = 0
    stage.addEventListener('pointerdown', (ev) => {
      ev.preventDefault()
      dragging = true; lastX = ev.clientX; lastY = ev.clientY
      downX = ev.clientX; downY = ev.clientY; movedPx = 0
      stage.classList.add('drag')
      try { stage.setPointerCapture(ev.pointerId) } catch (e) {}
    })
    stage.addEventListener('pointermove', (ev) => {
      const r = stage.getBoundingClientRect()
      if (dragging) {
        yaw += (ev.clientX - lastX) * 0.006
        pitch = Math.max(-1.15, Math.min(1.15, pitch + (ev.clientY - lastY) * 0.005))
        movedPx += Math.abs(ev.clientX - lastX) + Math.abs(ev.clientY - lastY)
        lastX = ev.clientX; lastY = ev.clientY
        schedule()
        return
      }
      const p = pick(ev.clientX - r.left, ev.clientY - r.top)
      const id = p ? p.node.id : null
      const cur = hover ? hover.id : null
      if (id !== cur) { hover = p ? p.node : null; paint(true) }
      stage.style.cursor = p ? 'pointer' : 'grab'
    })
    function endDrag(ev) {
      if (!dragging) return
      dragging = false; stage.classList.remove('drag')
      // 没怎么动 = 点击：选最近的一颗星（原来靠 click 事件，拖动时会被一起触发，改在这里判）
      if (movedPx < 6 && ev) {
        const r = stage.getBoundingClientRect()
        const p = pick(ev.clientX - r.left, ev.clientY - r.top)
        if (p) { selected = p.node; renderSide() }
      }
      paint(true)
    }
    stage.addEventListener('pointerup', endDrag)
    stage.addEventListener('pointercancel', endDrag)
    stage.addEventListener('pointerleave', endDrag)

    stage.addEventListener('click', (ev) => {
      const r = stage.getBoundingClientRect()
      const p = pick(ev.clientX - r.left, ev.clientY - r.top)
      if (!p) return
      selected = p.node
      renderSide()
      paint(true)
      // 2026-11-07 21:4x：把「我正在看哪一条」报给面板。
      // 之前星图点一颗星，只有星图自己知道；切到记忆 tab 列表还在原地，两边对不上同一条。
      if (opts.onSelect) { try { opts.onSelect(p.node.id) } catch (e) {} }
    })

    stage.addEventListener('wheel', (ev) => {
      ev.preventDefault()
      zoom = Math.max(0.45, Math.min(2.8, zoom * (ev.deltaY > 0 ? 0.92 : 1.08)))
      paint(true)
    }, { passive: false })

    let ro = null
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => relayout())
      ro.observe(stage)
    }
    relayout()
    // 再补一次：从 display:none 切过来时第一次量到的可能是 0
    setTimeout(() => { try { relayout() } catch (e) {} }, 60)

    // 切回星图时对齐到面板记着的那一条（opts.initialId 由 panel 传进来）
    if (opts.initialId) {
      const p0 = pos.get(opts.initialId)
      if (p0) { selected = p0.node; renderSide(); paint(true) }
    }

    return {
      destroy() { try { if (ro) ro.disconnect() } catch (e) {} host.innerHTML = '' },
      stats() {
        return {
          nodes: pos.size, arms: armNames.length, arms_detail: armNames,
          cores: cores.length, diaries: diaries.length, zoom,
          size: [W, H], dots: stage.querySelectorAll('.svx-dot').length,
        }
      },
      focus(id) { const p = pos.get(id); if (p) { selected = p.node; renderSide(); paint(true) } },
      // 给顶部搜索用：命中第一条就选中它
      find(text) {
        const t = String(text || '').trim().toLowerCase()
        if (!t) return null
        for (const [, p] of pos) {
          const n = p.node
          if (String(n.title || '').toLowerCase().indexOf(t) >= 0 ||
              String(n.body || n.excerpt || '').toLowerCase().indexOf(t) >= 0) {
            selected = n; renderSide(); paint(true)
            return n
          }
        }
        return null
      },
    }
  }

  const api = { mount }
  if (typeof window !== 'undefined') window.__MingStarView = api
  if (typeof module !== 'undefined' && module.exports) module.exports = api
})()


/* panels.js —— 从 dsh-ming-interest / dsh-ming-voice / dsh-ming-browse 搬进来的三块，
 * 2026-11-07 18:5x 她定的：侧栏只留一个入口，所有面板都收在这里面（21:47 这个入口改名叫「家底」）。
 * 各自仍然走自己的 Host 路由，只是渲染搬了过来；原来那三个插件的侧栏图标撤掉。
 */

/**
 * dsh-ming-interest —— 兴趣面板（Client 半端源码）
 * 拼进 client.js 的 factory，能用外层的 h / React hooks。
 *
 * 2026-11-07 18:3x：从「只能看」变成「能按」——开关就是 live/interest-off 那个文件，
 * 面板只给它一个按钮；关键词还是改 live/interests.json。跳过原因拆开显示，不再是一整行字。
 */
const INTEREST_API = '/_dsh/dsh-ming-interest'

function fmtAgo(ms) {
  if (!ms || ms < 0) return '—'
  const m = Math.floor(ms / 60000)
  if (m < 1) return '刚刚'
  if (m < 60) return m + ' 分钟前'
  const h = Math.floor(m / 60)
  if (h < 24) return h + ' 小时前'
  return Math.floor(h / 24) + ' 天前'
}

function InterestPanel() {
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [switching, setSwitching] = useState(false)

  const load = useCallback(() => {
    setBusy(true)
    setErr('')
    return fetch(INTEREST_API + '/state', { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json() })
      .then((d) => { if (d.error) setErr(String(d.error)); else setData(d) })
      .catch((e) => setErr(String((e && e.message) || e)))
      .finally(() => setBusy(false))
  }, [])

  useEffect(() => { load() }, [load])

  const toggle = useCallback(() => {
    setSwitching(true)
    fetch(INTEREST_API + '/toggle', { method: 'POST' })
      .then((r) => r.json())
      .then(() => load())
      .catch((e) => setErr(String((e && e.message) || e)))
      .finally(() => setSwitching(false))
  }, [load])

  const st = (data && data.state) || {}
  const topics = (data && data.topics) || []
  const quiet = st.quiet || st.skip
  const off = !!st.off
  const tone = off ? 'danger' : quiet ? 'warn' : 'ok'
  const label = off ? '唤醒关着' : quiet ? '现在不叫' : '在线'
  // 「跳过原因」拆成几条：她要知道是哪一条卡着，不是一句日志
  const why = String(st.skip || '').split(/[；;]\s*|\s{2,}/).map((x) => x.trim()).filter(Boolean)

  return h('div', { className: 'ming-panel' },
    h('div', { className: 'ming-head' },
      h('span', { className: 'ming-title' }, '兴趣'),
      h('span', { className: 'ming-pill', 'data-tone': tone }, label),
      h('span', { className: 'ming-sub' }, busy ? '读取中…' : topics.length + ' 个话题'),
      h('button', {
        className: 'ming-btn',
        style: { marginLeft: 'auto' },
        disabled: switching,
        title: off ? '删掉 live/interest-off，恢复关键词叫醒' : '写 live/interest-off，先不叫醒',
        onClick: toggle,
      }, switching ? '切换中…' : (off ? '打开' : '关掉')),
      h('button', { className: 'ming-btn', onClick: load }, '刷新'),
    ),
    h('div', { className: 'ming-body ming-scroll' },
      err ? h('div', { className: 'ming-empty' }, '△ ' + err) : null,

      h('div', { className: 'ming-card', style: { display: 'flex', gap: 24 } },
        h('div', { className: 'ming-stat' },
          h('span', { className: 'ming-kpi' }, (st.wakesLastHour || 0) + '/' + (st.maxPerHour || '?')),
          h('span', { className: 'ming-sub' }, '这一小时叫醒'),
        ),
        h('div', { className: 'ming-stat' },
          h('span', { className: 'ming-kpi', style: { fontSize: 15 } }, fmtAgo(st.sinceWakeMs)),
          h('span', { className: 'ming-sub' }, '距上次'),
        ),
        h('div', { className: 'ming-stat' },
          h('span', { className: 'ming-kpi', style: { fontSize: 15 } }, st.at ? st.at.slice(5, 16).replace('T', ' ') : '—'),
          h('span', { className: 'ming-sub' }, '状态更新时间（UTC）'),
        ),
      ),

      why.length
        ? h('div', { className: 'ming-card' },
          h('div', { style: { fontWeight: 600, fontSize: 13, marginBottom: 4 } }, '现在为什么不叫'),
          h('div', null, why.map((w, i) => h('div', { key: i, className: 'ming-sub', style: { padding: '2px 0' } }, '· ' + w))),
          off ? h('div', { className: 'ming-sub', style: { marginTop: 4 } }, '开关在 live/interest-off，点上面的「打开」就删掉它。') : null,
        )
        : null,

      h('div', null, topics.map((t, i) => h('div', { key: i, className: 'ming-row', style: { alignItems: 'flex-start', flexDirection: 'column', gap: 4 } },
        h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', width: '100%' } },
          h('span', { style: { fontWeight: 600 } }, t.name || '(无名)'),
          h('span', { className: 'ming-sub', style: { marginLeft: 'auto' } }, (t.keywords || []).length + ' 词'),
        ),
        h('div', { style: { display: 'flex', gap: 4, flexWrap: 'wrap' } },
          (t.keywords || []).map((k, j) => h('span', { key: j, className: 'ming-pill' }, k)),
          (t.mute || []).map((k, j) => h('span', { key: 'm' + j, className: 'ming-pill', 'data-tone': 'danger', title: '出现就整条不算' }, '✕ ' + k)),
        ),
      ))),
      h('div', { className: 'ming-sub' }, '要改词就改 live/interests.json，下一轮生效。'),
    ),
  )
}

function InterestIcon() {
  return h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7 },
    h('circle', { cx: 12, cy: 12, r: 3 }),
    h('path', { d: 'M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2' }),
  )
}

/**
 * dsh-ming-voice —— 声音面板（Client 半端源码）
 *
 * 2026-11-07 18:3x：原来只能看见文件名，听不了。现在每行一个「听」，点开就地播
 * （音频走 Host 的 /_dsh/dsh-ming-voice/file?name=…，只放 live/voice 下的 mp3）。
 * 合成仍然走 voice_say 工具，这里不合成。
 */
const VOICE_API = '/_dsh/dsh-ming-voice'

function fmtSize(n) {
  if (!n) return ''
  if (n < 1024) return n + ' B'
  if (n < 1024 * 1024) return Math.round(n / 1024) + ' KB'
  return (n / 1024 / 1024).toFixed(1) + ' MB'
}

function fmtDay(ms) {
  if (!ms) return ''
  const d = new Date(ms)
  const p = (n) => String(n).padStart(2, '0')
  return p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
}

function VoicePanel() {
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [playing, setPlaying] = useState('')

  const load = useCallback(() => {
    setBusy(true)
    setErr('')
    return fetch(VOICE_API + '/state', { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json() })
      .then((d) => { if (d.error) setErr(String(d.error)); else setData(d) })
      .catch((e) => setErr(String((e && e.message) || e)))
      .finally(() => setBusy(false))
  }, [])

  useEffect(() => { load() }, [load])

  const files = (data && data.files) || []

  return h('div', { className: 'ming-panel' },
    h('div', { className: 'ming-head' },
      h('span', { className: 'ming-title' }, '声音'),
      h('span', { className: 'ming-sub' }, busy ? '读取中…' : files.length + ' 个最近文件'),
      h('button', { className: 'ming-btn', style: { marginLeft: 'auto' }, onClick: load }, '刷新'),
    ),
    h('div', { className: 'ming-body ming-scroll' },
      err ? h('div', { className: 'ming-empty' }, '△ ' + err) : null,
      h('div', { className: 'ming-card', style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
        h('span', { className: 'ming-pill' }, '引擎 ' + (data ? data.engine || '—' : '…')),
        h('span', { className: 'ming-pill' }, '音色 ' + (data ? data.voice || '—' : '…')),
        h('span', { className: 'ming-pill' }, '语速 ' + (data ? data.rate || '—' : '…')),
      ),
      files.length === 0 && !err
        ? h('div', { className: 'ming-empty' }, '还没有合成过语音')
        : h('div', null, files.map((f, i) => h('div', { key: i, style: { padding: '4px 0', borderBottom: '1px solid var(--dsw-alias-separator-secondary)' } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
            h('button', {
              className: 'ming-btn',
              style: { padding: '1px 8px' },
              title: playing === f.name ? '收起' : '试听',
              onClick: () => setPlaying(playing === f.name ? '' : f.name),
            }, playing === f.name ? '■' : '▶'),
            h('span', { style: { flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, title: f.name }, f.name),
            h('span', { className: 'ming-sub' }, fmtSize(f.size)),
            h('span', { className: 'ming-sub', style: { width: 76, textAlign: 'right' } }, fmtDay(f.mtime)),
          ),
          playing === f.name
            ? h('audio', {
              controls: true,
              autoPlay: true,
              style: { width: '100%', marginTop: 4 },
              src: VOICE_API + '/file?name=' + encodeURIComponent(f.name),
            })
            : null,
        ))),
    ),
  )
}

function VoiceIcon() {
  return h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7 },
    h('path', { d: 'M4 10v4h3l4 3V7L7 10H4z' }),
    h('path', { d: 'M15 9a4 4 0 010 6M17.5 6.5a7.5 7.5 0 010 11' }),
  )
}

/**
 * dsh-ming-browse —— 逛到哪儿了（Client 半端源码）
 *
 * 2026-11-07 18:3x 改：从「一页字」变成「今天看了什么」。
 * 上面一条状态（在逛 / 今天暂停 / 永久停）+ 今天的见闻条目；下面仍然是这一轮的原文。
 */
const BROWSE_API = '/_dsh/dsh-ming-browse'

function BrowsePanel() {
  const [data, setData] = useState(null)
  const [brush, setBrush] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [selDay, setSelDay] = useState('')

  const load = useCallback(() => {
    setBusy(true)
    setErr('')
    return fetch(BROWSE_API + '/state', { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json() })
      .then((d) => { if (d.error) setErr(String(d.error)); else setData(d) })
      .catch((e) => setErr(String((e && e.message) || e)))
      .finally(() => setBusy(false))
  }, [])

  const loadBrush = useCallback(() => {
    return fetch(BROWSE_API + '/brush', { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json() })
      .then((d) => setBrush(d))
      .catch(() => setBrush({ total: 0, rows: [], byKind: {}, dayCounts: {} }))
  }, [])

  useEffect(() => { load(); loadBrush() }, [load, loadBrush])

  const sess = (data && data.session) || {}
  const st = (data && data.state) || {}
  const rows = (brush && brush.rows) || []
  const total = (brush && brush.total) || 0
  const kinds = (brush && brush.byKind) || {}
  const dayCounts = (brush && brush.dayCounts) || {}
  const sw = (data && data.selfWake) || {}
  const it = (data && data.interest) || {}

  const p2 = (n) => String(n).padStart(2, '0')
  const keyOf = (d) => d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate())
  const todayKey = keyOf(new Date())
  const dayList = Object.keys(dayCounts).sort().reverse()
  const activeDay = selDay || (dayCounts[todayKey] ? todayKey : (dayList[0] || todayKey))
  const dayItems = rows.filter((r) => String(r.at || '').slice(0, 10) === activeDay)

  // 日历：一列一周，22 列 = 五个多月
  const cal = (() => {
    const end = new Date()
    const start = new Date(end)
    start.setDate(start.getDate() - ((end.getDay() + 6) % 7) - 7 * 21)
    const cols = []
    const cur = new Date(start)
    for (let w = 0; w < 22; w++) {
      const col = []
      for (let d = 0; d < 7; d++) {
        const future = cur > end
        col.push({ key: keyOf(cur), n: future ? -1 : (dayCounts[keyOf(cur)] || 0) })
        cur.setDate(cur.getDate() + 1)
      }
      cols.push(col)
    }
    return cols
  })()
  const dot = (n) => (n < 0 ? 'transparent' : n === 0 ? 'rgba(255,255,255,0.07)'
    : n <= 1 ? 'rgba(126,190,255,0.35)' : n <= 3 ? 'rgba(126,190,255,0.60)'
      : n <= 6 ? 'rgba(126,190,255,0.82)' : 'rgba(126,190,255,1)')

  const tone = st.off ? 'danger' : st.paused ? 'warn' : 'ok'
  const label = st.off ? '永久停' : st.paused ? '今天暂停' : '在逛'

  const card = (r, i) => {
    const d = String(r.at || '')
    const kindName = r.kind === 'video' ? '视频' : (r.kind === 'web' || r.kind === 'page') ? '网页' : r.kind === 'book' ? '书籍' : '其它'
    const meta = [
      d.slice(11, 16),
      r.up || '',
      r.duration ? Math.floor(r.duration / 60) + ':' + p2(r.duration % 60) : '',
    ].filter(Boolean).join(' · ')
    return h('a', {
      key: i,
      href: r.url || '#',
      target: '_blank',
      rel: 'noreferrer',
      style: { display: 'block', width: 196, textDecoration: 'none', color: 'inherit', flex: '0 0 auto' },
    },
    h('div', {
      style: {
        position: 'relative', width: '100%', paddingTop: '56.25%',
        borderRadius: 6, overflow: 'hidden',
        background: 'var(--dsw-alias-bg-secondary, #222)',
        border: '1px solid var(--dsw-alias-separator-secondary)',
      },
    },
    // 2026-11-07：背景图不能懒加载，且原图是 1920 宽；换成 <img> + lazy + 480 宽的缩略
    r.pic
      ? h('img', {
        src: (String(r.pic).indexOf('hdslb.com') >= 0 ? String(r.pic) + '@480w_270h_1c.webp' : r.pic),
        loading: 'lazy',
        decoding: 'async',
        referrerPolicy: 'no-referrer',
        style: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' },
      })
      : null,
    // 左上角类型标记：视频 / 网页 / 书籍 / 其它
    h('span', {
      style: {
        position: 'absolute', left: 4, top: 4,
        fontSize: 10, lineHeight: '15px', padding: '0 5px', borderRadius: 3,
        background: 'rgba(0,0,0,.62)', color: '#fff',
        border: '1px solid rgba(255,255,255,.22)',
        zIndex: 3,
      },
    }, kindName),
    !r.pic && r.kind === 'book'
      // 书没有封面时，画一个书脊：深蓝渐变 + 书名，比空块好看也认得出是哪本
      ? h('div', {
        style: {
          position: 'absolute', inset: 0,
          background: 'linear-gradient(150deg, #26374f 0%, #16202d 100%)',
          boxShadow: 'inset 3px 0 0 rgba(255,255,255,.10)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 12px',
        },
      }, h('div', {
        style: {
          fontSize: 13, lineHeight: 1.4, color: 'rgba(214,230,255,.92)', textAlign: 'center',
          display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        },
      }, r.title))
      : null,
    !r.pic && r.kind !== 'book'
      ? h('div', {
        style: {
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 26, opacity: 0.35,
        },
      }, '🌐')
      : null,
    r.duration
      ? h('span', {
        style: {
          position: 'absolute', right: 4, bottom: 4, fontSize: 10,
          background: 'rgba(0,0,0,.72)', color: '#fff',
          padding: '0 4px', borderRadius: 3, fontVariantNumeric: 'tabular-nums',
        },
      }, Math.floor(r.duration / 60) + ':' + p2(r.duration % 60))
      : null,
    ),
    h('div', {
      style: {
        fontSize: 12.5, lineHeight: 1.45, marginTop: 5,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden', minHeight: 36,
      },
    }, r.title || r.url || '(无题)'),
    // 书的副标题放进度（第几章到第几章），网页放简介
    (r.kind === 'book' ? r.note : r.desc)
      ? h('div', {
        style: {
          fontSize: 11, lineHeight: 1.4, marginTop: 2,
          color: 'var(--dsw-alias-label-secondary)',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        },
      }, r.kind === 'book' ? r.note : r.desc)
      : null,
    h('div', { style: { fontSize: 10.5, color: 'var(--dsw-alias-label-tertiary)', marginTop: 2 } }, meta),
    )
  }

  return h('div', { className: 'ming-panel' },
    h('div', { className: 'ming-head', style: { flexWrap: 'wrap', gap: 8 } },
      // 2026-11-07 21:55 她指着这行说「改成自己玩」——原来叫「刷过 / 看过 · v5」，
      // 那个 v5 是内部版本号，不该出现在她眼前。后面的「在逛 / 165 条 · 19 天 / 第 1/6 轮」留着，信息不丢。
      h('span', { className: 'ming-title' }, '自己玩'),
      h('span', { className: 'ming-pill', 'data-tone': tone }, label),
      h('span', { className: 'ming-sub' }, busy ? '读取中…' : (total + ' 条 · ' + dayList.length + ' 天')),
      sess.rounds || sess.perSession
        ? h('span', { className: 'ming-pill' }, '第 ' + (sess.rounds || 0) + '/' + (sess.perSession || '?') + ' 轮')
        : null,
      h('button', {
        className: 'ming-btn', style: { marginLeft: 'auto' },
        onClick: () => { load(); loadBrush() },
      }, '刷新'),
    ),

    h('div', { className: 'ming-body ming-scroll' },
      err ? h('div', { className: 'ming-empty' }, '△ ' + err) : null,

      // 2026-11-07 21:0x：她自己决定下次什么时候醒，兴趣命中会直接插进来一次。
      h('div', { className: 'ming-card', style: { marginBottom: 10 } },
        h('div', { style: { display: 'flex', gap: 14, alignItems: 'baseline', flexWrap: 'wrap', fontSize: 12.5 } },
          h('span', { style: { fontWeight: 600 } }, '下次醒'),
          h('span', { style: sw.urgent ? { color: '#ff6b6b', fontWeight: 600 } : undefined }, sw.next
            ? String(sw.next).replace('T', ' ').slice(0, 16)
            : '还没排（闲够久会自己醒一次）'),
          sw.urgent ? h('span', { style: { color: '#ff6b6b', fontWeight: 600 } }, '危机唤醒') : null,
          sw.reason ? h('span', { className: 'ming-sub' }, '为「' + sw.reason + '」') : null,
          h('span', { style: { width: 8 } }),
          h('span', { style: { fontWeight: 600 } }, '兴趣'),
          h('span', {}, it.wakesLastHour ? '这一小时叫醒 ' + it.wakesLastHour + ' 次' : '这一小时没叫过'),
          it.skip ? h('span', { className: 'ming-sub' }, it.skip) : null,
        ),
        h('div', { className: 'ming-sub', style: { marginTop: 4 } },
          '时间是我自己定的：这一轮想干什么、大概要多久，收尾时排下一次。兴趣命中不等排点，直接叫；连续叫太多次会被它自己限住。'),
      ),
      h('div', { className: 'ming-card' },
        h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 } },
          h('span', { style: { fontWeight: 600, fontSize: 13 } }, '看过哪些天'),
          h('span', { className: 'ming-sub' }, total ? '视频 ' + (kinds.video || 0) + ' / 网页 ' + ((kinds.web || 0) + (kinds.page || 0)) + ' / 书 ' + (kinds.book || 0) : '还没有记录'),
          h('span', { className: 'ming-sub', style: { marginLeft: 'auto' } }, '点格子看那天'),
        ),
        h('div', { style: { display: 'flex', gap: 3, alignItems: 'flex-start', overflowX: 'auto', paddingBottom: 4 } },
          cal.map((col, ci) => h('div', { key: ci, style: { display: 'flex', flexDirection: 'column', gap: 3 } },
            col.map((c) => h('div', {
              key: c.key,
              title: c.n >= 0 ? c.key + ' · ' + c.n + ' 条' : '',
              onClick: () => { if (c.n > 0) setSelDay(c.key) },
              style: {
                width: 12, height: 12, borderRadius: 2,
                background: dot(c.n),
                cursor: c.n > 0 ? 'pointer' : 'default',
                outline: c.key === activeDay ? '1.5px solid var(--dsw-alias-label-primary)' : 'none',
                outlineOffset: 1,
              },
            })),
          ))),
      ),

      h('div', { className: 'ming-card', style: { marginTop: 10 } },
        h('div', { style: { display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 10 } },
          h('span', { style: { fontWeight: 600, fontSize: 13 } }, activeDay === todayKey ? '今天' : activeDay),
          h('span', { className: 'ming-sub' }, dayItems.length + ' 条'),
          activeDay !== todayKey
            ? h('button', { className: 'ming-btn', style: { marginLeft: 'auto', fontSize: 11, padding: '1px 8px' }, onClick: () => setSelDay('') }, '回到今天')
            : null,
        ),
        dayItems.length
          ? h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 14 } }, dayItems.map(card))
          : h('div', { className: 'ming-empty', style: { padding: '10px 0' } }, '这天没记录'),
      ),

      st.off
        ? h('div', { className: 'ming-sub', style: { marginTop: 10 } }, '「以后都别看了」开着，得她说「以后都可以看了」才恢复。')
        : (st.paused ? h('div', { className: 'ming-sub', style: { marginTop: 10 } }, '今天暂停' + (st.pauseDate ? '（' + st.pauseDate + '）' : '') + '，明天自己失效。') : null),
    ),
  )
}

function BrowseIcon() {
  return h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7 },
    h('circle', { cx: 12, cy: 12, r: 9 }),
    h('path', { d: 'M15.5 8.5l-2 5-5 2 2-5 5-2z' }),
  )
}

/**
 * dsh-ming-desktop —— 桌面（Client 半端源码）
 *
 * 2026-11-07 19:1x 加：她要看的是「这只手最近看见了什么、合出了什么」，
 * 不是一堆按钮。所以这里只列最近截的图（缩略图点开就是原图）和最近的语音，能听。
 * 真要看屏幕 / 要动手，仍然走 desk_* 工具——边界写在工具描述里，不搬到面板上当按钮。
 */
const DESKTOP_API = '/_dsh/dsh-ming-desktop'

function DesktopPanel() {
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [playing, setPlaying] = useState('')
  // 2026-11-07 19:2x：她说「能不能点图片放大」——面板里就地放大，不开新标签
  //（新标签会被浏览器拦，而且离开了这一页）。
  const [zoom, setZoom] = useState('')

  const load = useCallback(() => {
    setBusy(true)
    setErr('')
    return fetch(DESKTOP_API + '/state', { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json() })
      .then((d) => { if (d.error) setErr(String(d.error)); else setData(d) })
      .catch((e) => setErr(String((e && e.message) || e)))
      .finally(() => setBusy(false))
  }, [])

  useEffect(() => { load() }, [load])

  const shots = (data && data.shots) || []
  const voices = (data && data.voices) || []

  return h('div', { className: 'ming-panel' },
    h('div', { className: 'ming-head' },
      h('span', { className: 'ming-title' }, '桌面'),
      h('span', { className: 'ming-sub' }, busy ? '读取中…' : shots.length + ' 张截图 · ' + voices.length + ' 段语音'),
      h('button', { className: 'ming-btn', style: { marginLeft: 'auto' }, onClick: load }, '刷新'),
    ),
    h('div', { className: 'ming-body ming-scroll' },
      err ? h('div', { className: 'ming-empty' }, '△ ' + err) : null,
      h('div', { className: 'ming-card', style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
        h('span', { className: 'ming-pill' }, data ? (data.enabled ? '桌面控制开着' : '桌面控制关着') : '…'),
        h('span', { className: 'ming-pill', title: (data && data.shotDir) || '' }, '截图目录 live 外的 shots/'),
      ),
      shots.length === 0 && !err ? h('div', { className: 'ming-empty' }, '还没截过图') : null,
      shots.length
        ? h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 6 } },
          shots.map((f, i) => h('button', {
            key: i,
            type: 'button',
            title: f.name + ' · ' + fmtDay(f.mtime) + '（点开看大图）',
            onClick: () => setZoom(f.name),
            style: {
              display: 'block', padding: 0, cursor: 'zoom-in', background: 'transparent',
              border: '1px solid var(--dsw-alias-separator-secondary)', borderRadius: 6, overflow: 'hidden',
            },
          }, h('img', {
            src: DESKTOP_API + '/file?name=' + encodeURIComponent(f.name),
            alt: f.name,
            style: { display: 'block', width: 168, height: 96, objectFit: 'cover' },
          }))))
        : null,
      voices.length
        ? h('div', { style: { marginTop: 12 } },
          h('div', { className: 'ming-sub', style: { paddingBottom: 4 } }, '最近合成'),
          voices.map((f, i) => h('div', { key: 'v' + i, style: { padding: '4px 0', borderBottom: '1px solid var(--dsw-alias-separator-secondary)' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
              h('button', {
                className: 'ming-btn', style: { padding: '1px 8px' },
                onClick: () => setPlaying(playing === f.name ? '' : f.name),
              }, playing === f.name ? '■' : '▶'),
              h('span', { style: { flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, title: f.name }, f.name),
              h('span', { className: 'ming-sub' }, fmtSize(f.size)),
              h('span', { className: 'ming-sub', style: { width: 76, textAlign: 'right' } }, fmtDay(f.mtime)),
            ),
            playing === f.name
              ? h('audio', { controls: true, autoPlay: true, style: { width: '100%', marginTop: 4 }, src: DESKTOP_API + '/file?kind=voice&name=' + encodeURIComponent(f.name) })
              : null,
          )))
        : null,
    ),
    // 放大层：铺满面板，点一下关掉
    zoom
      ? h('div', {
        onClick: () => setZoom(''),
        style: {
          position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,.86)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out',
        },
      },
        h('img', {
          src: DESKTOP_API + '/file?name=' + encodeURIComponent(zoom),
          alt: zoom,
          style: { maxWidth: '92vw', maxHeight: '92vh', boxShadow: '0 8px 40px rgba(0,0,0,.6)', borderRadius: 4, animation: 'mgPop .16s ease both' },
        }),
        h('div', {
          style: { position: 'absolute', bottom: 18, left: 0, right: 0, textAlign: 'center', color: '#bbb', fontSize: 12 },
        }, zoom + ' · 点任意处关闭'),
      )
      : null,
  )
}

/**
 * dsh-ming-resume —— 记忆接续（Client 半端源码）
 *
 * 2026-11-07 19:1x 加：这一页回答两个问题——「我现在在做哪件事」和「最近被打断了几次」。
 * 只读。status.json 是给人看的账，不该由面板代笔。
 */
const RESUME_API = '/_dsh/dsh-ming-resume'

function ResumePanel() {
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    setBusy(true)
    setErr('')
    return fetch(RESUME_API + '/state', { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json() })
      .then((d) => { if (d.error) setErr(String(d.error)); else setData(d) })
      .catch((e) => setErr(String((e && e.message) || e)))
      .finally(() => setBusy(false))
  }, [])

  useEffect(() => { load() }, [load])

  const log = (data && data.log) || []
  const recent = (data && data.recent) || []

  return h('div', { className: 'ming-panel' },
    h('div', { className: 'ming-head' },
      h('span', { className: 'ming-title' }, '记忆接续'),
      h('span', { className: 'ming-sub' }, busy ? '读取中…' : (data && data.resumePage ? '有重启交接页' : '没有交接页')),
      h('button', { className: 'ming-btn', style: { marginLeft: 'auto' }, onClick: load }, '刷新'),
    ),
    h('div', { className: 'ming-body ming-scroll' },
      err ? h('div', { className: 'ming-empty' }, '△ ' + err) : null,
      h('div', { className: 'ming-card' },
        h('div', { className: 'ming-sub' }, '现在在做'),
        h('div', { style: { paddingTop: 4, fontWeight: 600 } }, data ? (data.doing || '（status.json 里 doing 空着）') : '…'),
        data && data.detail ? h('div', { className: 'ming-sub', style: { paddingTop: 2 } }, data.detail) : null,
      ),
      recent.length
        ? h('div', { className: 'ming-card', style: { marginTop: 8 } },
          h('div', { className: 'ming-sub' }, '刚做过'),
          recent.map((t, i) => h('div', { key: i, style: { paddingTop: 3 } }, '· ' + String(t))))
        : null,
      h('div', { className: 'ming-card', style: { marginTop: 8 } },
        h('div', { className: 'ming-sub' }, '被打断过（最近 ' + log.length + ' 次）'),
        log.length === 0
          ? h('div', { className: 'ming-empty' }, '这版插件上线以来还没被插过话')
          : log.map((e, i) => h('div', { key: 'l' + i, style: { paddingTop: 3, display: 'flex', gap: 8 } },
            h('span', { className: 'ming-sub', style: { width: 96, flex: '0 0 auto' } }, fmtDay(Date.parse(e.at) || 0)),
            h('span', { style: { flex: '1 1 auto', minWidth: 0 } }, e.doing || '（当时 status 是空的）'),
          )),
      ),
    ),
  )
}



/**
 * panel.js —— DSH 面板外壳（React 只做两件事：顶部操作栏 + 把 neuron-view 挂进一个 div）
 *
 * 画图、交互、点开看正文全在 neuron-view.js 里，那边不依赖 React。
 * 这样同一份代码既能跑在面板里，也能直接丢进一个空 HTML 对 JSON 预览 ——
 * 「预览好看、面板难看」这种事，就是因为两边跑的不是同一份代码。
 *
 * 2026-11-07：顶部加一条 top 栏（她定的入口，先做布局和入口，不发明新样式）：
 *   视图切换（神经元 / 星图）· 搜索节点 · 筛选关系类型 · 导出 · 刷新。
 *   搜索和筛选不是面板自己过滤，是调 neuron-view 暴露的 setQuery / setWayFilter——
 *   数据只有一份，过滤只在渲染层做。
 */

// 2026-11-07 21:23：版本号改成「构建那一刻」——它就是判据：面板上印的时间对不上，
// 说明浏览器拿的还是旧 bundle（今天为此白改过两次）。
const MG_VERSION = '2026-11-07 22:11'

// 侧栏那个名字（2026-11-07 22:0x 她说的）：自己用叫「她的一生」，对外发布要另一个名字，
// 两者不该靠改代码切换——写死一个，发布前改一遍、自己用又改回来，迟早漏。
// 默认「她的一生」；发布版在页面里先注入 `window.__MING_GRAPH_LABEL = '...'` 即可覆盖。
const PANEL_LABEL = (typeof window !== 'undefined' && window.__MING_GRAPH_LABEL) || '她的一生'
const API = '/_dsh/dsh-ming-graph'
if (typeof window !== 'undefined' && !window.__MG_ERR_HOOK) {
  window.__MG_ERR_HOOK = 1
  window.__MG_ERR = ''
  window.addEventListener('error', (e) => {
    window.__MG_ERR = String((e && e.message) || '') + ' / ' + String((e && e.error && e.error.stack) || '')
  })
  window.addEventListener('unhandledrejection', (e) => {
    window.__MG_ERR = 'promise: ' + String((e && e.reason && (e.reason.stack || e.reason.message)) || e.reason || '')
  })
}

const PAGE_CSS = `
.mg-mount{height:100%;min-height:480px;display:flex;flex-direction:column;position:relative}
.mg-holder{flex:1;min-height:420px;display:flex;flex-direction:column}
.mg-msg{display:flex;align-items:center;justify-content:center;height:100%;color:var(--dsw-alias-label-tertiary);font-size:13px;padding:20px;text-align:center;line-height:20px}
.mg-msg.err{color:var(--dsw-alias-state-error-primary)}
.mg-bar{display:flex;align-items:center;gap:10px;padding:6px 12px;border-bottom:1px solid var(--dsw-alias-separator-secondary);font-size:12px;color:var(--dsw-alias-label-tertiary)}
.mg-bar .mg-meta{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mg-btn{appearance:none;border:1px solid var(--dsw-alias-separator-secondary);background:transparent;color:var(--dsw-alias-label-secondary);border-radius:6px;padding:3px 10px;font-size:12px;cursor:pointer}
.mg-btn:hover:not(:disabled){color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-secondary)}
.mg-btn:disabled{opacity:.5;cursor:default}
/* ---- top 栏（2026-11-07） ---- */
.mg-top{display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:7px 12px;border-bottom:1px solid var(--dsw-alias-separator-secondary)}
.mg-brand{display:inline-flex;align-items:baseline;gap:7px;margin-right:8px;font-size:13px;font-weight:600;letter-spacing:.02em;color:var(--dsw-alias-label-primary);white-space:nowrap}
.mg-brand i{font-style:normal;font-size:10px;font-weight:400;letter-spacing:.08em;color:var(--dsw-alias-label-secondary);opacity:.7}
.mg-seg{display:inline-flex;border:1px solid var(--dsw-alias-separator-secondary);border-radius:6px;overflow:hidden}
.mg-seg button{appearance:none;border:0;background:transparent;color:var(--dsw-alias-label-secondary);font-size:12px;padding:3px 10px;cursor:pointer}
.mg-seg button.on{background:var(--dsw-alias-bg-hover, rgba(127,127,127,.14));color:var(--dsw-alias-label-primary)}
.mg-input{appearance:none;border:1px solid var(--dsw-alias-separator-secondary);background:transparent;color:var(--dsw-alias-label-primary);
  border-radius:6px;padding:3px 9px;font-size:12px;min-width:180px;outline:none}
.mg-input:focus{border-color:var(--dsw-alias-label-secondary)}
.mg-chip{appearance:none;border:1px solid var(--dsw-alias-separator-secondary);background:transparent;color:var(--dsw-alias-label-tertiary);
  border-radius:999px;padding:2px 9px;font-size:11.5px;cursor:pointer}
.mg-chip.on{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-hover, rgba(127,127,127,.10))}
.mg-gap{flex:1}
/* 2026-11-07 13:51：DOM 网格（不用 canvas） */
.mg-gridwrap{flex:1;min-height:0;overflow:auto;padding:18px 20px 12px}
.mg-grid{display:grid;row-gap:6px;column-gap:3px}
.mg-rl{font-size:11.5px;color:var(--dsw-alias-label-secondary);text-align:right;padding-right:10px;white-space:nowrap;font-variant-numeric:tabular-nums}
.mg-rl b{color:var(--dsw-alias-label-primary);font-weight:600;margin-left:5px}
.mg-cell{height:26px;border-radius:6px;transition:transform .08s ease}
.mg-cell:hover{transform:scale(1.18);outline:1px solid var(--dsw-alias-label-secondary);outline-offset:1px}
.mg-xaxis{margin-top:8px}
.mg-xt{font-size:10px;color:var(--dsw-alias-label-tertiary);text-align:center;white-space:nowrap;overflow:hidden;opacity:.75}
.mg-legend{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--dsw-alias-label-tertiary);margin-top:12px}
.mg-lg{width:15px;height:11px;border-radius:3px}
.mg-note{display:flex;align-items:center;justify-content:center;height:100%;color:var(--dsw-alias-label-tertiary);font-size:13px;
  padding:24px;text-align:center;line-height:22px;white-space:pre-wrap}
/* ================= 2026-11-07 19:3x 动画与可读性 =================
   她说「给整个界面加动画过渡、更好地可读交互」。
   原则：动的是「出现/切换」，不动位置；一个动画不超过 200ms，不做循环。 */
@keyframes mgIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
@keyframes mgPop{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:scale(1)}}
.mg-holder>.ming-panel,.mg-holder>.svx-root{animation:mgIn .18s ease both}
.ming-panel{font-size:13.5px;line-height:1.72}
.ming-card{transition:border-color .15s ease,box-shadow .15s ease}
.ming-card:hover{border-color:var(--dsw-alias-border-l3)}
.ming-row{padding:6px 6px;border-radius:6px;transition:background .12s ease,transform .06s ease}
.ming-row:hover{background:var(--dsw-alias-bg-hover,rgba(127,127,127,.08))}
.ming-row:active{transform:scale(.997)}
.ming-btn,.mg-btn,.mg-chip,.mg-seg button{transition:color .12s ease,border-color .12s ease,background .12s ease,transform .06s ease}
.ming-btn:active,.mg-btn:active,.mg-chip:active{transform:scale(.96)}
.mg-seg button{position:relative}
.mg-seg button.on::after{content:'';position:absolute;left:10px;right:10px;bottom:1px;height:1.5px;background:currentColor;border-radius:2px;animation:mgIn .16s ease both}
.ming-sub{font-size:12px;color:var(--dsw-alias-label-secondary)}
.ming-kpi{font-variant-numeric:tabular-nums}
.ming-scroll{scrollbar-width:thin;scrollbar-color:rgba(127,127,127,.28) transparent}
.ming-scroll::-webkit-scrollbar{width:9px;height:9px}
.ming-scroll::-webkit-scrollbar-thumb{background:rgba(127,127,127,.22);border-radius:5px;border:2px solid transparent;background-clip:content-box}
.ming-scroll::-webkit-scrollbar-thumb:hover{background:rgba(127,127,127,.42);background-clip:content-box}
.ming-scroll::-webkit-scrollbar-track{background:transparent}
.mg-zoom{_:_}
.mg-zoom img{animation:mgPop .16s ease both}
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

// 边类型：跟 Host 的 e.kind 一一对应（ref / cokey / project / adjacent / subject）
const WAYS = ['引用', '共词', '归属', '补边', '主语']

// ---- 记忆库视图（2026-11-07） ----
// 她说：有图就别再另开一个侧栏图标，记忆就在这张图顶上开一格。
// 数据走 dsh-ming-memory 的只读路由，跟图没关系——一个列旧账，一个看形状。
const MEMORY_API = '/_dsh/dsh-ming-memory'

function fmtClock(ms) {
  if (!ms) return ''
  const d = new Date(ms)
  const p = (n) => String(n).padStart(2, '0')
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
}

// 2026-11-07 19:0x：记忆 tab 改成吃**统一节点模型**（/_dsh/dsh-ming-graph/neurons/unified），
// 不再依赖 dsh-ming-memory 的 /list——那个插件的 Host 半端一直没能加载（exports 里没有 "."），
// 每次打开都是 △ HTTP 404。图这边本来就把 notes 全读进来了，章也在里面，不用再绕一圈。
function MemoryView(props) {
  const q = (props && props.q) || ''
  // 2026-11-07 21:4x：选中态穿过视图。外面（星图、搜索）选中了哪条，这里跟着展开；
  // 这里点开一条，也报回上层——切回星图时对着同一颗星。之前三个视图各管各的。
  const selId = (props && props.selId) || ''
  const [items, setItems] = useState([])
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [openId, setOpenId] = useState('')
  const [chap, setChap] = useState('')

  const load = useCallback(() => {
    setBusy(true)
    setErr('')
    return fetch('/_dsh/dsh-ming-graph/neurons/unified', { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json() })
      .then((d) => {
        if (d && d.error) { setErr(String(d.error)); return }
        const rows = (d.nodes || [])
          .filter((n) => n.kind === 'memory')
          .map((n) => ({
            id: n.id,
            title: n.title || n.id,
            body: n.body || n.excerpt || '',
            date: n.date || '',
            at: n.at || 0,
            tags: (n.tags || []).join(' '),
            source: n.source || '',
            chapter: n.chapter || 0,
            chapterName: n.chapterName || '',
          }))
          .sort((a, b) => (b.at || 0) - (a.at || 0))
        setItems(rows)
        if (props && props.onData) props.onData({ items: rows, total: rows.length })
      })
      .catch((e) => setErr(String((e && e.message) || e)))
      .finally(() => setBusy(false))
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!selId) return
    if (items.some((x) => x.id === selId)) setOpenId(selId)
  }, [selId, items])

  const kw = q.trim().toLowerCase()
  const shown = items
    .filter((it) => (!kw ? true : (it.id + ' ' + it.title + ' ' + it.tags + ' ' + it.source).toLowerCase().indexOf(kw) >= 0))
    .filter((it) => {
      if (!chap) return true
      if (chap === 'none') return !it.chapter
      return String(it.chapter) === chap
    })

  const opened = openId ? items.find((x) => x.id === openId) : null
  if (opened) {
    return h('div', { className: 'ming-panel' },
      h('div', { className: 'ming-head' },
        h('button', { className: 'ming-btn', onClick: () => setOpenId('') }, '← 返回'),
        h('span', { className: 'ming-title', style: { fontSize: 13 } }, opened.title),
        opened.chapter ? h('span', { className: 'ming-pill' }, '第' + opened.chapter + '章') : null,
        h('span', { className: 'ming-sub', style: { marginLeft: 'auto' } }, opened.date),
      ),
      h('div', { className: 'ming-body ming-scroll' },
        h('div', {
          className: 'ming-card',
          style: { whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 13.5, lineHeight: 1.85, letterSpacing: '.01em' },
        }, opened.body || '（这条没有正文）'),
      ),
    )
  }

  return h('div', { className: 'ming-panel' },
    h('div', { className: 'ming-head' },
      h('span', { className: 'ming-sub' }, busy ? '读取中…' : items.length + ' 条记忆'),
      h('button', { className: 'ming-btn', style: { marginLeft: 'auto' }, onClick: load }, '刷新'),
    ),
    h('div', { className: 'ming-body ming-scroll' },
      err ? h('div', { className: 'ming-empty' }, '△ ' + err) : null,
      // 按章筛选：八章 + 未分章
      items.length ? h('div', { style: { display: 'flex', gap: 5, flexWrap: 'wrap', padding: '2px 0 8px' } },
        ['', '1', '2', '3', '4', '5', '6', '7', '8', 'none'].map((c) => {
          const hit = items.find((x) => String(x.chapter) === c)
          const label = c === '' ? '全部' : c === 'none' ? '未分章' : ((hit && hit.chapterName) || ('第' + c + '章'))
          return h('button', {
            key: c || 'all',
            className: 'mg-chip' + (chap === c ? ' on' : ''),
            onClick: () => setChap(c),
          }, label)
        }),
      ) : null,
      (!err && shown.length === 0) ? h('div', { className: 'ming-empty' }, busy ? '…' : '没有匹配的记忆') : null,
      h('div', null, shown.map((it) => h('div', {
        key: it.id,
        className: 'ming-row',
        style: { cursor: 'pointer' },
        onClick: () => { setOpenId(it.id); if (props.onSelect) props.onSelect(it.id) },
        title: it.id,
      },
        h('span', { style: { flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, it.title),
        it.chapter ? h('span', { className: 'ming-pill' }, '第' + it.chapter + '章') : null,
        h('span', { className: 'ming-sub' }, it.date || ''),
      ))),
    ),
  )
}

// 2026-11-07 16:30 加、19:1x 补回（做记忆 tab 替换时被一并切掉了，于是面板一崩就整块黑）。
class PanelBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: '' } }
  static getDerivedStateFromError(e) { return { err: String((e && e.stack) || e) } }
  componentDidCatch(e) {
    try {
      this.setState({ err: String((e && e.stack) || e) + ' / 最近一条全局错误：' + String(window.__MG_ERR || '(无)') })
    } catch (x) {}
  }
  render() {
    if (this.state.err) {
      return h('div', { style: { padding: '14px 18px', fontFamily: 'ui-monospace, Consolas, monospace', fontSize: '12px', lineHeight: '18px', whiteSpace: 'pre-wrap', color: 'var(--dsw-alias-state-error-primary)', overflow: 'auto', height: '100%' } },
        '家底崩了（v' + MG_VERSION + '）：' + this.state.err)
    }
    return this.props.children
  }
}

function NeuronPanel() {
  const holder = useRef(null)
  const viewRef = useRef(null)
  const [status, setStatus] = useState('loading')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [info, setInfo] = useState(null)
  const [view, setView] = useState('neuron')      // neuron | star
  // 2026-11-07 21:4x：一个选中态穿过三个视图（神经元的搜索 / 星图点星 / 记忆列表）。
  // selRef 是给「挂载那一刻」用的：星图 effect 的闭包里拿不到最新的 selId。
  const [selId, setSelId] = useState('')
  const selRef = useRef('')
  useEffect(() => { selRef.current = selId }, [selId])
  const [q, setQ] = useState('')
  const [ways, setWays] = useState(WAYS.slice())
  const starHost = useRef(null)
  const starRef = useRef(null)
  const [starState, setStarState] = useState('idle')   // idle | loading | ready | error
  const [starErr, setStarErr] = useState('')
  // 2026-11-07 12:30：诊断条。她说「没有图」但没给报错，我不猜了——
  // 把 HTTP 状态、拿到几个节点、mount 有没有抛错直接写在面板上。
  const [starInfo, setStarInfo] = useState('')
  const [starData, setStarData] = useState(null)

  // force=false 走缓存；force=true 走 /neurons/refresh（Host 重读文件、重新加载 neuron.js）
  const load = useCallback((force) => {
    setBusy(true)
    const url = API + (force ? '/neurons/refresh' : '/neurons')
    return fetch(url, { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json() })
      .then((d) => {
        // 2026-11-07 22:1x：群号/群名从本机配置下发，不写进代码（这个仓是公开的）。
        if (d && d.roomLabels) { try { window.__MING_ROOMS = d.roomLabels } catch (e) {} }
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
    load(false)
    return () => {
      if (viewRef.current && viewRef.current.destroy) { viewRef.current.destroy(); viewRef.current = null }
    }
  }, [])

  // top 栏 → 渲染层：数据不动，只改「看什么」
  useEffect(() => {
    if (viewRef.current && viewRef.current.setQuery) viewRef.current.setQuery(q)
  }, [q, status])

  useEffect(() => {
    if (viewRef.current && viewRef.current.setWayFilter) viewRef.current.setWayFilter(ways)
  }, [ways, status])

  function toggleWay(t) {
    setWays((cur) => (cur.indexOf(t) >= 0 ? cur.filter((x) => x !== t) : cur.concat([t])))
  }

  const memRef = useRef(null)
  const [reloadTick, setReloadTick] = useState(0)
  // 2026-11-07 18:3x：星图那份 unified 是带缓存的。记忆卡刚生成、面板还显示 0 章，
  // 就是因为重挂只会再打一次 /neurons/unified（命中缓存）。点刷新要强制重建。
  const forceStar = useRef(false)

  // 导出：三个视图都出东西——神经元出图、星图出统一模型、记忆出当前列表。
  function exportJson() {
    let snap = null
    let tag = 'neurons'
    if (view === 'neuron') {
      snap = viewRef.current && viewRef.current.snapshot ? viewRef.current.snapshot() : null
    } else if (view === 'star') {
      snap = starData; tag = 'unified'
    } else if (view === 'memory') {
      snap = memRef.current; tag = 'archive'
    }
    if (!snap) return
    const blob = new Blob([JSON.stringify(snap, null, 1)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'ming-' + tag + '-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '') + '.json'
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 3000)
  }

  function refreshAll() {
    setReloadTick((t) => t + 1)
    setQ('')
    if (view === 'neuron') load(true)
    if (view === 'star') forceStar.current = true
  }

  // 星图：吃同一份统一节点模型（/neurons/unified），画法在 src/star-view.js
  useEffect(() => {
    if (view !== 'star') {
      if (starRef.current && starRef.current.destroy) { starRef.current.destroy(); starRef.current = null }
      setStarState('idle')
      return
    }
    setStarState('loading')
    let alive = true
    const starUrl = API + (forceStar.current ? '/neurons/unified/refresh' : '/neurons/unified')
    forceStar.current = false
    fetch(starUrl, { cache: 'no-store' })
      .then((r) => {
        setStarInfo('HTTP ' + r.status)
        if (!r.ok) throw new Error('HTTP ' + r.status)
        return r.json()
      })
      .then((d) => {
        if (d && d.roomLabels) { try { window.__MING_ROOMS = d.roomLabels } catch (e) {} }
        if (!alive) return
        if (d && d.error) { setStarErr(String(d.error)); setStarState('error'); return }
        if (!window.__MingNeuronView) { setStarErr('渲染层没装上（neuron-view 未加载）'); setStarState('error'); return }
        const nNodes = (d.nodes || []).length
        setStarInfo(`HTTP 200 · 节点 ${nNodes} · ${d.stats && d.stats.source || ''}`)
        // 2026-11-07 15:00：不画 canvas 了，改用 DOM 版银河（src/star-view.js 重写）。
        // 这一版每个点是一个 div，画不出来只可能是「没挂上」，不可能是「画错了」。
        const SV = window.__MingStarView
        if (!SV) { setStarErr('星图渲染层没装上（star-view 未加载）'); setStarState('error'); return }
        try {
          if (starRef.current && starRef.current.destroy) starRef.current.destroy()
          starRef.current = SV.mount(starHost.current, d, { onSelect: setSelId, initialId: selRef.current })
          const st = (starRef.current.stats && starRef.current.stats()) || {}
          setStarInfo('节点 ' + nNodes + ' · 已画 ' + (st.dots || 0) + ' 点 · ' + (st.size ? st.size[0] + '×' + st.size[1] : '') + ' · ' + ((d.stats && d.stats.source) || ''))
          setStarState('ready')
        } catch (e) {
          setStarErr('挂载失败：' + String((e && e.message) || e))
          setStarState('error')
        }
      })
      .catch((e) => { if (alive) { setStarErr(String((e && e.message) || e)); setStarState('error') } })
    return () => { alive = false }
  }, [view, reloadTick])


  const when = info && info.at ? new Date(info.at).toLocaleTimeString('zh-CN', { hour12: false }) : ''
  const meta = info
    ? `更新于 ${when} · ${info.memories} 条记忆 / ${info.edges} 条线${info.loadError ? ' · 建图代码加载失败，用的是旧模块' : ''}`
    : ''

  // 星图那一格：真的接上了（2026-11-07），数据来自 /neurons/unified，画法是 src/star-view.js。

  return h('div', { className: 'mg-mount' },
    h('style', null, PAGE_CSS + MING_UI.css('ming')),

    // ---- top 栏：全局操作 ----
    h('div', { className: 'mg-top' },
      // 2026-11-07 21:53 她定：名字用回「她的一生」，括号里挂 hers life。
      // 上一轮我起的「家底」她不要——名字是她的，我改回来，理由记在 live/星图合并 里。
      h('span', { className: 'mg-brand' }, '她的一生', h('i', null, 'hers life')),
      // tab 分两组：竖线左边是记下来的，右边是我干活用的。
      h('div', { className: 'mg-seg' },
        [['neuron', '神经元'], ['star', '星图'], ['memory', '记忆'], ['|'],
          ['browse', '自己玩'], ['interest', '兴趣'], ['voice', '声音'], ['desktop', '桌面'], ['resume', '接续']]
          .map(([k, label]) => k === '|'
            ? h('span', { key: 'sep', style: { width: 1, height: 18, background: 'var(--dsw-alias-border-secondary, rgba(150,150,170,.28))', margin: '0 4px', alignSelf: 'center' } })
            : h('button', { key: k, className: view === k ? 'on' : '', onClick: () => setView(k) }, label)),
      ),
      // 2026-11-07 15:0x：搜索三个视图共用——神经元过滤节点、星图定位一颗星、记忆过滤列表。
      h('input', {
        className: 'mg-input',
        placeholder: view === 'memory' ? '按 id / 标签 / 来源过滤' : (view === 'star' ? '找一颗星：标题或正文里的词'
          : view === 'neuron' ? '搜标题 / 正文里的词' : '（这个视图不用搜）'),
        disabled: view === 'browse' || view === 'interest' || view === 'voice' || view === 'desktop' || view === 'resume',
        value: q,
        onChange: (e) => setQ(e.target.value),
      }),
      view === 'neuron' ? h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
        WAYS.map((t) => h('button', {
          key: t,
          className: 'mg-chip' + (ways.indexOf(t) >= 0 ? ' on' : ''),
          disabled: status !== 'ready',
          title: '关掉这一类边，节点不删',
          onClick: () => toggleWay(t),
        }, t)),
      ) : null,
      h('span', { className: 'mg-gap' }),
      h('button', {
        className: 'mg-btn',
        disabled: view === 'neuron' ? status !== 'ready' : (view === 'star' ? starState !== 'ready' : false),
        onClick: exportJson,
        title: view === 'memory' ? '导出当前这份归档列表' : (view === 'star' ? '导出统一节点模型' : '把这整份图导出成 JSON'),
      }, '导出'),
      h('button', {
        className: 'mg-btn',
        disabled: busy,
        title: '重读数据源（神经元顺带重新加载建图代码）',
        onClick: refreshAll,
      }, busy ? '刷新中…' : '刷新'),
    ),

    // ---- 第二行：状态（切到星图时也用它报状态，免得"点了没反应"看不出是卡在哪） ----
    h('div', { className: 'mg-bar' },
      h('span', { className: 'mg-meta' },
        view === 'browse' ? '自己玩 · 什么时候醒，看什么，记了什么'
          : view === 'interest' ? '兴趣 · 叫不叫得醒，还有为什么'
            : view === 'voice' ? '声音 · 合出来的 mp3，点 ▶ 试听'
              : view === 'desktop' ? '桌面 · 这只手最近看见的和说出来的'
                : view === 'resume' ? '接续 · 现在在做哪件事，被打断过几次'
              : view === 'memory'
          ? '记忆库 · 只读，点一行看正文'
          : view === 'neuron'
            ? (status === 'ready' ? meta : '')
            : (starState === 'error' ? '星图读不到：' + starErr
              : starState === 'ready' ? ('星图 · ' + (starInfo || '已加载'))
                : '星图 · 正在拼统一节点模型…')),
    ),

    // 2026-11-07 12:37：报错 `Cannot set properties of null (setting 'innerHTML')`。
    // 根因：星图那个 div 是条件渲染的，effect 跑的那一瞬 ref 还是 null，mount 里 host.innerHTML 就炸在这。
    // 改成**两个容器都常驻**、只用 display 切换：ref 从挂载起一直有效，切换时不再有「还没有节点」的空窗。
    // 记忆库（跟另外两块并列，同样靠 display 切换；切走就卸载，省得一直挂着轮询）
    h('div', { key: 'mem' + reloadTick, className: 'mg-holder', style: view === 'memory' ? null : { display: 'none' } },
      view === 'memory' ? h(MemoryView, { q, selId, onSelect: setSelId, onData: (d) => { memRef.current = d } }) : null,
    ),
    // 逛到哪儿 / 兴趣 / 声音：从各自的插件搬进来的渲染，路由还是各自的
    h('div', { key: 'browse' + reloadTick, className: 'mg-holder', style: view === 'browse' ? null : { display: 'none' } },
      view === 'browse' ? h(BrowsePanel) : null,
    ),
    h('div', { key: 'interest' + reloadTick, className: 'mg-holder', style: view === 'interest' ? null : { display: 'none' } },
      view === 'interest' ? h(InterestPanel) : null,
    ),
    h('div', { key: 'voice' + reloadTick, className: 'mg-holder', style: view === 'voice' ? null : { display: 'none' } },
      view === 'voice' ? h(VoicePanel) : null,
    ),
    // 2026-11-07 19:1x 她说「还是别合并了」：桌面和接续各留一格。
    h('div', { key: 'desktop' + reloadTick, className: 'mg-holder', style: view === 'desktop' ? null : { display: 'none' } },
      view === 'desktop' ? h(DesktopPanel) : null,
    ),
    h('div', { key: 'resume' + reloadTick, className: 'mg-holder', style: view === 'resume' ? null : { display: 'none' } },
      view === 'resume' ? h(ResumePanel) : null,
    ),

    h('div', {
      ref: holder, className: 'mg-holder',
      style: view === 'neuron' && status === 'ready' ? null : { display: 'none' },
    }),
    // 星图：DOM 版银河（src/star-view.js），mount 到这个 ref；切走就 destroy，别让 1271 个 div 一直挂着。
    // 2026-11-07 18:1x：这个 div 里**只能有我挂的东西**。上一版把「加载中/读不到」两行字也渲染在里面，
    // star-view 挂载时 host.innerHTML='' 把它们清掉了，React 回头要删这两行 —— 它已经不在 DOM 里，
    // 于是 NotFoundError: removeChild。提示挪到外面，容器本身永远空着。
    h('div', { className: 'mg-holder', style: view === 'star' ? null : { display: 'none' } },
      starState === 'loading' ? h('div', { className: 'mg-msg' }, '正在拼统一节点模型…') : null,
      starState === 'error' ? h('div', { className: 'mg-msg err' }, '星图读不到：' + starErr) : null,
      h('div', { ref: starHost, style: { flex: 1, minHeight: '420px', display: 'flex', flexDirection: 'column' } }),
    ),

    view === 'neuron' && status === 'loading' ? h('div', { className: 'mg-msg' }, '正在读两侧记忆库…（第一次要扫一遍文件，大约两秒）') : null,
    view === 'neuron' && status === 'error' ? h('div', { className: 'mg-msg err' }, '读不到：' + err) : null,
  )
}

return {
  inject: ['slots'],
  apply(ctx) {
    ctx.slots.inject('main', () => ctx.slots.register({
      name: 'main',
      key: 'ming-graph',
    }, () => h(PanelBoundary, null, h(NeuronPanel))))
    ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
      name: 'sidebar.panellist',
      id: 'ming-graph',
      order: 22,
      label: () => PANEL_LABEL,
    }, GraphIcon))
  },
}

  },
})
