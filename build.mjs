/**
 * build.mjs —— 把 src/neuron-view.js + src/panel.js 拼成 client.js
 *
 * client.js 是生成物，别手改（改了下次 build 就没了）。
 * 拼法很简单：一个 __ModuleLoader__.load 工厂，先把渲染层塞进去，再塞面板壳。
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const read = (p) => fs.readFile(path.join(here, p), 'utf8')

const view = await read('src/neuron-view.js')
const star = await read('src/star-view.js')
const panel = await read('src/panel.js')

const banner = `/**
 * dsh-ming-graph —— 记忆关系图 / 记忆神经元（Client 半端）
 *
 * ⚠ 这个文件是 build.mjs 生成的：改代码请改 src/neuron-view.js 与 src/panel.js，然后 \`node build.mjs\`。
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

`

const out = banner + view + '\n\n' + star + '\n\n' + panel + '\n  },\n})\n'
await fs.writeFile(path.join(here, 'client.js'), out, 'utf8')
console.log('client.js 写好：', out.length, '字节')
