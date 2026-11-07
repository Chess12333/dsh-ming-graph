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
