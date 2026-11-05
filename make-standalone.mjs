/**
 * make-standalone.mjs —— 生成一个「双击就开」的单文件 HTML（数据也内嵌）
 *
 * 为什么要它：面板要重启 DSH 才加载新代码，而这份 HTML 现在就打得开。
 * 两份看的是同一份数据、同一份渲染代码（src/neuron-view.js），不是两套东西。
 *
 *   node make-standalone.mjs            → 写 C:\dsh\<workspace>\live\memory-neuron.html
 *   node make-standalone.mjs <输出路径>
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DEFAULTS, readDshNotes, readQqObservations, buildNeuron } from './neuron.js'
import { mergePeople } from './people-merge.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const outPath = process.argv[2] || 'C:\\dsh\\<workspace>\\live\\memory-neuron.html'

const [dsh, qq] = await Promise.all([readDshNotes(DEFAULTS.dshMemoryDir), readQqObservations(DEFAULTS.qqObservations)])
// 人名：people/_index.json 里记着 QQ 号 → 群名片。不传它，图上就全是号码
let names = new Map()
try {
  const idx = JSON.parse(await fs.readFile('C:\\dsh\\<workspace>\\people\\_index.json', 'utf8'))
  for (const [id, arr] of Object.entries(idx.byId || {})) {
    if (arr && arr[0] && arr[0].name) names.set(String(id), String(arr[0].name))
  }
} catch { /* 没有索引就退回号码 */ }
const graph = mergePeople(buildNeuron({ dsh, qq, cfg: { ownerId: '<owner-qq>' }, names }))
const view = await fs.readFile(path.join(here, 'src', 'neuron-view.js'), 'utf8')

const html = `<!doctype html>
<html lang="zh-CN"><head>
<meta charset="utf-8">
<title>记忆神经元 · 溟</title>
<style>
:root{--dsw-alias-label-primary:#e6e8ee;--dsw-alias-label-secondary:#a8adba;--dsw-alias-label-tertiary:#767c8c;
--dsw-alias-bg-layer-1:#171a21;--dsw-alias-bg-layer-2:#1f232c;--dsw-alias-border-l2:#2a2f3a;--dsw-alias-border-l3:#3a414f;
--dsw-alias-state-error-primary:#ef6b6b}
html,body{margin:0;height:100%;background:#0d0f14;color:#e6e8ee;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
#app{height:100%}
</style></head>
<body><div id="app"></div>
<script>${view}</script>
<script>
const DATA = ${JSON.stringify(graph)};
__MingNeuronView.mount(document.getElementById('app'), DATA, {});
</script>
</body></html>
`

await fs.mkdir(path.dirname(outPath), { recursive: true })
await fs.writeFile(outPath, html, 'utf8')
console.log('写好：', outPath)
console.log('  ', graph.stats.memories, '条记忆 /', graph.stats.projects, '个项目 /', graph.stats.edges, '条边 / 孤立', graph.stats.orphans)
console.log('  ', (html.length / 1024 / 1024).toFixed(2), 'MB')
