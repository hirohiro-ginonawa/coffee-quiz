#!/usr/bin/env python3
"""
BOOTH 購入者向け 解放コード配布ヘルパー

流れ:
  1. codes.txt の先頭から未使用コードを1本取り出す
  2. codes-used.log に「配布日時 / 買い手名 / コード」を追記
  3. codes.txt からそのコードを削除
  4. 全文のメッセージテンプレートを macOS クリップボードにコピー
     → BOOTH のメッセージ画面にそのまま Cmd+V で貼るだけ

Usage:
  python3 tools/deliver_code.py "@buyer_username"
    → 次のコード1本を配布、クリップボードにメッセージが入る

  python3 tools/deliver_code.py "@buyer_username" --note "注文番号 #12345"
    → ログにメモも残す

  python3 tools/deliver_code.py --peek
    → 次に配られるコードを覗くだけ (取り出さない)

  python3 tools/deliver_code.py --stats
    → 残り本数 / 配布済み本数 を表示

Notes:
  - codes-used.log は .gitignore に含まれる (買い手情報を含むため絶対にコミットしない)
  - コードが尽きたら tools/generate_codes.py で追加生成
"""
from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

ROOT           = Path(__file__).resolve().parent.parent
CODES_FILE     = ROOT / "codes.txt"
USED_LOG_FILE  = ROOT / "codes-used.log"

CODE_PATTERN = re.compile(r"^CCDX-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$")

APP_URL   = "https://cafeinology-codex.netlify.app/"
BOOTH_URL = "https://cafeinology.booth.pm/items/8603920"

MESSAGE_TEMPLATE = """\
【CAFEINOLOGY CODEX】解放コードのお届け

この度はご購入いただき、誠にありがとうございます。
解放コードをお送りいたします。

━━━━━━━━━━━━━━━━━━━━━
　解放コード:  {code}
━━━━━━━━━━━━━━━━━━━━━

▼ 使い方
1. {app_url} を開く
2. 画面下の「🔑 解放コードをお持ちの方」または章選択画面の
   「全章を解放する」ボタンをタップ
3. 上記コードを入力 → 全1000問がプレイ可能に

▼ 注意事項
・コード1本で1端末の全章が恒久解放されます
・機種変更・他端末への移行時は、同じコードを再入力してください
・ご不明な点は BOOTH のメッセージ機能よりお気軽にご連絡ください

引き続き CAFEINOLOGY CODEX をお楽しみください。
"""


# ------------------------------------------------------------
# 内部ユーティリティ
# ------------------------------------------------------------
def _read_codes() -> list[str]:
    """codes.txt から有効な未使用コード一覧を返す (空行と非CCDX行は無視)。"""
    if not CODES_FILE.exists():
        return []
    lines = CODES_FILE.read_text(encoding="utf-8").splitlines()
    return [ln.strip() for ln in lines if CODE_PATTERN.match(ln.strip())]


def _write_codes(codes: list[str]) -> None:
    """codes.txt を上書き。末尾改行を1つ入れる。"""
    CODES_FILE.write_text("\n".join(codes) + ("\n" if codes else ""), encoding="utf-8")


def _count_used() -> int:
    """codes-used.log の配布行数を返す。"""
    if not USED_LOG_FILE.exists():
        return 0
    return sum(
        1
        for ln in USED_LOG_FILE.read_text(encoding="utf-8").splitlines()
        if ln.strip() and not ln.startswith("#")
    )


def _copy_to_clipboard(text: str) -> bool:
    """pbcopy で macOS クリップボードにコピー。失敗時は False。"""
    if not shutil.which("pbcopy"):
        return False
    try:
        subprocess.run(["pbcopy"], input=text.encode("utf-8"), check=True)
        return True
    except subprocess.CalledProcessError:
        return False


def _append_log(code: str, buyer: str, note: str | None) -> None:
    """codes-used.log に配布記録を追記。"""
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"{now}\t{buyer}\t{code}"
    if note:
        line += f"\t{note}"
    line += "\n"

    # ファイルがなければヘッダ付きで作成
    if not USED_LOG_FILE.exists():
        header = (
            "# CAFEINOLOGY CODEX 解放コード配布ログ\n"
            "# フォーマット: 配布日時<TAB>買い手<TAB>コード<TAB>メモ(任意)\n"
            "# ※このファイルは絶対にコミットしないこと (.gitignoreで除外済)\n"
        )
        USED_LOG_FILE.write_text(header, encoding="utf-8")

    with USED_LOG_FILE.open("a", encoding="utf-8") as fp:
        fp.write(line)


# ------------------------------------------------------------
# サブコマンド実装
# ------------------------------------------------------------
def cmd_peek() -> int:
    codes = _read_codes()
    if not codes:
        print("⚠️  codes.txt に未使用コードがありません。", file=sys.stderr)
        print("   → python3 tools/generate_codes.py 100 --out codes.txt --verify", file=sys.stderr)
        return 1
    print(f"次に配布されるコード: {codes[0]}")
    print(f"残り: {len(codes)} 本  ／  配布済み累計: {_count_used()} 本")
    return 0


def cmd_stats() -> int:
    remaining = len(_read_codes())
    used      = _count_used()
    total     = remaining + used
    print(f"📊 コード在庫状況")
    print(f"   残り     : {remaining:>4} 本")
    print(f"   配布済み : {used:>4} 本")
    print(f"   累計生成 : {total:>4} 本")
    if remaining <= 10:
        print()
        print(f"⚠️  残り {remaining} 本です。追加生成をおすすめ:")
        print(f"   python3 tools/generate_codes.py 100 --out codes.txt.new --verify")
        print(f"   cat codes.txt.new >> codes.txt && rm codes.txt.new")
    return 0


def cmd_deliver(buyer: str, note: str | None, dry_run: bool) -> int:
    codes = _read_codes()
    if not codes:
        print("❌ codes.txt に未使用コードがありません。", file=sys.stderr)
        print("   まず tools/generate_codes.py で追加生成してください。", file=sys.stderr)
        return 1

    code = codes[0]
    remaining_after = len(codes) - 1
    message = MESSAGE_TEMPLATE.format(code=code, app_url=APP_URL)

    if dry_run:
        print("=== DRY-RUN (実際には配布・記録・削除しません) ===\n")

    # 見出し
    print(f"買い手      : {buyer}")
    print(f"配布コード  : {code}")
    if note:
        print(f"メモ        : {note}")
    print(f"残り本数    : {remaining_after} 本 (配布後)")
    print()

    if dry_run:
        print("--- 送信予定メッセージ ---")
        print(message)
        return 0

    # 実配布: ログに追記 → codes.txt から削除
    _append_log(code, buyer, note)
    _write_codes(codes[1:])

    # クリップボードへ
    copied = _copy_to_clipboard(message)

    print("✅ 配布処理完了")
    print(f"   ・{USED_LOG_FILE.name} に配布ログを追記")
    print(f"   ・codes.txt から該当コードを削除 (残 {remaining_after} 本)")
    if copied:
        print("   ・メッセージをクリップボードにコピー ➜ BOOTHメッセージ画面で Cmd+V で貼付")
    else:
        print("   ⚠️  pbcopy が使えずクリップボードコピー失敗。手動でコピーしてください:")
        print()
        print(message)

    if remaining_after <= 10 and remaining_after > 0:
        print()
        print(f"⚠️  残り {remaining_after} 本です。近いうちに追加生成をおすすめ。")
    elif remaining_after == 0:
        print()
        print("⚠️  在庫が空になりました。すぐに追加生成してください:")
        print("   python3 tools/generate_codes.py 100 --out codes.txt.new --verify")
        print("   cat codes.txt.new >> codes.txt && rm codes.txt.new")

    return 0


# ------------------------------------------------------------
# エントリポイント
# ------------------------------------------------------------
def main() -> int:
    parser = argparse.ArgumentParser(
        description="CAFEINOLOGY CODEX 解放コード配布ヘルパー",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "例:\n"
            "  # 通常配布 (メッセージがクリップボードに入る)\n"
            "  python3 tools/deliver_code.py '@buyer_name'\n\n"
            "  # 注文番号などメモ付きで配布\n"
            "  python3 tools/deliver_code.py '@buyer_name' --note '注文 #12345'\n\n"
            "  # 配布せず次のコードだけ覗く\n"
            "  python3 tools/deliver_code.py --peek\n\n"
            "  # 残り在庫だけ確認\n"
            "  python3 tools/deliver_code.py --stats\n"
        ),
    )
    parser.add_argument("buyer", nargs="?", help="買い手のBOOTHユーザー名 (例: @user123)")
    parser.add_argument("--note", help="ログに残す任意のメモ (注文番号など)")
    parser.add_argument("--dry-run", action="store_true", help="実配布せずシミュレーション")
    parser.add_argument("--peek", action="store_true", help="次のコードだけ表示 (取り出さない)")
    parser.add_argument("--stats", action="store_true", help="在庫状況を表示して終了")

    args = parser.parse_args()

    if args.stats:
        return cmd_stats()
    if args.peek:
        return cmd_peek()

    if not args.buyer:
        parser.error("買い手名 (BOOTHユーザー名) を指定してください。例: python3 tools/deliver_code.py '@buyer'")

    return cmd_deliver(args.buyer, args.note, args.dry_run)


if __name__ == "__main__":
    sys.exit(main())
