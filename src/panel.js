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

const API = '/_dsh/dsh-ming-graph'

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

function NeuronPanel() {
  const holder = useRef(null)
  const viewRef = useRef(null)
  const [status, setStatus] = useState('loading')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [info, setInfo] = useState(null)
  const [view, setView] = useState('neuron')      // neuron | star
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

  function exportJson() {
    const snap = viewRef.current && viewRef.current.snapshot ? viewRef.current.snapshot() : null
    if (!snap) return
    const blob = new Blob([JSON.stringify(snap, null, 1)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'ming-neurons-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '') + '.json'
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 3000)
  }

  // 星图：吃同一份统一节点模型（/neurons/unified），画法在 src/star-view.js
  useEffect(() => {
    if (view !== 'star') {
      if (starRef.current && starRef.current.destroy) { starRef.current.destroy(); starRef.current = null }
      setStarState('idle')
      return
    }
    if (starRef.current) return
    setStarState('loading')
    let alive = true
    fetch(API + '/neurons/unified', { cache: 'no-store' })
      .then((r) => {
        setStarInfo('HTTP ' + r.status)
        if (!r.ok) throw new Error('HTTP ' + r.status)
        return r.json()
      })
      .then((d) => {
        if (!alive) return
        if (d && d.error) { setStarErr(String(d.error)); setStarState('error'); return }
        if (!window.__MingNeuronView) { setStarErr('渲染层没装上（neuron-view 未加载）'); setStarState('error'); return }
        const nNodes = (d.nodes || []).length
        setStarInfo(`HTTP 200 · 节点 ${nNodes} · ${d.stats && d.stats.source || ''}`)
        // 2026-11-07 12:58：上一版只量了 starHost，量不出真正的问题（它 360，但里面可能是 0）。
        // mount 之后延迟再量一次 stage 和 canvas —— 画不出来只有两种可能：尺寸 0，或者坐标没落在画布上。
        const probe = (tag) => {
          try {
            const st = starHost.current && starHost.current.querySelector('.nv-stage')
            const cv = starHost.current && starHost.current.querySelector('canvas')
            const host = starHost.current
            setStarInfo(`${tag} · 节点 ${nNodes} · host ${host ? host.clientWidth + '×' + host.clientHeight : '无'}` +
              ` · stage ${st ? st.clientWidth + '×' + st.clientHeight : '无'}` +
              ` · canvas ${cv ? cv.width + '×' + cv.height : '无'}` +
              (window.__NV_DEBUG ? ' · ' + JSON.stringify(window.__NV_DEBUG) : ' · 无DEBUG'))
          } catch (e) { setStarInfo(tag + ' · 测量失败 ' + e.message) }
        }
        probe('挂载后')
        // 2026-11-07 12:25：她说「照着神经元改，别自己想代码」——
        // 星图现在就是同一套渲染（3D 球面、光晕、拖拽、侧栏、plane 详情），
        // 只把布局换成 galaxy（核球 + 旋臂 + 时间环），不画边。
        // 2026-11-07 13:50：不走 canvas 了。今天在画布上耗了一小时——投影、尺寸链、RO 抖动，
        // 每一层都能让图变成空白。换成纯 DOM 网格：没有画布，就不存在"画不出来"。
        setStarData(d)
        setStarState('ready')
      })
      .catch((e) => { if (alive) { setStarErr(String((e && e.message) || e)); setStarState('error') } })
    return () => { alive = false }
  }, [view])

  // 2026-11-07 13:51：DOM 网格的数据，一次算好；渲染只用 div，不碰 canvas。
  const grid = (() => {
    const nodes = (starData && starData.nodes) || []
    if (!nodes.length) return null
    const ROWS = ['深水区', '巅峰之战', '浅水区', '其他群', '私聊', '系统']
    const rowOf = (n) => {
      const r = String(n.room || '')
      if (r.includes('<group-a>')) return 0
      if (r.includes('<group-b>')) return 1
      if (r.includes('<group-c>')) return 2
      if (r.startsWith('group')) return 3
      if (r.startsWith('private')) return 4
      return 5
    }
    const timed = nodes.filter((n) => n.at)
    const t0 = timed.length ? Math.min(...timed.map((n) => n.at)) : Date.now()
    const t1 = timed.length ? Math.max(...timed.map((n) => n.at)) : Date.now()
    const DAY = 86400000
    const days = Math.max(1, Math.floor((t1 - t0) / DAY) + 1)
    const cell = new Map()
    const rowCount = ROWS.map(() => 0)
    let max = 0
    for (const n of nodes) {
      const ri = rowOf(n)
      rowCount[ri]++
      const d = n.at ? Math.floor((n.at - t0) / DAY) : 0
      const k = ri * 10000 + d
      const v = (cell.get(k) || 0) + 1
      cell.set(k, v)
      if (v > max) max = v
    }
    const label = (d) => new Date(t0 + d * DAY).toISOString().slice(5, 10)
    return { ROWS, days, cell, rowCount, max: Math.max(1, max), label, total: nodes.length }
  })()

  const when = info && info.at ? new Date(info.at).toLocaleTimeString('zh-CN', { hour12: false }) : ''
  const meta = info
    ? `更新于 ${when} · ${info.memories} 条记忆 / ${info.edges} 条线${info.loadError ? ' · 建图代码加载失败，用的是旧模块' : ''}`
    : ''

  // 星图那一格：真的接上了（2026-11-07），数据来自 /neurons/unified，画法是 src/star-view.js。

  return h('div', { className: 'mg-mount' },
    h('style', null, PAGE_CSS),

    // ---- top 栏：全局操作 ----
    h('div', { className: 'mg-top' },
      h('div', { className: 'mg-seg' },
        h('button', { className: view === 'neuron' ? 'on' : '', onClick: () => setView('neuron') }, '神经元'),
        h('button', { className: view === 'star' ? 'on' : '', onClick: () => setView('star') }, '星图'),
      ),
      h('input', {
        className: 'mg-input',
        placeholder: '搜标题 / 正文里的词',
        value: q,
        disabled: view !== 'neuron' || status !== 'ready',
        onChange: (e) => setQ(e.target.value),
      }),
      h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
        WAYS.map((t) => h('button', {
          key: t,
          className: 'mg-chip' + (ways.indexOf(t) >= 0 ? ' on' : ''),
          disabled: view !== 'neuron' || status !== 'ready',
          title: '关掉这一类边，节点不删',
          onClick: () => toggleWay(t),
        }, t)),
      ),
      h('span', { className: 'mg-gap' }),
      h('button', { className: 'mg-btn', disabled: view !== 'neuron' || status !== 'ready', onClick: exportJson, title: '把这整份图导出成 JSON' }, '导出'),
      h('button', {
        className: 'mg-btn',
        disabled: busy,
        title: '重读两侧记忆库，并重新加载建图代码（改了 neuron.js 也按这个就生效）',
        onClick: () => load(true),
      }, busy ? '刷新中…' : '刷新'),
    ),

    // ---- 第二行：状态（切到星图时也用它报状态，免得"点了没反应"看不出是卡在哪） ----
    h('div', { className: 'mg-bar' },
      h('span', { className: 'mg-meta' },
        view === 'neuron'
          ? (status === 'ready' ? meta : '')
          : (starState === 'error' ? '星图读不到：' + starErr
            : starState === 'ready' ? '星图 · 统一节点模型已加载'
              : '星图 · 正在拼统一节点模型…')),
    ),

    // 2026-11-07 12:37：报错 `Cannot set properties of null (setting 'innerHTML')`。
    // 根因：星图那个 div 是条件渲染的，effect 跑的那一瞬 ref 还是 null，mount 里 host.innerHTML 就炸在这。
    // 改成**两个容器都常驻**、只用 display 切换：ref 从挂载起一直有效，切换时不再有「还没有节点」的空窗。
    h('div', {
      ref: holder, className: 'mg-holder',
      style: view === 'neuron' && status === 'ready' ? null : { display: 'none' },
    }),
    h('div', { className: 'mg-holder', style: view === 'star' ? null : { display: 'none' } },
      h('div', { className: 'mg-bar', style: { padding: '7px 16px' } },
        h('b', { style: { fontSize: 13, color: 'var(--dsw-alias-label-primary)', marginRight: 10 } }, '记忆地图'),
        h('span', { className: 'mg-meta' }, grid ? (grid.total + ' 条 · 跨 ' + grid.days + ' 天') : '')),
      starState === 'loading' ? h('div', { className: 'mg-msg' }, '正在拼统一节点模型…') : null,
      starState === 'error' ? h('div', { className: 'mg-msg err' }, '星图读不到：' + starErr) : null,
      grid ? h('div', { className: 'mg-gridwrap' },
        h('div', { className: 'mg-grid', style: { gridTemplateColumns: '96px repeat(' + grid.days + ', minmax(10px, 1fr))' } },
          grid.ROWS.flatMap((name, ri) => [
            h('div', { key: 'l' + ri, className: 'mg-rl' }, name, h('b', null, String(grid.rowCount[ri]))),
            ...Array.from({ length: grid.days }, (_, d) => {
              const n = grid.cell.get(ri * 10000 + d) || 0
              const t = n ? Math.min(1, Math.pow(n / grid.max, 0.72)) : 0
              return h('div', {
                key: ri + '-' + d,
                className: 'mg-cell',
                title: grid.label(d) + ' · ' + name + ' · ' + n + ' 条',
                style: n
                  ? {
                    background: 'rgba(45,212,191,' + (0.12 + 0.78 * t).toFixed(2) + ')',
                    boxShadow: t > 0.8 ? '0 0 9px rgba(45,212,191,.45)' : undefined,
                  }
                  : { background: 'rgba(255,255,255,.035)' },
              })
            }),
          ]),
        ),
        h('div', { className: 'mg-grid mg-xaxis', style: { gridTemplateColumns: '96px repeat(' + grid.days + ', minmax(10px, 1fr))' } },
          h('div', { key: 'x0' }),
          ...Array.from({ length: grid.days }, (_, d) => h('div', { key: 'x' + d, className: 'mg-xt' }, d % 4 === 0 ? grid.label(d) : '')),
        ),
        h('div', { className: 'mg-legend' },
          h('span', null, '少'),
          [0.18, 0.38, 0.58, 0.78, 0.9].map((a, i) =>
            h('span', { key: 'g' + i, className: 'mg-lg', style: { background: 'rgba(45,212,191,' + a + ')' } })),
          h('span', null, '多'),
          h('span', { style: { marginLeft: 14, opacity: .7 } }, '共 ' + grid.total + ' 条 · ' + grid.days + ' 天'),
        ),
      ) : null,
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
    }, NeuronPanel))
    ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
      name: 'sidebar.panellist',
      id: 'ming-graph',
      order: 22,
      label: () => '关系图',
    }, GraphIcon))
  },
}
