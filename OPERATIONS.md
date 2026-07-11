# CAFEINOLOGY CODEX ― 運用オペレーションマニュアル

BOOTH で「全章解放コード」の注文が入った際の対応手順書。
このドキュメントを開けば **毎回同じ手順で 30〜60秒で処理できる** 状態を目指す。

---

## クイックリファレンス（最頻出フロー）

購入通知が来たら、以下2ステップ:

```bash
# ① ターミナルでコード取り出し（クリップボードにメッセージ入る）
cd /Users/hiroyukiyamada/coffee-quiz
python3 tools/deliver_code.py "@買い手のBOOTHユーザー名"

# ② BOOTH のメッセージ画面で Cmd+V → 送信
```

**目標: 通知気付き → 送信完了まで 60 秒以内**
**期限: PDF で買い手に「24時間以内に送る」と約束済み**

---

## 目次

1. [通常フロー（購入 → コード配布）](#1-通常フロー購入--コード配布)
2. [トラブル対応](#2-トラブル対応)
3. [定期メンテナンス](#3-定期メンテナンス)
4. [緊急対応](#4-緊急対応)
5. [参照情報一覧](#5-参照情報一覧)

---

## 1. 通常フロー（購入 → コード配布）

### ステップ1: 購入通知を受け取る

以下いずれかで気付く:

- **メール**: 登録メール (`hiroyuki.yco@gmail.com`) に BOOTH から「【BOOTH】商品が売れました」的なメール
- **BOOTH管理画面**: `https://manage.booth.pm/` の「注文一覧」タブに未対応注文が表示

### ステップ2: 買い手のユーザー名を取得

1. `https://manage.booth.pm/orders` を開く
2. 一番上（最新）の注文をクリック
3. 注文詳細画面の **「購入者」** 欄に BOOTHユーザー名（`@` で始まる）が表示
4. 買い手ユーザー名をコピー（例: `@sato_taro`）

**メモっておくと便利:**
- 注文番号（`#12345` みたいなの）→ ログのメモに使う
- 買い手が何か特別なコメントを付けていないか（メッセージ欄）

### ステップ3: コード配布スクリプトを実行

```bash
cd /Users/hiroyukiyamada/coffee-quiz

# シンプル版
python3 tools/deliver_code.py "@sato_taro"

# 注文番号もログに残す版（推奨）
python3 tools/deliver_code.py "@sato_taro" --note "注文 #12345"
```

**実行結果の例:**
```
買い手      : @sato_taro
配布コード  : CCDX-WWYY-XA4F-EJ10
メモ        : 注文 #12345
残り本数    : 99 本 (配布後)

✅ 配布処理完了
   ・codes-used.log に配布ログを追記
   ・codes.txt から該当コードを削除 (残 99 本)
   ・メッセージをクリップボードにコピー ➜ BOOTHメッセージ画面で Cmd+V で貼付
```

この時点で:
- `codes.txt` から該当コードが削除された
- `codes-used.log` に配布記録が追記された
- クリップボードにメッセージ全文が入った

### ステップ4: BOOTH でメッセージを送信

1. `https://manage.booth.pm/orders` の注文詳細ページを開く
2. **「メッセージを送る」** or **「購入者にメッセージ」** ボタンを押す
3. メッセージ入力欄で **Cmd + V** で貼付
4. 内容をひと目チェック（コードが正しく入っているか）
5. **送信** ボタンをクリック

### ステップ5: 完了

- BOOTH側の注文ステータスを「対応済み」等に更新（機能があれば）
- 特に何もなくても、次の注文を待つだけでOK

**所要時間: 30〜60秒**

---

## 2. トラブル対応

### 2-A. 買い手から「コードが使えない」と連絡があった

まず以下を順に確認:

**A1. コードの形式は正しいか？**
- `CCDX-XXXX-XXXX-XXXX` の16文字（ハイフン除き）
- 大文字英数字のみ（`I`, `L`, `O`, `U` は含まない — Crockford Base32）

**A2. コードは有効か？**
`tools/generate_codes.py` の検証機能で確認できる:
```bash
# 対話的にコードを渡して検証（要スクリプト追加、下記参照）
python3 -c "
import sys, hmac, hashlib
sys.path.insert(0, 'tools')
from generate_codes import verify_code
print(verify_code('CCDX-WWYY-XA4F-EJ10'))
"
```

または、アプリで実際に入力してみる（`https://cafeinology-codex.netlify.app/`）:
- 🔑「解放コードをお持ちの方」→ 入力 → 「コードを適用する」
- 成功すれば「🎉 全章が解放されました!」

**A3. コードは正しいのに使えない場合の再送手順:**
1. `codes-used.log` で誰にどのコードを送ったか確認
2. 新しいコードを1本取り出して再送（コード在庫は1本減る）:
   ```bash
   python3 tools/deliver_code.py "@sato_taro" --note "再送 (元コード CCDX-WWYY-XA4F-EJ10 使用不可)"
   ```
3. BOOTHメッセージで「先ほどのコードに問題があったため、新しいコードをお送りします」と一言添えて送信

### 2-B. 返金を求められた

BOOTH の返金機能:
1. `https://manage.booth.pm/orders` → 該当注文
2. **「返金対応」** ボタン（BOOTHが返金処理を仲介）
3. デジタル商品は原則返金不可だが、コードが機能しない等の障害があれば柔軟に対応

**コードを既に送っている場合の考え方:**
- コードは無効化できない（クライアント検証のため）
- 返金する場合は「使わないでください」と伝えるくらいしかできない
- 悪用リスク低（コーヒークイズなのでコード転売メリットが小さい）

### 2-C. コードを二重送信してしまった

- 同じ買い手に2本送ってしまった: 実害なし。ログに `--note "重複送信"` で追記メモを残す。
- 別の買い手に同じコードを送った: **これはやってはいけないが、ログを見返して確認。もし発生していたら、片方に新しいコードを送り直す。**

`codes-used.log` を定期的に確認:
```bash
# 直近10件の配布履歴
tail -10 codes-used.log

# 特定のコードが何回送られたかチェック
grep "CCDX-WWYY-XA4F-EJ10" codes-used.log
```

### 2-D. 買い手から解放後に別端末で使いたいと言われた

**回答テンプレ:**
> ご購入いただいたコード（CCDX-XXXX-XXXX-XXXX）は、他端末でも同じコードを入力するだけで解放可能です。追加費用はかかりません。

コードはHMAC検証なので、端末に紐づいていない。同じコードを再入力するだけで別端末でも解放される仕様。

### 2-E. 買い手から遅延クレーム（24時間過ぎた）

**謝罪 + 即対応:**
> ご対応が遅くなり申し訳ございません。以下がコードとなります。ご迷惑をおかけしました。
> [配布メッセージ本文]

対応が遅れやすい場合は、`unlock-instructions.pdf` の「24時間以内」を「1〜2営業日以内」に緩めることも検討。

---

## 3. 定期メンテナンス

### 3-A. 週次: 在庫確認

```bash
cd /Users/hiroyukiyamada/coffee-quiz
python3 tools/deliver_code.py --stats
```

**判断基準:**
- 残 20 本以下 → 早めに追加生成
- 残 5 本以下 → 即座に追加生成

### 3-B. コード追加生成

```bash
cd /Users/hiroyukiyamada/coffee-quiz
python3 tools/generate_codes.py 100 --out codes.txt.new --verify
cat codes.txt.new >> codes.txt
rm codes.txt.new
python3 tools/deliver_code.py --stats  # 増えたか確認
```

生成された100本は追記されるので、既存の未使用コードは影響を受けない。

### 3-C. 月次: 売上確認

BOOTH側:
- `https://manage.booth.pm/sales` → 売上管理タブ
- 月別売上、振込可能残高を確認
- 振込申請するか、貯めるか判断

配布ログ側:
```bash
# 今月の配布件数
grep "^$(date +%Y-%m)" codes-used.log | wc -l

# 過去3ヶ月分の月別集計（簡易版）
awk '{print substr($1,1,7)}' codes-used.log | grep -v '^#' | sort | uniq -c
```

### 3-D. 振込申請

売上金を実際に自分の銀行口座に振り込む:
1. `https://manage.booth.pm/sales` → 「振込を申請する」
2. 金額と振込先を確認
3. 申請
4. 数営業日で入金

**振込手数料は1回固定** なので、少額でこまめに申請するより **月1〜2回まとめる** ほうがお得。

### 3-E. codes-used.log のバックアップ

このファイルは `.gitignore` に入っているのでGitでは追跡されない。定期的に手動バックアップ推奨:

```bash
# タイムスタンプ付きでバックアップ（例）
cp codes-used.log ~/Dropbox/backups/codes-used-$(date +%Y%m%d).log
```

---

## 4. 緊急対応

### 4-A. 秘密鍵 (`SECRET_HEX`) が漏洩した場合

**症状:**
- 誰でもコード生成できるようになる
- 未購入者が勝手に解放できてしまう

**対応手順（順番厳守）:**

1. **新しい秘密鍵を生成:**
   ```bash
   python3 -c "import secrets; print(secrets.token_hex(16))"
   ```

2. **`unlock.js` と `tools/generate_codes.py` の両方で `SECRET_HEX` を新値に置換**（両者は完全一致必須）

3. **新しいコードを100本生成:**
   ```bash
   rm codes.txt  # 旧コードは全部無効になる
   python3 tools/generate_codes.py 100 --out codes.txt --verify
   ```

4. **`sw.js` の `CACHE_NAME` を bump** して既存訪問者にも新JSを配信:
   ```
   const CACHE_NAME = 'coffee-quiz-vNN';  // NNをインクリメント
   ```

5. **アプリを再デプロイ:**
   ```bash
   git add unlock.js sw.js
   git commit -m "Security: 秘密鍵を再生成 — 旧コードは全失効"
   git push origin main
   ```

6. **BOOTH で買い手全員にお詫び&新コード再送:**
   `codes-used.log` の全買い手をリストアップし、それぞれに新コード配布。

### 4-B. `codes.txt` を誤って削除した/壊した

`codes-used.log` があれば「配布済みコード一覧」がわかる。
未使用分は喪失するので **新しく100本再生成** すれば復旧できる。
（配布済みコードは秘密鍵が同じなら引き続き有効）

```bash
python3 tools/generate_codes.py 100 --out codes.txt --verify
```

### 4-C. BOOTH側で障害が発生している

- BOOTH 障害情報: `https://booth.pm/announcements`
- 復旧を待つ以外できない
- 買い手から連絡があれば「BOOTH側の障害で対応が遅れている」旨伝える

### 4-D. アプリ (Netlify) がダウンしている

- Netlify ステータス: `https://www.netlifystatus.com/`
- 買い手から「アプリが開けない」と連絡があれば状況確認
- 通常は数分〜数時間で復旧

---

## 5. 参照情報一覧

### 主要URL

| 用途 | URL |
|---|---|
| BOOTH管理TOP | https://manage.booth.pm/ |
| BOOTH注文一覧 | https://manage.booth.pm/orders |
| BOOTH売上管理 | https://manage.booth.pm/sales |
| BOOTHメッセージ | https://manage.booth.pm/messages |
| ショップ公開URL | https://cafeinology.booth.pm/ |
| 商品ページ | https://cafeinology.booth.pm/items/8603920 |
| アプリ公開URL | https://cafeinology-codex.netlify.app/ |
| GitHubリポジトリ | https://github.com/hirohiro-ginonawa/coffee-quiz |
| Netlifyダッシュボード | https://app.netlify.com/ |

### ローカルファイル

| ファイル | 用途 | Git管理 |
|---|---|---|
| `codes.txt` | 未使用コード在庫 | ❌ 除外 |
| `codes-used.log` | 配布履歴（買い手情報含む） | ❌ 除外 |
| `unlock-instructions.pdf` | BOOTHの作品ファイル（PDFで買い手が受け取る案内） | ✅ 管理 |
| `unlock.js` | HMAC検証ロジック（`SECRET_HEX` 含む） | ✅ 管理 |
| `tools/deliver_code.py` | 配布ヘルパースクリプト | ✅ 管理 |
| `tools/generate_codes.py` | コード追加生成スクリプト | ✅ 管理 |
| `tools/make_notice_pdf.py` | 案内PDF再生成スクリプト | ✅ 管理 |

### コマンドチートシート

```bash
# セットアップ
cd /Users/hiroyukiyamada/coffee-quiz

# 在庫確認
python3 tools/deliver_code.py --stats

# 次のコードを見る（消費しない）
python3 tools/deliver_code.py --peek

# 通常の配布
python3 tools/deliver_code.py "@buyer_name" --note "注文 #12345"

# 動作確認（配布しないシミュレーション）
python3 tools/deliver_code.py "@test" --dry-run

# コード追加生成
python3 tools/generate_codes.py 100 --out codes.txt.new --verify
cat codes.txt.new >> codes.txt && rm codes.txt.new

# 案内PDF再生成（内容変更したとき）
python3 tools/make_notice_pdf.py

# 直近の配布履歴
tail -10 codes-used.log

# 特定コードの配布履歴検索
grep "CCDX-XXXX-XXXX-XXXX" codes-used.log
```

### メッセージテンプレ（配布時）

配布スクリプトが自動でクリップボードに入れる本文:

```
【CAFEINOLOGY CODEX】解放コードのお届け

この度はご購入いただき、誠にありがとうございます。
解放コードをお送りいたします。

━━━━━━━━━━━━━━━━━━━━━
　解放コード:  CCDX-XXXX-XXXX-XXXX
━━━━━━━━━━━━━━━━━━━━━

▼ 使い方
1. https://cafeinology-codex.netlify.app/ を開く
2. 画面下の「🔑 解放コードをお持ちの方」または章選択画面の
   「全章を解放する」ボタンをタップ
3. 上記コードを入力 → 全1000問がプレイ可能に

▼ 注意事項
・コード1本で1端末の全章が恒久解放されます
・機種変更・他端末への移行時は、同じコードを再入力してください
・ご不明な点は BOOTH のメッセージ機能よりお気軽にご連絡ください

引き続き CAFEINOLOGY CODEX をお楽しみください。
```

このテンプレを変更したい場合は `tools/deliver_code.py` の `MESSAGE_TEMPLATE` を編集。

### 収益構造（1件あたり）

| 項目 | 金額 |
|---|---|
| 販売価格 | ¥780 |
| BOOTH販売手数料（約5.6%） | −約¥44 |
| 決済手数料 | −約¥22 |
| **売上金プール入額** | **約¥714** |
| 振込手数料（1回） | −¥300〜（振込ごと） |

※ 手数料率は BOOTH の改定で変わる可能性あり。定期的に `https://manage.booth.pm/sales` で最新確認。

---

## 変更履歴

| 日付 | 変更内容 |
|---|---|
| 2026-07-11 | 初版作成（BOOTH公開＆振込先登録完了時点） |

---

_このドキュメントは、購入対応時にすぐ引ける「即席マニュアル」として作成。買い手対応時に迷ったら、まずここを開いて該当セクションを参照する。_
