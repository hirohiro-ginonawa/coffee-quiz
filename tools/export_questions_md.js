#!/usr/bin/env node
// questions.js → QUESTIONS_REVIEW.md 変換ツール
// 使い方: node tools/export_questions_md.js

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'questions.js'), 'utf8');

// eval で questions.js を読み込む
const ctx = {};
const wrapped = src + '\nmodule.exports = { LEVEL_THEMES, RAW_QUESTIONS };';
const tmpFile = path.join(__dirname, '_tmp_questions.cjs');
fs.writeFileSync(tmpFile, wrapped);
const { LEVEL_THEMES, RAW_QUESTIONS } = require(tmpFile);
fs.unlinkSync(tmpFile);

// レベル別にグルーピング
const byLevel = {};
for (const [id, level, q, opts, correct, exp] of RAW_QUESTIONS) {
  if (!byLevel[level]) byLevel[level] = [];
  byLevel[level].push({ id, q, opts, correct, exp });
}

const roman = ['','I','II','III','IV','V','VI','VII','VIII','IX','X',
               'XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX'];

const lines = [];
lines.push('# CAFEINOLOGY CODEX — 全1000問レビュー');
lines.push('');
lines.push(`生成日: ${new Date().toISOString().slice(0,10)}`);
lines.push('');
lines.push('## 目次');
lines.push('');
for (let lv = 1; lv <= 20; lv++) {
  const count = (byLevel[lv] || []).length;
  const theme = LEVEL_THEMES[lv] || '';
  lines.push(`- [CHAPTER ${roman[lv]} — ${theme} (${count}問)](#chapter-${roman[lv].toLowerCase()}-${lv})`);
}
lines.push('');
lines.push('---');
lines.push('');

for (let lv = 1; lv <= 20; lv++) {
  const theme = LEVEL_THEMES[lv] || '';
  const qs = byLevel[lv] || [];
  lines.push(`## CHAPTER ${roman[lv]} — ${theme} <a id="chapter-${roman[lv].toLowerCase()}-${lv}"></a>`);
  lines.push('');
  lines.push(`**${qs.length}問**`);
  lines.push('');

  for (let i = 0; i < qs.length; i++) {
    const { id, q, opts, correct, exp } = qs[i];
    lines.push(`### Q${i+1}. (id:${id})  ${q}`);
    lines.push('');
    for (let j = 0; j < opts.length; j++) {
      const mark = j === correct ? '✅' : '⬜';
      lines.push(`- ${mark} ${opts[j]}`);
    }
    lines.push('');
    lines.push(`> 💡 **解説**: ${exp}`);
    lines.push('');
  }

  lines.push('---');
  lines.push('');
}

const outPath = path.join(ROOT, 'QUESTIONS_REVIEW.md');
fs.writeFileSync(outPath, lines.join('\n'));
console.log(`✅ Wrote ${outPath}`);
console.log(`   Total questions: ${RAW_QUESTIONS.length}`);
console.log(`   Levels: ${Object.keys(byLevel).length}`);
