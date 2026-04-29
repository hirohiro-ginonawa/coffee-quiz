#!/usr/bin/env python3
"""
CAFEINOLOGY CODEX ブランドアイコン生成
  icon-192.png / icon-512.png / ogp.png
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math

# ========== パレット ==========
BG_CENTER = (30, 42, 58)      # #1e2a3a
BG_MID    = (15, 22, 32)      # #0f1620
BG_EDGE   = (10, 16, 24)      # #0a1018
BORDER    = (42, 54, 71)      # #2a3647
ACCENT    = (168, 197, 220)   # #a8c5dc
ACCENT_D  = (126, 166, 196)   # #7ea6c4

# 金箔グラデーション (style.cssと同じ)
GOLD_STOPS = [
    (0.0,  (232, 215, 154)),  # #e8d79a
    (0.3,  (212, 194, 138)),  # #d4c28a
    (0.5,  (245, 231, 181)),  # #f5e7b5
    (0.75, (184, 154, 90)),   # #b89a5a
    (1.0,  (212, 194, 138)),  # #d4c28a
]

# ========== フォントパス ==========
SERIF      = "/System/Library/Fonts/Supplemental/Didot.ttc"       # ロゴ金箔用 (Cinzel代替)
SERIF_BOLD = "/System/Library/Fonts/Supplemental/Georgia Bold.ttf" # fallback
SANS       = "/System/Library/Fonts/Helvetica.ttc"                 # 英語小さい用
JP         = "/System/Library/Fonts/Hiragino Sans GB.ttc"          # 和文

def load_font(path, size):
    return ImageFont.truetype(path, size)

# ========== ユーティリティ ==========
def lerp(a, b, t):
    return tuple(int(a[i] + (b[i]-a[i]) * t) for i in range(3))

def gold_color_at(t):
    """金箔グラデの位置tでの色を返す"""
    for i in range(len(GOLD_STOPS)-1):
        t0, c0 = GOLD_STOPS[i]
        t1, c1 = GOLD_STOPS[i+1]
        if t0 <= t <= t1:
            local_t = (t - t0) / (t1 - t0) if t1 > t0 else 0
            return lerp(c0, c1, local_t)
    return GOLD_STOPS[-1][1]

def radial_bg(size_w, size_h):
    """サイトと同じラジアルグラデ背景"""
    img = Image.new('RGB', (size_w, size_h), BG_EDGE)
    pixels = img.load()
    cx, cy = size_w / 2, size_h * 0.3
    max_r = math.sqrt(max(cx, size_w-cx)**2 + max(cy, size_h-cy)**2)
    for y in range(size_h):
        for x in range(size_w):
            r = math.sqrt((x-cx)**2 + (y-cy)**2) / max_r
            if r < 0.55:
                t = r / 0.55
                color = lerp(BG_CENTER, BG_MID, t)
            else:
                t = min(1.0, (r - 0.55) / 0.45)
                color = lerp(BG_MID, BG_EDGE, t)
            pixels[x, y] = color
    return img

def gold_gradient_image(w, h, angle_deg=135):
    """斜め135度の金箔グラデ画像 (style.cssと揃える)"""
    img = Image.new('RGB', (w, h))
    pixels = img.load()
    rad = math.radians(angle_deg)
    dx, dy = math.cos(rad), math.sin(rad)
    # グラデの長さ = 対角線の投影
    proj_min = min(0*dx + 0*dy, (w-1)*dx + 0*dy, 0*dx + (h-1)*dy, (w-1)*dx + (h-1)*dy)
    proj_max = max(0*dx + 0*dy, (w-1)*dx + 0*dy, 0*dx + (h-1)*dy, (w-1)*dx + (h-1)*dy)
    for y in range(h):
        for x in range(w):
            proj = x*dx + y*dy
            t = (proj - proj_min) / (proj_max - proj_min) if proj_max > proj_min else 0
            pixels[x, y] = gold_color_at(t)
    return img

def gold_text(draw_to, text, font, xy, anchor="lt", glow=True):
    """drawパラメータの位置に、金箔グラデのテキストを合成して描く"""
    # マスク生成
    tmp_mask = Image.new('L', draw_to.size, 0)
    md = ImageDraw.Draw(tmp_mask)
    md.text(xy, text, font=font, fill=255, anchor=anchor)

    # バウンディングを取得してグラデ画像を作る
    bbox = tmp_mask.getbbox()
    if not bbox:
        return
    gx0, gy0, gx1, gy1 = bbox
    gw, gh = gx1-gx0, gy1-gy0
    gold_img = gold_gradient_image(gw, gh)

    # 全画面サイズの金箔レイヤーに配置
    full_gold = Image.new('RGB', draw_to.size, (0,0,0))
    full_gold.paste(gold_img, (gx0, gy0))

    # グロー (金色の柔らかい影)
    if glow:
        glow_mask = tmp_mask.filter(ImageFilter.GaussianBlur(radius=max(2, gh // 20)))
        glow_layer = Image.new('RGBA', draw_to.size, (212, 194, 138, 0))
        glow_draw = ImageDraw.Draw(glow_layer)
        # compose glow by using mask
        glow_rgba = Image.new('RGBA', draw_to.size, (212, 194, 138, 90))
        draw_to.paste(glow_rgba, (0,0), glow_mask)

    # 金箔テキスト本体を合成
    draw_to.paste(full_gold, (0,0), tmp_mask)

# ========== PWAアイコン (正方形) ==========
def make_icon(size):
    img = radial_bg(size, size)

    # 細いゴールドの外枠 (内側マージン)
    draw = ImageDraw.Draw(img)
    m = int(size * 0.06)
    # 薄いボーダー
    draw.rectangle([m, m, size-m-1, size-m-1],
                   outline=(60, 72, 90), width=max(1, size // 256))

    # 中央の大きな "C"
    font_size = int(size * 0.72)
    try:
        font = load_font(SERIF, font_size)
    except Exception:
        font = load_font(SERIF_BOLD, font_size)

    # 中央に配置
    cx, cy = size / 2, size / 2 + int(size * 0.02)
    gold_text(img, "C", font, (cx, cy), anchor="mm", glow=True)

    # 下部に小さく "CODEX" (512のみ)
    if size >= 384:
        small_font_size = int(size * 0.08)
        try:
            sf = load_font(SERIF, small_font_size)
        except Exception:
            sf = load_font(SERIF_BOLD, small_font_size)
        small_draw = ImageDraw.Draw(img)
        small_draw.text(
            (size / 2, size - int(size * 0.08)),
            "CODEX",
            font=sf,
            fill=(132, 148, 168),  # 少し暗めのアクセント
            anchor="mm",
        )

    return img

# ========== OGP画像 (1200x630) ==========
def make_ogp():
    W, H = 1200, 630
    img = radial_bg(W, H)
    draw = ImageDraw.Draw(img)

    # 外枠
    draw.rectangle([0, 0, W-1, H-1], outline=BORDER, width=2)
    # 内側の細い金箔ライン
    draw.rectangle([30, 30, W-31, H-31], outline=(90, 78, 54), width=1)

    # 左ブロック: 巨大な C
    left_w = 360
    try:
        big_c = load_font(SERIF, 380)
    except Exception:
        big_c = load_font(SERIF_BOLD, 380)
    gold_text(img, "C", big_c, (left_w // 2 + 50, H // 2 - 10), anchor="mm")

    # 垂直の金箔セパレータ
    sep_x = left_w + 60
    for y in range(120, H - 120):
        t = 1 - abs((y - H/2) / (H/2 - 120))
        col = (184, 154, 90)
        draw.point((sep_x, y), fill=col)

    # 右ブロック: テキスト
    rx = sep_x + 40
    # 右ブロックの利用可能幅のガイドライン (枠まで30px余白を見込む)
    right_max = W - 31 - 30

    # 小さなラベル
    try:
        label_font = load_font(SANS, 17)
    except Exception:
        label_font = load_font(SERIF_BOLD, 17)
    draw.text((rx, 135), "VOLUME I   -   THE CODEX OF COFFEE",
              font=label_font, fill=(120, 138, 158))

    # メインタイトル (2行に分けてきっちり収める)
    try:
        title_font = load_font(SERIF, 88)
    except Exception:
        title_font = load_font(SERIF_BOLD, 88)
    gold_text(img, "COFFEE", title_font, (rx, 175))
    gold_text(img, "CODEX",  title_font, (rx, 275))

    # 日本語タグライン
    jp_font = load_font(JP, 38)
    draw.text((rx, 400), "珈琲の叡智を綴じた書",
              font=jp_font, fill=(220, 228, 237))

    # 英語サブ
    try:
        sub_font = load_font(SERIF, 24)
    except Exception:
        sub_font = load_font(SERIF_BOLD, 24)
    draw.text((rx, 460), "The Codex of Coffee",
              font=sub_font, fill=(155, 169, 184))

    # 下部メタ情報
    try:
        meta_font = load_font(SANS, 18)
    except Exception:
        meta_font = load_font(SERIF_BOLD, 18)
    draw.text((rx, 530), "1000 ENTRIES    20 CHAPTERS    #CafeinologyCodex",
              font=meta_font, fill=(168, 197, 220))

    # 左下の装飾
    try:
        ornament_font = load_font(SERIF, 20)
    except Exception:
        ornament_font = load_font(SERIF_BOLD, 20)
    draw.text((60, H - 62), "MMXXV",
              font=ornament_font, fill=(120, 138, 158))

    return img

# ========== 実行 ==========
if __name__ == "__main__":
    import os
    out_dir = os.path.dirname(os.path.abspath(__file__))

    for size in (192, 512):
        path = os.path.join(out_dir, f"icon-{size}.png")
        img = make_icon(size)
        img.save(path, "PNG", optimize=True)
        print(f"✅ {path}  ({size}x{size})")

    ogp_path = os.path.join(out_dir, "ogp.png")
    ogp = make_ogp()
    ogp.save(ogp_path, "PNG", optimize=True)
    print(f"✅ {ogp_path}  (1200x630)")
