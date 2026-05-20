#!/usr/bin/env python3
"""
CAFEINOLOGY CODEX 解放コード生成スクリプト

使い方:
  python3 tools/generate_codes.py 100              # 100個のコードを生成 (標準出力)
  python3 tools/generate_codes.py 100 --out codes.txt  # ファイル出力
  python3 tools/generate_codes.py 10 --verify       # 生成 + その場で検証

コード形式: CCDX-XXXX-XXXX-XXXX
- CCDX = プレフィックス
- 8文字 = ランダムID (40bit, Crockford Base32)
- 4文字 = HMAC-SHA256 タグ (20bit, Crockford Base32)

⚠️ SECRET_HEX は unlock.js と完全一致させること。
   秘密鍵が漏れたら新しいキーで再生成→旧コードを失効させる。
"""
import argparse
import hmac
import hashlib
import secrets

# !!! unlock.js の SECRET_HEX と完全に一致させること !!!
SECRET_HEX = 'cbf5f387e8716576a50e3ceef8c66080'

# Crockford Base32 (I, L, O, U 除外)
ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'


def to_base32(data: bytes, length: int) -> str:
    bits = 0
    value = 0
    out = []
    for b in data:
        value = (value << 8) | b
        bits += 8
        while bits >= 5:
            out.append(ALPHABET[(value >> (bits - 5)) & 0x1f])
            bits -= 5
    if bits > 0:
        out.append(ALPHABET[(value << (5 - bits)) & 0x1f])
    return ''.join(out)[:length]


def generate_id(seen: set) -> str:
    """40bit (5バイト) のランダム → 8文字 Base32 ID"""
    while True:
        rand = secrets.token_bytes(5)
        id8 = to_base32(rand, 8)
        if id8 not in seen and len(id8) == 8:
            seen.add(id8)
            return id8


def sign_id(id8: str) -> str:
    """HMAC-SHA256 で署名し、先頭5バイト(40bit)から4文字Base32タグを取り出す"""
    secret = bytes.fromhex(SECRET_HEX)
    msg = ('CCDX' + id8).encode('utf-8')
    sig = hmac.new(secret, msg, hashlib.sha256).digest()
    return to_base32(sig, 4)


def make_code(seen: set) -> str:
    id8 = generate_id(seen)
    tag = sign_id(id8)
    raw = 'CCDX' + id8 + tag  # 16文字
    return f'{raw[0:4]}-{raw[4:8]}-{raw[8:12]}-{raw[12:16]}'


def verify_code(code: str) -> bool:
    """生成スクリプト側でも検証可能（出荷前のセルフチェック用）"""
    norm = code.upper().replace('-', '').replace(' ', '')
    if len(norm) != 16 or not norm.startswith('CCDX'):
        return False
    id8 = norm[4:12]
    tag = norm[12:16]
    return sign_id(id8) == tag


def main():
    p = argparse.ArgumentParser(description='CAFEINOLOGY CODEX 解放コード生成')
    p.add_argument('count', type=int, help='生成するコード数')
    p.add_argument('--out', help='出力ファイル (省略時は標準出力)')
    p.add_argument('--verify', action='store_true', help='生成後にセルフチェック')
    args = p.parse_args()

    if SECRET_HEX == 'CHANGE_ME' or len(SECRET_HEX) != 32:
        raise SystemExit('❌ SECRET_HEX が未設定または不正です。unlock.js と一致させてください。')

    seen: set = set()
    codes = [make_code(seen) for _ in range(args.count)]

    if args.verify:
        for c in codes:
            assert verify_code(c), f'検証失敗: {c}'
        print(f'✅ {args.count}個すべて検証OK', flush=True)

    if args.out:
        with open(args.out, 'w', encoding='utf-8') as f:
            for c in codes:
                f.write(c + '\n')
        print(f'✅ {args.count}個のコードを {args.out} に出力しました')
    else:
        for c in codes:
            print(c)


if __name__ == '__main__':
    main()
