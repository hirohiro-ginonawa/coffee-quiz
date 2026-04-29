#!/usr/bin/env python3
"""
questions.js → QUESTIONS_REVIEW.md 変換ツール
使い方: python3 tools/export_questions_md.py
"""
import json
import os
import re
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'questions.js')
OUT = os.path.join(ROOT, 'QUESTIONS_REVIEW.md')

roman = ['','I','II','III','IV','V','VI','VII','VIII','IX','X',
         'XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX']

def load_questions_js():
    with open(SRC, encoding='utf-8') as f:
        content = f.read()

    # LEVEL_THEMES を抽出
    m = re.search(r'const\s+LEVEL_THEMES\s*=\s*(\{[^}]+\})', content, re.DOTALL)
    if not m:
        raise SystemExit("LEVEL_THEMES が見つかりません")
    themes_raw = m.group(1)
    # JSキーを "key": 形式に変換 → JSON 化
    themes_json = re.sub(r'(\d+)\s*:', r'"\1":', themes_raw)
    # 末尾のトレイリングカンマ除去
    themes_json = re.sub(r',(\s*\})', r'\1', themes_json)
    themes = {int(k): v for k, v in json.loads(themes_json).items()}

    # RAW_QUESTIONS 配列: [id,level,"q",[opts],correct,"exp"],
    # 1行1問前提で抽出
    questions = []
    for line in content.splitlines():
        line = line.strip()
        if not line.startswith('[') or not re.search(r'\],\s*$|\]\s*$', line):
            continue
        # 末尾カンマ除去
        if line.endswith(','):
            line = line[:-1]
        try:
            arr = json.loads(line)
        except json.JSONDecodeError:
            continue
        if len(arr) != 6 or not isinstance(arr[3], list):
            continue
        questions.append(arr)
    return themes, questions

def main():
    themes, raw = load_questions_js()

    # レベル別グルーピング
    by_level = {}
    for qid, lv, q, opts, correct, exp in raw:
        by_level.setdefault(lv, []).append((qid, q, opts, correct, exp))

    lines = []
    lines.append('# CAFEINOLOGY CODEX — 全1000問レビュー')
    lines.append('')
    lines.append(f'生成日: {date.today().isoformat()}')
    lines.append('')
    lines.append(f'総問題数: **{len(raw)} 問**')
    lines.append('')
    lines.append('## 目次')
    lines.append('')
    for lv in range(1, 21):
        qs = by_level.get(lv, [])
        theme = themes.get(lv, '')
        lines.append(f'- [CHAPTER {roman[lv]} — {theme} ({len(qs)}問)](#chapter-{lv})')
    lines.append('')
    lines.append('---')
    lines.append('')

    for lv in range(1, 21):
        theme = themes.get(lv, '')
        qs = by_level.get(lv, [])
        lines.append(f'## CHAPTER {roman[lv]} — {theme}  <a id="chapter-{lv}"></a>')
        lines.append('')
        lines.append(f'**{len(qs)}問**')
        lines.append('')

        for i, (qid, q, opts, correct, exp) in enumerate(qs):
            lines.append(f'### Q{i+1}. (id:{qid})  {q}')
            lines.append('')
            for j, opt in enumerate(opts):
                mark = '✅' if j == correct else '⬜'
                lines.append(f'- {mark} {opt}')
            lines.append('')
            lines.append(f'> 💡 **解説**: {exp}')
            lines.append('')

        lines.append('---')
        lines.append('')

    with open(OUT, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))

    print(f"✅ Wrote {OUT}")
    print(f"   Total questions: {len(raw)}")
    print(f"   Levels: {len(by_level)}")

if __name__ == '__main__':
    main()
