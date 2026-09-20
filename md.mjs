// 原稿md → HTML。使う記法だけに絞った変換器（依存ゼロ）。
// 対応: # 見出し / ## N. 節 / ### 小見出し / 表 / ```copy / ::: tabs / [[screenshot: ]] / - 箇条書き / - [ ] チェック / **強調**

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const inline = (s) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');

const TOOLS = { ChatGPT: 'chatgpt', Claude: 'claude', Gemini: 'gemini' };

// 「今日の流れ」表の最終列にある節番号を、その節へのリンクにする
function linkNums(cell, ids) {
  return cell.replace(/(?<![0-9])([1-9])(?![0-9])/g, (m, n) =>
    ids.has(`s${n}`) ? `<a href="#s${n}">${n}</a>` : m
  );
}

function table(rows, opts = {}) {
  const cells = (line) =>
    line
      .replace(/^\s*\|/, '')
      .replace(/\|\s*$/, '')
      .split('|')
      .map((c) => c.trim());
  const head = cells(rows[0]);
  const body = rows.slice(2).map(cells);
  const isFlow = opts.linkIds && head[1] === 'やること';
  const isPath = head.includes('14時の回') && head.includes('17時の回') && head.includes('その先の回');
  const currentColumn = isPath ? head.indexOf(opts.currentCourse) : -1;
  const pathClass = (i) => (i === currentColumn ? ' class="path-now"' : '');
  const th = head.map((c, i) => `<th scope="col"${pathClass(i)}>${inline(c)}${i === currentColumn ? '<span class="path-now-label">今回</span>' : ''}</th>`).join('');
  const flowAction = (cell) => {
    const match = cell.match(/^\*\*(.+?)\*\*<br>(.+)$/);
    if (!match) return inline(cell);
    return `<strong class="flow-label">${inline(match[1])}</strong><span class="flow-note">${inline(match[2])}</span>`;
  };
  const tb = body
    .map((r) => {
      const tds = r.map((c, i) => {
        const isLast = i === r.length - 1;
        const html = isFlow && i === 1 ? flowAction(c) : opts.linkIds && isLast ? linkNums(inline(c), opts.linkIds) : inline(c);
        return i === 0 ? `<th scope="row">${html}</th>` : `<td${pathClass(i)}>${html}</td>`;
      });
      return `<tr>${tds.join('')}</tr>`;
    })
    .join('\n');
  return `<div class="tw"><table>\n<thead><tr>${th}</tr></thead>\n<tbody>\n${tb}\n</tbody>\n</table></div>`;
}

function copyBlock(text, n) {
  return `<div class="copy" data-copy>
<div class="copy-bar"><button class="copy-btn" type="button" data-copy-btn aria-describedby="cp${n}">コピー</button></div>
<pre id="cp${n}" data-copy-src><code>${esc(text)}</code></pre>
</div>`;
}

const select = (name, label, options) => `<label class="record-field"><span>${label}</span><select name="${name}" data-record-field><option value="">未選択</option>${options.map((o) => `<option>${o}</option>`).join('')}</select></label>`;
const area = (name, label, placeholder) => `<label class="record-field record-note"><span>${label}</span><textarea name="${name}" data-record-field rows="3" placeholder="${placeholder}"></textarea></label>`;
const input = (name, label, placeholder) => `<label class="record-field record-condition"><span>${label}</span><input name="${name}" data-record-field type="text" placeholder="${placeholder}"></label>`;

function recordBlock(kind) {
  if (kind === 'comparison') {
    const rows = [
      ['reader', '条件1', '例: AIに慣れていない方にも内容が伝わる'],
      ['tone', '条件2', '例: やわらかい敬体になっている'],
      ['constraint', '条件3', '例: 避けたい表現や守る制約を守っている'],
    ].map(([name, label, placeholder]) => `<article class="record-row">
${input(`${name}-condition`, label, placeholder)}
<div class="record-side"><h4>Before</h4>${select(`${name}-before-status`, '判定', ['満たす', '要修正', '判断できない'])}${area(`${name}-before-reason`, '根拠1点', '回答内の言葉や一文')}</div>
<div class="record-side"><h4>After</h4>${select(`${name}-after-status`, '判定', ['満たす', '要修正', '判断できない'])}${area(`${name}-after-reason`, '根拠1点', '回答内の言葉や一文')}</div>
</article>`).join('');
    return `<div class="compare-record" data-compare-record data-record-id="comparison-v1">
<p class="record-guide">条件を書き、BeforeとAfterの判定と根拠を記録します。入力内容はこのブラウザに保存されます。別の端末へ移すときは、記録をコピーしてください。</p>
${rows}<div class="record-actions"><button class="record-copy" type="button" data-record-copy>記録をコピー</button><span class="record-status" aria-live="polite"></span></div></div>`;
  }
  if (kind === 'effort') {
    return `<div class="compare-record" data-compare-record data-record-id="effort-v1">
<p class="record-guide">最初の回答と今回の回答で、基本情報を貼り直したかを記録します。入力内容はこのブラウザに保存されます。別の端末へ移すときは、記録をコピーしてください。</p>
<article class="record-row record-row-compact"><div class="record-condition"><h4>基本情報を今回の会話に貼ったか</h4></div><div class="record-side"><h4>Before</h4>${select('basic-before', '記録', ['貼った', '貼らなかった'])}</div><div class="record-side"><h4>After</h4>${select('basic-after', '記録', ['貼った', '貼らなかった'])}</div></article>
<div class="record-actions"><button class="record-copy" type="button" data-record-copy>記録をコピー</button><span class="record-status" aria-live="polite"></span></div></div>`;
  }
  return '';
}

function shotFigure(name, caption, shot) {
  const got = shot(name);
  if (got) {
    return `<figure class="shot"><img src="${got.src}" alt="${esc(caption)}" width="${got.w}" height="${got.h}" loading="lazy"><figcaption>${inline(caption)}</figcaption></figure>`;
  }
  return `<figure class="shot shot-wait"><div class="shot-box"><span class="shot-tag">ここにスクリーンショット（撮影待ち）</span><p>${inline(caption)}</p></div></figure>`;
}

// 本文ブロックを順に変換する。state は通し番号の共有用。
function blocks(lines, ctx) {
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (/^###\s+/.test(line)) {
      out.push(`<h3>${inline(line.replace(/^###\s+/, ''))}</h3>`);
      i++;
      continue;
    }
    if (line.startsWith('```')) {
      const kind = line.slice(3).trim();
      const buf = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) buf.push(lines[i++]);
      i++;
      const text = buf.join('\n');
      out.push(kind === 'copy' ? copyBlock(text, ++ctx.copyN) : `<pre><code>${esc(text)}</code></pre>`);
      continue;
    }
    if (/^:::\s*record\s+/.test(line)) {
      out.push(recordBlock(line.replace(/^:::\s*record\s+/, '').trim()));
      i++;
      continue;
    }
    if (/^:::\s*tabs/.test(line)) {
      i++;
      const panels = [];
      while (i < lines.length && !/^:::\s*$/.test(lines[i])) {
        if (/^::\s+/.test(lines[i])) {
          panels.push({ name: lines[i].replace(/^::\s+/, '').trim(), body: [] });
          i++;
        } else {
          if (panels.length) panels[panels.length - 1].body.push(lines[i]);
          i++;
        }
      }
      i++;
      const gid = ++ctx.tabN;
      const btns = panels
        .map(
          (p, k) =>
            `<button class="tab" type="button" role="tab" data-tool="${TOOLS[p.name] || 't' + k}" id="tab-${gid}-${k}" aria-selected="${k === 0}" aria-controls="panel-${gid}-${k}">${esc(p.name)}</button>`
        )
        .join('');
      const panes = panels
        .map(
          (p, k) =>
            `<div class="panel" role="tabpanel" data-tool="${TOOLS[p.name] || 't' + k}" id="panel-${gid}-${k}" aria-labelledby="tab-${gid}-${k}"><h4 class="panel-name">${esc(p.name)}</h4>\n${blocks(p.body, ctx)}\n</div>`
        )
        .join('\n');
      out.push(`<div class="tabs" data-tabs><div class="tablist" role="tablist">${btns}</div>\n${panes}\n</div>`);
      continue;
    }
    if (/^\[\[screenshot:/.test(line)) {
      const m = line.match(/^\[\[screenshot:\s*([^|\]]+?)\s*(?:\|\s*([^\]]*?))?\s*\]\]/);
      out.push(shotFigure(m[1], m[2] || '', ctx.shot));
      i++;
      continue;
    }
    if (line.trim().startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(lines[i++]);
      const first = !ctx.tableSeen;
      ctx.tableSeen = true;
      out.push(table(rows, { linkIds: first ? ctx.linkIds : null, currentCourse: ctx.currentCourse }));
      continue;
    }
    if (/^-\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^(-\s+|\s{2,}[^\s-])/.test(lines[i] || '')) {
        if (/^-\s+/.test(lines[i])) items.push(lines[i].replace(/^-\s+/, ''));
        else items[items.length - 1] += '\n' + lines[i].trim();
        i++;
      }
      const isCheck = items.every((t) => /^\[[ x]\]\s*/.test(t));
      const li = items
        .map((t, k) => {
          if (/^\[[ x]\]\s*/.test(t)) {
            const id = `ck${++ctx.checkN}`;
            const label = t.replace(/^\[[ x]\]\s*/, '');
            return `<li><input type="checkbox" id="${id}"><label for="${id}">${inline(label)}</label></li>`;
          }
          return `<li>${inline(t).replace(/\n/g, '<br>')}</li>`;
        })
        .join('\n');
      out.push(`<ul class="${isCheck ? 'checks' : 'bullets'}">\n${li}\n</ul>`);
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i] || '')) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''));
        i++;
      }
      out.push(`<ol class="steps">\n${items.map((t) => `<li>${inline(t)}</li>`).join('\n')}\n</ol>`);
      continue;
    }
    if (/^---+\s*$/.test(line)) {
      i++;
      continue;
    }
    if (/^\*\*.+\*\*$/.test(line.trim())) {
      out.push(`<h3 class="q">${inline(line.trim().replace(/^\*\*|\*\*$/g, ''))}</h3>`);
      i++;
      continue;
    }
    out.push(`<p>${inline(line.trim())}</p>`);
    i++;
  }
  return out.join('\n');
}

export function parsePage(md, shot) {
  let lines = md.split('\n');
  const memo = lines.findIndex((l) => /^##\s*（原稿メモ/.test(l));
  if (memo >= 0) {
    let end = memo;
    while (end > 0 && (!lines[end - 1].trim() || /^---+\s*$/.test(lines[end - 1]))) end--;
    lines = lines.slice(0, end);
  }
  const title = (lines.find((l) => /^#\s+/.test(l)) || '# ').replace(/^#\s+/, '').trim();
  let rest = lines.slice(lines.findIndex((l) => /^#\s+/.test(l)) + 1);
  const subIdx = rest.findIndex((l) => l.trim());
  const subtitle = rest[subIdx].trim();
  rest = rest.slice(subIdx + 1);
  let footer = '';
  const fIdx = rest.findIndex((l) => /^この資料は/.test(l.trim()));
  if (fIdx >= 0) {
    footer = rest[fIdx].trim();
    rest = rest.slice(0, fIdx);
  }
  // 節に分ける
  const ids = new Set();
  rest.forEach((l) => {
    const m = l.match(/^##\s+(\d+)\./);
    if (m) ids.add(`s${m[1]}`);
  });
  const ctx = {
    copyN: 0,
    tabN: 0,
    checkN: 0,
    shot,
    linkIds: ids,
    tableSeen: false,
    currentCourse: title.includes('2時間') ? '14時の回' : '17時の回',
  };
  const secs = [];
  let cur = null;
  for (const l of rest) {
    const m = l.match(/^##\s+(?:(\d+)\.\s*)?(.+)$/);
    if (m) {
      if (cur) secs.push(cur);
      cur = { num: m[1] || '', head: m[2].trim(), body: [] };
    } else if (cur) cur.body.push(l);
  }
  if (cur) secs.push(cur);
  const html = secs
    .map((s) => {
      const id = s.num ? ` id="s${s.num}"` : '';
      const num = s.num ? `<span class="snum">${s.num}</span>` : '';
      return `<section${id}>\n<h2>${num}<span class="stext">${inline(s.head)}</span></h2>\n${blocks(s.body, ctx)}\n</section>`;
    })
    .join('\n\n');
  return { title, subtitle, footer, html, counts: { copy: ctx.copyN, tabs: ctx.tabN } };
}

export function parseSlides(md) {
  const chunks = md.split(/\n---+\n/);
  const slides = [];
  for (const c of chunks) {
    const lines = c.split('\n').filter((l) => l.trim());
    if (!lines.length) continue;
    if (/^#\s+/.test(lines[0])) continue; // 先頭の原稿説明は捨てる
    if (lines[0].trim() === '[実画面]') {
      slides.push(`<section class="slide cue"><p>ここで実画面</p></section>`);
      continue;
    }
    const head = lines[0].replace(/^#+\s*/, '').trim();
    const body = lines
      .slice(1)
      .map((l) => `<p>${inline(l.trim())}</p>`)
      .join('\n');
    slides.push(`<section class="slide"><h2>${inline(head)}</h2>\n${body}\n</section>`);
  }
  return slides;
}
