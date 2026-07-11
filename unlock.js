// ============ CAFEINOLOGY CODEX 解放コード検証 ============
// HMAC-SHA256 ベースのクライアントサイド検証。
// 秘密鍵がアプリ内に露出するため、本格的な耐改ざんではなく
// 「技術的に踏み越えにくくして購入導線を保つ」軽量DRMの位置づけ。
//
// コード形式: CCDX-XXXX-XXXX-XXXX
//   CCDX = プレフィックス
//   8文字 = ランダムID (40bit, Crockford Base32)
//   4文字 = HMAC-SHA256 タグ (20bit, Crockford Base32)
//
// 【方針転換 2026-07】
// 全20章を無料化。paywall は撤去し、AdSense/アフィリエイト路線に。
// BOOTH 商品ページは「サポート＆特典付き」として維持。
// 既存 BOOTH 購入者のため、解放コード入力導線と検証ロジックは残置。
// 将来的に「特典解放」など別用途に転用する可能性あり。

const Unlock = (() => {
  // ⚠️ tools/generate_codes.py の SECRET_HEX と完全一致させること
  const SECRET_HEX = 'cbf5f387e8716576a50e3ceef8c66080';

  // ★ FREE_LEVELS を TOTAL_LEVELS (20) に設定 → 全章無料
  //   isPaidLevel() が常に false を返し、章に paywall がかからない
  const FREE_LEVELS  = 20;
  const UNLOCK_KEY   = 'cafeinology_unlocked_v1';
  const BOOTH_URL    = 'https://cafeinology.booth.pm/items/8603920';
  const PRODUCT_NAME = 'CAFEINOLOGY CODEX — サポータープラン';
  const PRICE_JPY    = 780;

  // Crockford Base32 (I, L, O, U を除く)
  const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const ALPHA_SET = new Set([...ALPHABET]);

  // ---------- ヘルパ ----------
  function hexToBytes(hex) {
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i++) {
      out[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return out;
  }

  async function hmacSha256(keyBytes, messageBytes) {
    const cryptoKey = await crypto.subtle.importKey(
      'raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    return crypto.subtle.sign('HMAC', cryptoKey, messageBytes);
  }

  function bytesToBase32(bytes, length) {
    let bits = 0, value = 0, out = '';
    for (let i = 0; i < bytes.length; i++) {
      value = (value << 8) | bytes[i];
      bits += 8;
      while (bits >= 5) {
        out += ALPHABET[(value >>> (bits - 5)) & 0x1f];
        bits -= 5;
      }
    }
    if (bits > 0) {
      out += ALPHABET[(value << (5 - bits)) & 0x1f];
    }
    return out.substring(0, length);
  }

  // ユーザー入力の正規化: 区切り削除 / 大文字 / 紛らわしい文字を変換
  function normalizeCode(input) {
    return String(input || '')
      .toUpperCase()
      .replace(/[-_\s]/g, '')
      .replace(/O/g, '0')
      .replace(/I/g, '1')
      .replace(/L/g, '1');
  }

  // ---------- 検証 ----------
  async function verifyCode(rawCode) {
    if (!rawCode) return false;
    const code = normalizeCode(rawCode);

    // 期待長: CCDX(4) + ID(8) + TAG(4) = 16
    if (code.length !== 16) return false;
    if (!code.startsWith('CCDX')) return false;

    const payload = code.substring(4);          // 12文字
    const idPart  = payload.substring(0, 8);
    const tagPart = payload.substring(8, 12);

    // 全文字がCrockford Base32に含まれていること
    for (const c of payload) {
      if (!ALPHA_SET.has(c)) return false;
    }

    // HMACで再計算してタグを照合
    try {
      const enc      = new TextEncoder();
      const keyBytes = hexToBytes(SECRET_HEX);
      const msgBytes = enc.encode('CCDX' + idPart);
      const sigBuf   = await hmacSha256(keyBytes, msgBytes);
      const sigBytes = new Uint8Array(sigBuf);
      const expected = bytesToBase32(sigBytes, 4);
      return tagPart === expected;
    } catch (e) {
      return false;
    }
  }

  function isUnlocked() {
    try {
      return localStorage.getItem(UNLOCK_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function setUnlocked() {
    try {
      localStorage.setItem(UNLOCK_KEY, '1');
    } catch (e) { /* ignore */ }
  }

  async function applyCode(rawCode) {
    const ok = await verifyCode(rawCode);
    if (ok) setUnlocked();
    return ok;
  }

  function isPaidLevel(level) {
    return Number(level) > FREE_LEVELS;
  }

  // 入力フィールド表示用の整形 (CCDX-XXXX-XXXX-XXXX)
  function formatForDisplay(raw) {
    const c = normalizeCode(raw).substring(0, 16);
    if (c.length <= 4)  return c;
    if (c.length <= 8)  return c.substring(0, 4) + '-' + c.substring(4);
    if (c.length <= 12) return c.substring(0, 4) + '-' + c.substring(4, 8) + '-' + c.substring(8);
    return c.substring(0, 4) + '-' + c.substring(4, 8) + '-' + c.substring(8, 12) + '-' + c.substring(12, 16);
  }

  return {
    FREE_LEVELS,
    BOOTH_URL,
    PRODUCT_NAME,
    PRICE_JPY,
    verifyCode,
    isUnlocked,
    applyCode,
    isPaidLevel,
    formatForDisplay,
    normalizeCode,
  };
})();
