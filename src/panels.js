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

