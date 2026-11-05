# dsh-ming-graph

一个 DSH 插件：**把记忆库画成一张能读的图**——每条真记忆一个点，每条边都答得出「它凭什么连」。

入口在「插件」页的 tab 栏，和插件市场并排，点开是「关系图」。

```
~/.dsh/memory/notes/*.md        ┐
QQ-Agent 的 observations.jsonl  ├──► 纯读盘建图（不过模型）──► 快照 JSON ──► 前端画图
people/_index.json（号码→昵称） ┘
```

## 为什么不是一张「好看的图」

把记忆做成星云、粒子、力导向球体的东西很多，问题是**它们不回答任何问题**：两个点为什么连着？因为距离近？因为颜色像？那些边是布局算出来的，不是事实。

这里的规矩只有一条：**边必须有理由，理由必须能读。**

所以边只有四种，每种都带一个 `why` 字符串，点开节点能逐条读：

| 边 | 凭什么连 | why 里写什么 |
|---|---|---|
| 引用 | A 的正文里出现了 B 的关键词 | 那个关键词 |
| 共词 | 两条记忆的关键词交集 ≥2 | 是哪几个词 |
| 归属 | 项目节点 ↔ 该项目下每一条记忆 | 项目名 |
| 补边 | 同项目、按时间排下来紧挨着的两条 | 时间差 |

不编数据、不画演示点。读不到就报错，不拿假货顶上。

## 三个视图

- **人**：星图。中心是记录者，边宽 = 关于那个人的记忆条数，只画 count ≥ 3 的。
- **主题**：词共现。只算同一条记忆里一起出现 ≥2 次的词；父子词不连边。
- **时间线**：按天，两侧分开。

**不给人和人连边。** 按共享词连过一次，连出来全是「机器人 ↔ 直接」这种噪音。人和人之间的关系，只能靠一条条能核的计数，不能靠词。

## 数据源（只读）

- DSH 侧：`~/.dsh/memory/notes/*.md` 的 frontmatter。**扫目录，不读 index.json**——索引会有滞后，目录才是全的。老笔记没有 `created` 就从文件名 `20261020-123127-…` 里解析。
- QQ 侧：QQ-Agent 的 `data/memory/observations.jsonl`。**不读 `evidence.jsonl`**，那文件几十 MB，看不过来。
- 人名：`people/_index.json`（号码 → 昵称）。昵称会改，认人只认号。

## 路由与刷新

- `GET /_dsh/dsh-ming-graph/snapshot` —— 当前快照；`/refresh` 强制重算。
- 用 `connection.requestRejection` 做认证边界。**curl 不带 cookie 会拿到 401——那个 401 就是路由活着的证据。**
- Host 端每 `syncSeconds`（默认 120）stat 一次三个源，mtime 变了才重算（读 20ms + 算 100ms）。
- Client 端每 60 秒拉一次，`generatedAt` 没变就不重绘。

## 人这一层：一个人一颗点

早期版本里，同一个人会在私聊房间、群成员、观察记录里各成一个点，看起来像好几个人。现在按**号码**合并：一个人一颗点，跨房间的记忆都挂在他身上；房间只作场所。

私聊房间不单独成点——一对一没有信息量。群保留场所节点。

`neuron-check.mjs` 会顺手报这件事：同号多点不为 0 就算坏。

## 自己验

```bash
node neuron-check.mjs            # 报节点/边/孤立点/同号多点，并落一份 JSON 给前端调试
node neuron-check.mjs out.json   # 指定落盘路径
```

输出的是数据源的条数、图的规模、孤立点比例，以及人这一层的健康度。**它是自验，不是演示**：数字不对就是不对。

## 装

```yaml
# profile 的 cordis.patch.yml
- id: ming-graph
  config:
    syncSeconds: 120
```

路径默认指向本机（`C:\dsh\...`）。换机器时在配置里改 `dshMemoryDir` / `qqObservations` / `peopleIndex`，或者用同名环境变量。

**装完要看两处**：Host 起来了不等于界面在——client 半边要等一次 HMR 重载（touch `client.js` 等几秒）才会注册进 `plugins.tab`；`Slots.listSubTree` 的 occupants 里能看到 `ming-graph` 才算成。

## 目录

```
index.js          Host 端：路由、快照、定时重算
neuron.js         建图（纯函数）+ 两个读盘函数
client.js         前端入口
src/neuron-view.js  画图
neuron-check.mjs  自验
people-merge.mjs  按号码合并人
build.mjs         打包
```

## License

MIT
