# CAFEINOLOGY CODEX — カフェイノロジー・コーデックス

> _The Codex of Coffee — 珈琲の叡智を綴じた書_
> 全20章 · 1000項 · #CafeinologyCodex

**ブランドコンセプト**
- ロゴ: Serif書体（Cormorant Garamond）× 金箔グラデーション × グレーブルー
- 世界観: 一冊の古典として珈琲の知を綴じる「書（コーデックス）」
- 章立て: 各レベル = CHAPTER I 〜 XX（ローマ数字）
- ハッシュタグ: `#CafeinologyCodex`

静的Webで動作する本格クイズゲーム。PWA対応、AdSense/アフィリエイト/GA4 を組み込み済みで、
デプロイ直後から収益化できる状態になっています。

---

## 1. 構成ファイル

| ファイル | 役割 |
|---|---|
| `index.html` | メイン画面（5スクリーン構成） |
| `style.css` | グレーブルー基調のゲームUIスタイル |
| `docs.css` | 法的ページ・広告・アフィリエイト・シェア等のスタイル |
| `questions.js` | 1000問のクイズデータ（20レベル×50問） |
| `game.js` | ゲームロジック、進捗保存、アフィリエイト表示、シェア生成 |
| `affiliates.js` | Amazon等のアフィリエイト商品データ |
| `about.html` | 運営者情報（AdSense申請で必須） |
| `privacy.html` | プライバシーポリシー（AdSense申請で必須） |
| `terms.html` | 利用規約 |
| `manifest.json` | PWAマニフェスト |
| `sw.js` | Service Worker（オフライン対応） |
| `robots.txt` / `sitemap.xml` | SEO用 |
| `netlify.toml` / `vercel.json` | 各プラットフォームの設定 |

**別途用意が必要な画像ファイル:**
- `icon-192.png` (192×192)
- `icon-512.png` (512×512)
- `ogp.png` (1200×630、SNSシェア用)

---

## 2. デプロイ前の差し替え箇所

以下の `XXXXXX` 等のプレースホルダーを自分のIDに置換してください。

### index.html
```
ca-pub-XXXXXXXXXXXXXXXX  → AdSenseパブリッシャーID
G-XXXXXXXXXX             → GA4測定ID
data-ad-slot="0000000000"→ AdSenseで発行した各広告スロットID
https://coffee-codex.example.com/ → 実際の公開URL
```

### about.html
```
運営者名、メールアドレス
```

### affiliates.js
```
AFFILIATE_ID.amazon  → Amazonアソシエイト・トラッキングID
AFFILIATE_ID.rakuten → 楽天アフィリエイトID（使うなら）
ASIN                 → 実在する商品のASIN
```

### robots.txt / sitemap.xml
```
https://coffee-codex.example.com/ → 実URL
```

---

## 3. デプロイ方法（3択）

### A. Cloudflare Pages（推奨・無料・高速CDN）
1. GitHubにリポジトリを作成し、このフォルダをpush
2. Cloudflare Pages にログイン → "Create a project" → GitHub連携
3. ビルド設定は **不要**（Build command: 空、Output dir: `/`）
4. Deploy → 数十秒で公開

### B. Vercel
1. https://vercel.com → "New Project" → GitHubから import
2. Framework Preset: **Other**
3. Deploy

### C. Netlify
1. https://app.netlify.com → "Add new site" → "Import from Git"
2. Build command: 空、Publish directory: `.`
3. Deploy

いずれも **カスタムドメイン** を無料で割り当て可能。独自ドメイン（例: お名前.com で年1,000〜1,500円程度）を取得して設定すると収益化の信頼度が上がります。

---

## 4. 収益化セットアップ

### Google AdSense（審査あり）
1. https://www.google.com/adsense/ で申請
2. サイトURLを登録、審査用コードを `<head>` に貼る（既に `ca-pub-XXX...` の行があります）
3. 審査通過後、広告ユニットを作成 → `data-ad-slot="..."` を発行IDに置換

**審査通過のコツ:**
- プライバシーポリシー・運営者情報・利用規約が揃っていること（本プロジェクトは対応済）
- コンテンツが独自で十分な量（1000問あるのでOK）
- 独自ドメインだと通りやすい

### Google Analytics 4
1. https://analytics.google.com → プロパティ作成
2. 測定ID（`G-XXXXXXXXXX`）を index.html に反映
3. game.js 内の `gtag('event', 'level_complete', ...)` で完了イベントを送信済み

### アフィリエイト
- **Amazonアソシエイト**: https://affiliate.amazon.co.jp/ （売上発生 180日以内で承認）
- **もしもアフィリエイト**: https://af.moshimo.com/ （Amazon/楽天をまとめて申請可）
- **楽天アフィリエイト**: https://affiliate.rakuten.co.jp/ （即時承認）

---

## 5. ローカル確認

```bash
# シンプルな動作確認
python3 -m http.server 8000
# → http://localhost:8000/
```

Service WorkerやPWAの動作確認は `https://` 環境（デプロイ後）で行ってください。

---

## 6. 公開後のチェックリスト

- [ ] 画像3点（icon-192.png / icon-512.png / ogp.png）を配置
- [ ] index.html の AdSenseパブリッシャーID 置換
- [ ] index.html の GA4 測定ID 置換
- [ ] about.html の運営者名・メール記入
- [ ] affiliates.js のアフィID置換
- [ ] robots.txt / sitemap.xml の URL 置換
- [ ] AdSenseに申請
- [ ] Google Search Console にサイトマップ登録
- [ ] Twitter/X に公開ツイート（OGP画像が出るか確認）

---

## 7. ライセンス / 免責

クイズデータは独自作成。デザイン・コードは商用利用可（自サイト運営目的）。
無断転載・再配布は禁止します。
