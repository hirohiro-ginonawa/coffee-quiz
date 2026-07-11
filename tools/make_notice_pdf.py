#!/usr/bin/env python3
"""
BOOTH「作品ファイル」用の案内PDFを生成する。

CAFEINOLOGY CODEX は解放コードを手動でメッセージ配布するため、
BOOTHの作品ファイルには「コードは追ってメッセージでお送りする」旨の
案内PDFをアップロードする。

Usage:
    python3 tools/make_notice_pdf.py
    → tools/../unlock-instructions.pdf を生成
"""
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.pdfgen import canvas

# 日本語 CIDフォント
pdfmetrics.registerFont(UnicodeCIDFont("HeiseiKakuGo-W5"))
pdfmetrics.registerFont(UnicodeCIDFont("HeiseiMin-W3"))

OUT = Path(__file__).resolve().parent.parent / "unlock-instructions.pdf"

W, H = A4

c = canvas.Canvas(str(OUT), pagesize=A4)
c.setTitle("CAFEINOLOGY CODEX — 解放コードお届けのご案内")
c.setAuthor("CAFEINOLOGY CODEX")
c.setSubject("解放コードのお届け方法")

# --- タイトル ---
c.setFont("HeiseiMin-W3", 20)
c.drawString(25 * mm, H - 30 * mm, "CAFEINOLOGY CODEX")
c.setFont("HeiseiKakuGo-W5", 12)
c.drawString(25 * mm, H - 38 * mm, "全章解放コード ― お届けのご案内")

# 区切り線
c.setLineWidth(0.5)
c.line(25 * mm, H - 42 * mm, W - 25 * mm, H - 42 * mm)

# --- 本文 ---
body_lines = [
    ("HeiseiMin-W3", 11, "この度はご購入いただき、誠にありがとうございます。"),
    ("HeiseiMin-W3", 11, ""),
    ("HeiseiKakuGo-W5", 12, "◆ 解放コードのお届けについて"),
    ("HeiseiMin-W3", 11, ""),
    ("HeiseiMin-W3", 11, "解放コード（CCDX-XXXX-XXXX-XXXX 形式）は、"),
    ("HeiseiMin-W3", 11, "ご購入後 24 時間以内 に BOOTH のメッセージ機能で"),
    ("HeiseiMin-W3", 11, "お送りいたします。少々お時間をいただきますので、"),
    ("HeiseiMin-W3", 11, "何卒ご了承ください。"),
    ("HeiseiMin-W3", 11, ""),
    ("HeiseiMin-W3", 11, "※ 深夜・早朝のご購入の場合、翌日昼までにお送りします。"),
    ("HeiseiMin-W3", 11, ""),
    ("HeiseiKakuGo-W5", 12, "◆ 使い方"),
    ("HeiseiMin-W3", 11, ""),
    ("HeiseiMin-W3", 11, "1. 下記URLからゲームを開いてください（PC / スマホ対応）"),
    ("HeiseiMin-W3", 11, "     https://cafeinology-codex.netlify.app/"),
    ("HeiseiMin-W3", 11, ""),
    ("HeiseiMin-W3", 11, "2. 画面下部の「全章を解放する」ボタンをタップ"),
    ("HeiseiMin-W3", 11, ""),
    ("HeiseiMin-W3", 11, "3. お送りしたコードを入力 → 「解放」で全 1000 問がプレイ可能"),
    ("HeiseiMin-W3", 11, ""),
    ("HeiseiMin-W3", 11, "コード1本で 1端末 の全章が恒久解放されます。"),
    ("HeiseiMin-W3", 11, "他端末へ移す場合は、同じコードを再度入力してください。"),
    ("HeiseiMin-W3", 11, ""),
    ("HeiseiKakuGo-W5", 12, "◆ お問い合わせ"),
    ("HeiseiMin-W3", 11, ""),
    ("HeiseiMin-W3", 11, "コードが届かない、うまく解放できない等ございましたら、"),
    ("HeiseiMin-W3", 11, "BOOTH のメッセージ機能より遠慮なくご連絡ください。"),
    ("HeiseiMin-W3", 11, ""),
    ("HeiseiMin-W3", 11, "全 20 章、1000 問のコーヒーの叡智をお楽しみください。"),
]

y = H - 55 * mm
for font, size, text in body_lines:
    c.setFont(font, size)
    c.drawString(25 * mm, y, text)
    y -= size * 1.5

# --- フッター ---
c.setFont("HeiseiMin-W3", 9)
c.setFillGray(0.4)
c.drawString(25 * mm, 20 * mm, "CAFEINOLOGY CODEX  —  1000 Entries of Coffee Wisdom")
c.drawString(25 * mm, 15 * mm, "https://cafeinology-codex.netlify.app/   #CafeinologyCodex")

c.showPage()
c.save()

print(f"[OK] {OUT} ({OUT.stat().st_size} bytes)")
