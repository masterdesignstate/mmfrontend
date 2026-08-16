from __future__ import annotations

from pathlib import Path
import math
import random

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "assets"
OUTPUT = ASSETS / "compatiblefirst-ranked-premium-from-scratch-v33.png"

S = 2
W, H = 1672, 941
PURPLE = (103, 45, 183)
VIOLET = (124, 58, 237)
LIGHT_VIOLET = (168, 85, 247)
INK = (16, 24, 40)
MUTED = (94, 89, 108)
FONT_REGULAR = "/System/Library/Fonts/Supplemental/Arial.ttf"
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"


def q(value: float) -> int:
    return round(value * S)


def font(size: float, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REGULAR, q(size))


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    return mask


def make_background() -> Image.Image:
    w, h = q(W), q(H)
    yy, xx = np.mgrid[0:h, 0:w]
    base = np.ones((h, w, 3), dtype=np.float32)
    base[:] = (249, 248, 252)

    def glow(cx: float, cy: float, radius: float, color: tuple[int, int, int], strength: float) -> None:
        distance = np.sqrt((xx - q(cx)) ** 2 + (yy - q(cy)) ** 2)
        alpha = np.clip(1 - distance / q(radius), 0, 1) ** 2 * strength
        nonlocal base
        base = base * (1 - alpha[..., None]) + np.array(color) * alpha[..., None]

    glow(1120, 455, 640, (244, 238, 255), 0.72)
    glow(170, 820, 460, (241, 235, 255), 0.58)
    glow(1540, 110, 300, (249, 243, 255), 0.48)
    glow(770, 220, 520, (255, 255, 255), 0.72)

    rng = np.random.default_rng(31)
    noise = rng.normal(0, 0.75, (h, w, 1))
    base = np.clip(base + noise, 0, 255).astype(np.uint8)
    return Image.fromarray(base, "RGB").convert("RGBA")


def draw_background_details(canvas: Image.Image) -> None:
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)

    # Quiet dotted arcs, kept away from the content.
    for cx, cy, radius, start, end in [
        (120, 805, 205, 190, 340),
        (1540, 120, 150, 70, 210),
        (1610, 690, 170, 120, 265),
    ]:
        for angle in np.linspace(start, end, 44):
            rad = math.radians(angle)
            x = q(cx + math.cos(rad) * radius)
            y = q(cy + math.sin(rad) * radius)
            r = q(1.55)
            draw.ellipse((x - r, y - r, x + r, y + r), fill=(124, 58, 237, 24))

    # Sparse network marks near the footer.
    points = [(108, 745), (178, 706), (248, 772), (198, 846), (314, 824), (1090, 810), (1145, 760), (1204, 826)]
    edges = [(0, 1), (1, 2), (1, 3), (2, 4), (5, 6), (6, 7)]
    for a, b in edges:
        draw.line((*map(q, points[a]), *map(q, points[b])), fill=(255, 255, 255, 120), width=q(1))
    for x, y in points:
        r = q(2.2)
        draw.ellipse((q(x) - r, q(y) - r, q(x) + r, q(y) + r), fill=(255, 255, 255, 210))

    # Large broken editorial arcs create depth without reading as another card.
    for radius, alpha in [(310, 24), (355, 18), (405, 12)]:
        r = q(radius)
        box = (q(1110) - r, q(465) - r, q(1110) + r, q(465) + r)
        draw.arc(box, 206, 330, fill=(124, 58, 237, alpha), width=q(1))
        draw.arc(box, 18, 112, fill=(255, 255, 255, alpha + 22), width=q(1))
    canvas.alpha_composite(layer)


def paste_logo(canvas: Image.Image) -> None:
    logo = Image.open(ASSETS / "compatiblefirst-com-lockup-v10.png").convert("RGB")
    arr = np.asarray(logo)
    alpha = np.clip(np.max(255 - arr, axis=-1) * 2.7, 0, 255).astype(np.uint8)
    rgba = logo.convert("RGBA")
    rgba.putalpha(Image.fromarray(alpha, "L"))
    rgba.thumbnail((q(390), q(82)), Image.Resampling.LANCZOS)
    canvas.alpha_composite(rgba, (q(1210), q(49)))


def draw_headline(canvas: Image.Image) -> None:
    draw = ImageDraw.Draw(canvas)
    draw.text((q(82), q(68)), "Compatibility", font=font(74, True), fill=INK)
    # Product-purple gradient, masked through the headline for a less generic title treatment.
    headline_mask = Image.new("L", canvas.size, 0)
    ImageDraw.Draw(headline_mask).text((q(82), q(146)), "Comes First", font=font(74, True), fill=255)
    h = canvas.height
    grad = np.zeros((h, canvas.width, 4), dtype=np.uint8)
    x = np.linspace(0, 1, canvas.width)[None, :, None]
    start = np.array([168, 85, 247], dtype=float)
    end = np.array([103, 45, 183], dtype=float)
    grad[..., :3] = (start * (1 - x) + end * x).astype(np.uint8)
    grad[..., 3] = np.asarray(headline_mask)
    canvas.alpha_composite(Image.fromarray(grad, "RGBA"))
    draw.text((q(87), q(257)), "Your inputs shape every compatibility score", font=font(26), fill=MUTED)


def paste_you(canvas: Image.Image) -> None:
    size = q(230)
    photo = Image.open(ASSETS / "compatiblefirst-portrait-you-v10.png").convert("RGB")
    photo = ImageOps.fit(photo, (size, size), Image.Resampling.LANCZOS, centering=(0.5, 0.47)).convert("RGBA")
    circle = Image.new("L", (size, size), 0)
    ImageDraw.Draw(circle).ellipse((0, 0, size - 1, size - 1), fill=255)
    photo.putalpha(circle)

    shadow = Image.new("RGBA", (size + q(40), size + q(40)), (0, 0, 0, 0))
    sm = Image.new("L", (size, size), 0)
    ImageDraw.Draw(sm).ellipse((0, 0, size - 1, size - 1), fill=72)
    solid = Image.new("RGBA", (size, size), (45, 24, 86, 72))
    solid.putalpha(sm)
    shadow.alpha_composite(solid, (q(20), q(26)))
    shadow = shadow.filter(ImageFilter.GaussianBlur(q(10)))
    canvas.alpha_composite(shadow, (q(31), q(313)))

    rim = Image.new("RGBA", (size + q(10), size + q(10)), (0, 0, 0, 0))
    rd = ImageDraw.Draw(rim)
    rd.ellipse((0, 0, rim.width - 1, rim.height - 1), fill=(255, 255, 255, 245))
    canvas.alpha_composite(rim, (q(41), q(331)))
    canvas.alpha_composite(photo, (q(46), q(336)))
    ImageDraw.Draw(canvas).text((q(160), q(594)), "You", font=font(40, True), fill=(0, 0, 0), anchor="ma")


def glass_panel(canvas: Image.Image, box: tuple[int, int, int, int], radius: int) -> None:
    x0, y0, x1, y1 = map(q, box)
    w, h = x1 - x0, y1 - y0
    shadow = Image.new("RGBA", (w + q(50), h + q(50)), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((q(25), q(31), q(25) + w, q(31) + h), radius=q(radius), fill=(67, 33, 107, 40))
    shadow = shadow.filter(ImageFilter.GaussianBlur(q(13)))
    canvas.alpha_composite(shadow, (x0 - q(25), y0 - q(25)))

    panel = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    pd = ImageDraw.Draw(panel)
    pd.rounded_rectangle((0, 0, w - 1, h - 1), radius=q(radius), fill=(255, 255, 255, 175), outline=(225, 215, 248, 230), width=q(2))
    pd.rounded_rectangle((q(8), q(8), w - q(9), h - q(9)), radius=q(radius - 5), outline=(255, 255, 255, 210), width=q(2))
    canvas.alpha_composite(panel, (x0, y0))


def icon_circle() -> Image.Image:
    size = q(112)
    yy, xx = np.mgrid[0:size, 0:size]
    cx = cy = (size - 1) / 2
    dist = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / (size / 2)
    light = np.clip(1 - dist, 0, 1)
    highlight = np.clip(1 - np.sqrt((xx - size * 0.30) ** 2 + (yy - size * 0.22) ** 2) / (size * 0.82), 0, 1)
    dark = np.array([54, 14, 139], dtype=float)
    bright = np.array([139, 92, 246], dtype=float)
    arr = dark + (bright - dark) * (0.25 + light[..., None] * 0.42 + highlight[..., None] * 0.38)
    arr = np.clip(arr, 0, 255).astype(np.uint8)
    alpha = np.where(dist <= 1, 255, 0).astype(np.uint8)
    image = Image.fromarray(np.dstack([arr, alpha]), "RGBA")

    shadow = Image.new("RGBA", (size + q(30), size + q(30)), (0, 0, 0, 0))
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=78)
    solid = Image.new("RGBA", (size, size), (42, 20, 82, 78))
    solid.putalpha(mask)
    shadow.alpha_composite(solid, (q(15), q(20)))
    shadow = shadow.filter(ImageFilter.GaussianBlur(q(8)))
    shadow.alpha_composite(image, (q(15), q(15)))
    return shadow


def draw_question_icon(layer: Image.Image, origin: tuple[int, int]) -> None:
    draw = ImageDraw.Draw(layer)
    ox, oy = map(q, origin)
    stroke = q(3)
    draw.rounded_rectangle((ox + q(26), oy + q(24), ox + q(83), oy + q(88)), radius=q(7), outline="white", width=stroke)
    draw.rounded_rectangle((ox + q(43), oy + q(17), ox + q(66), oy + q(31)), radius=q(5), outline="white", width=stroke)
    for y in (43, 59, 75):
        draw.line((ox + q(36), oy + q(y), ox + q(41), oy + q(y + 5), ox + q(49), oy + q(y - 5)), fill="white", width=stroke, joint="curve")
        draw.line((ox + q(55), oy + q(y), ox + q(74), oy + q(y)), fill="white", width=stroke)


def draw_arrows_icon(layer: Image.Image, origin: tuple[int, int]) -> None:
    draw = ImageDraw.Draw(layer)
    ox, oy = map(q, origin)
    stroke = q(4)
    draw.line((ox + q(28), oy + q(43), ox + q(79), oy + q(43)), fill="white", width=stroke)
    draw.line((ox + q(28), oy + q(43), ox + q(42), oy + q(30)), fill="white", width=stroke)
    draw.line((ox + q(28), oy + q(43), ox + q(42), oy + q(56)), fill="white", width=stroke)
    draw.line((ox + q(79), oy + q(70), ox + q(28), oy + q(70)), fill="white", width=stroke)
    draw.line((ox + q(79), oy + q(70), ox + q(65), oy + q(57)), fill="white", width=stroke)
    draw.line((ox + q(79), oy + q(70), ox + q(65), oy + q(83)), fill="white", width=stroke)


def draw_sort_icon(layer: Image.Image, origin: tuple[int, int]) -> None:
    draw = ImageDraw.Draw(layer)
    ox, oy = map(q, origin)
    for y in (33, 55, 77):
        draw.ellipse((ox + q(23), oy + q(y - 7), ox + q(35), oy + q(y + 5)), fill="white")
        draw.rounded_rectangle((ox + q(19), oy + q(y + 5), ox + q(39), oy + q(y + 13)), radius=q(4), fill="white")
        draw.line((ox + q(47), oy + q(y + 5), ox + q(69), oy + q(y + 5)), fill="white", width=q(3))
    draw.line((ox + q(79), oy + q(28), ox + q(79), oy + q(83)), fill="white", width=q(4))
    draw.line((ox + q(69), oy + q(73), ox + q(79), oy + q(84), ox + q(89), oy + q(73)), fill="white", width=q(4), joint="curve")


def draw_formula(canvas: Image.Image) -> None:
    glass_panel(canvas, (300, 345, 860, 665), 31)
    # Three lightly separated glass cells give the formula rhythm and depth while keeping it one object.
    cells = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    cell_draw = ImageDraw.Draw(cells)
    for x0, x1 in [(326, 474), (506, 654), (686, 834)]:
        cell_draw.rounded_rectangle(
            (q(x0), q(371), q(x1), q(632)),
            radius=q(24),
            fill=(255, 255, 255, 66),
            outline=(255, 255, 255, 152),
            width=q(1),
        )
    canvas.alpha_composite(cells)
    centers = [(400, 438), (580, 438), (760, 438)]
    icon_layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    for center in centers:
        circle = icon_circle()
        canvas.alpha_composite(circle, (q(center[0] - 71), q(center[1] - 71)))
    draw_question_icon(icon_layer, (344, 382))
    draw_arrows_icon(icon_layer, (524, 382))
    draw_sort_icon(icon_layer, (704, 382))
    canvas.alpha_composite(icon_layer)

    draw = ImageDraw.Draw(canvas)
    draw.text((q(490), q(438)), "+", font=font(42), fill=PURPLE, anchor="mm")
    draw.text((q(670), q(438)), "+", font=font(42), fill=PURPLE, anchor="mm")

    items = [
        (400, "Questions", ["Answer questions", "that matter to you"]),
        (580, "Two-way math", ["Your preferences +", "their preferences"]),
        (760, "Sort by compatibility", ["See the strongest", "matches first"]),
    ]
    for x, title, lines in items:
        draw.text((q(x), q(526)), title, font=font(19, True), fill=INK, anchor="ma")
        draw.text((q(x), q(567)), lines[0], font=font(16), fill=INK, anchor="ma")
        draw.text((q(x), q(594)), lines[1], font=font(16), fill=INK, anchor="ma")


def draw_orbits(canvas: Image.Image, center: tuple[int, int]) -> None:
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    cx, cy = map(q, center)
    for radius, alpha, width in [(155, 105, 1), (177, 76, 1), (200, 56, 1), (220, 34, 1)]:
        r = q(radius)
        box = (cx - r, cy - r, cx + r, cy + r)
        draw.arc(box, 196, 346, fill=(124, 58, 237, alpha), width=q(width))
        draw.arc(box, 18, 164, fill=(124, 58, 237, max(18, alpha - 26)), width=q(width))
    for angle in (20, 112, 202, 294):
        rad = math.radians(angle)
        x = cx + math.cos(rad) * q(177)
        y = cy + math.sin(rad) * q(177)
        r = q(5)
        draw.ellipse((x - r, y - r, x + r, y + r), fill=(103, 45, 183, 235), outline=(255, 255, 255, 230), width=q(2))
    canvas.alpha_composite(layer)


def faceted_sphere(score: int, diameter: int = 264) -> Image.Image:
    size = q(diameter)
    yy, xx = np.mgrid[0:size, 0:size]
    c = (size - 1) / 2
    dist = np.sqrt((xx - c) ** 2 + (yy - c) ** 2) / (size / 2)
    radial = np.clip(1 - dist, 0, 1)
    highlight = np.clip(1 - np.sqrt((xx - size * 0.28) ** 2 + (yy - size * 0.20) ** 2) / (size * 0.72), 0, 1)
    base = np.zeros((size, size, 4), dtype=np.uint8)
    dark = np.array([36, 7, 117], dtype=float)
    bright = np.array([137, 75, 240], dtype=float)
    rgb = dark + (bright - dark) * (radial[..., None] * 0.45 + highlight[..., None] * 0.72)
    base[..., :3] = np.clip(rgb, 0, 255).astype(np.uint8)
    base[..., 3] = np.where(dist <= 1, 255, 0).astype(np.uint8)
    sphere = Image.fromarray(base, "RGBA")

    facets = Image.new("RGBA", sphere.size, (0, 0, 0, 0))
    fd = ImageDraw.Draw(facets)
    rng = random.Random(31)
    step = q(34)
    for y in range(-step, size + step, step):
        offset = step // 2 if (y // step) % 2 else 0
        for x in range(-step, size + step, step):
            x0 = x + offset
            triangles = [((x0, y), (x0 + step, y), (x0 + step // 2, y + step)), ((x0, y), (x0 - step // 2, y + step), (x0 + step // 2, y + step))]
            for tri in triangles:
                cx = sum(p[0] for p in tri) / 3
                cy = sum(p[1] for p in tri) / 3
                if (cx - c) ** 2 + (cy - c) ** 2 > (size * 0.51) ** 2:
                    continue
                light = max(0, 1 - math.hypot(cx - size * 0.27, cy - size * 0.18) / (size * 0.85))
                jitter = rng.uniform(-18, 18)
                color = (int(90 + 74 * light + jitter), int(38 + 40 * light + jitter / 3), int(180 + 63 * light + jitter), 145)
                fd.polygon(tri, fill=color, outline=(255, 255, 255, 42))
    mask = Image.new("L", sphere.size, 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=220)
    facets.putalpha(ImageChops_multiply(facets.getchannel("A"), mask))
    sphere = Image.alpha_composite(sphere, facets)
    sd = ImageDraw.Draw(sphere)
    sd.ellipse((q(2), q(2), size - q(3), size - q(3)), outline=(255, 255, 255, 82), width=q(2))
    sd.text((size // 2, size // 2 + q(4)), f"{score}%", font=font(66, True), fill="white", anchor="mm")
    return sphere


def ImageChops_multiply(a: Image.Image, b: Image.Image) -> Image.Image:
    aa = np.asarray(a, dtype=np.uint16)
    bb = np.asarray(b, dtype=np.uint16)
    return Image.fromarray(((aa * bb) // 255).astype(np.uint8), "L")


def paste_sphere(canvas: Image.Image) -> None:
    center = (1050, 475)
    draw_orbits(canvas, center)
    size = q(264)
    shadow = Image.new("RGBA", (size + q(60), size + q(60)), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.ellipse((q(30), q(38), q(30) + size, q(38) + size), fill=(62, 24, 122, 88))
    shadow = shadow.filter(ImageFilter.GaussianBlur(q(18)))
    canvas.alpha_composite(shadow, (q(center[0] - 162), q(center[1] - 162)))
    canvas.alpha_composite(faceted_sphere(94), (q(center[0] - 132), q(center[1] - 132)))


def draw_result_rail(canvas: Image.Image) -> None:
    # A nearly transparent vertical rail visually groups the ranked results without boxing them in.
    rail = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    rd = ImageDraw.Draw(rail)
    rd.rounded_rectangle(
        (q(1328), q(119), q(1618), q(889)),
        radius=q(34),
        fill=(255, 255, 255, 28),
        outline=(255, 255, 255, 92),
        width=q(1),
    )
    rail = rail.filter(ImageFilter.GaussianBlur(q(0.35)))
    canvas.alpha_composite(rail)


def cubic_points(
    start: tuple[float, float],
    control_a: tuple[float, float],
    control_b: tuple[float, float],
    end: tuple[float, float],
    steps: int = 36,
) -> list[tuple[int, int]]:
    points: list[tuple[int, int]] = []
    for t in np.linspace(0, 1, steps):
        u = 1 - t
        x = u**3 * start[0] + 3 * u**2 * t * control_a[0] + 3 * u * t**2 * control_b[0] + t**3 * end[0]
        y = u**3 * start[1] + 3 * u**2 * t * control_a[1] + 3 * u * t**2 * control_b[1] + t**3 * end[1]
        points.append((q(x), q(y)))
    return points


def draw_connectors(canvas: Image.Image) -> None:
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    width = q(3)

    # You to formula and formula to score.
    draw.line(tuple(map(q, (276, 463, 300, 463))), fill=VIOLET + (245,), width=width)
    draw.line(tuple(map(q, (860, 463, 918, 463))), fill=VIOLET + (245,), width=width)

    routes = [
        cubic_points((1162, 400), (1238, 400), (1220, 255), (1347, 255)),
        cubic_points((1182, 475), (1242, 475), (1286, 507), (1347, 507)),
        cubic_points((1162, 550), (1238, 550), (1220, 759), (1347, 759)),
    ]
    for points in routes:
        draw.line(points, fill=VIOLET + (245,), width=width, joint="curve")
        x, y = points[-1]
        r = q(9)
        draw.ellipse((x - r, y - r, x + r, y + r), fill=(255, 255, 255, 245), outline=VIOLET + (245,), width=q(3))
    for x, y in [(288, 463), (870, 463)]:
        x, y = q(x), q(y)
        r = q(8)
        draw.ellipse((x - r, y - r, x + r, y + r), fill=(255, 255, 255, 245), outline=VIOLET + (245,), width=q(3))
    canvas.alpha_composite(layer)


def result_card(photo_name: str, name: str, score: int, size: int = 220) -> Image.Image:
    n = q(size)
    border = q(5)
    radius = q(14)
    inner = n - border * 2
    palette = np.array([[168, 85, 247], [139, 92, 246], [124, 58, 237], [103, 45, 183], [91, 33, 182]], dtype=np.float32)
    yy, xx = np.mgrid[0:n, 0:n]
    c = (n - 1) / 2
    angle = (np.degrees(np.arctan2(yy - c, xx - c)) + 180) % 360
    stop = score * 3.6
    t = np.clip(angle / max(stop, 1), 0, 1)
    seg = t * (len(palette) - 1)
    idx = np.minimum(seg.astype(int), len(palette) - 2)
    frac = (seg - idx)[..., None]
    rgb = palette[idx] * (1 - frac) + palette[idx + 1] * frac
    rgb[angle > stop] = [196, 181, 226]
    ring_rgba = np.zeros((n, n, 4), dtype=np.uint8)
    ring_rgba[..., :3] = rgb.astype(np.uint8)
    ring_rgba[..., 3] = 255
    outer = rounded_mask((n, n), radius)
    inner_mask = Image.new("L", (n, n), 0)
    ImageDraw.Draw(inner_mask).rounded_rectangle((border, border, n - border - 1, n - border - 1), radius=q(10), fill=255)
    ring_mask = Image.fromarray(np.clip(np.asarray(outer, dtype=np.int16) - np.asarray(inner_mask, dtype=np.int16), 0, 255).astype(np.uint8), "L")
    card = Image.fromarray(ring_rgba, "RGBA")
    card.putalpha(ring_mask)

    photo = Image.open(ASSETS / photo_name).convert("RGB")
    photo = ImageOps.fit(photo, (inner, inner), Image.Resampling.LANCZOS, centering=(0.5, 0.46)).convert("RGBA")
    pm = rounded_mask((inner, inner), q(10))
    content = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    content.paste(photo, (border, border), pm)
    card = Image.alpha_composite(card, content)

    alpha = np.zeros((inner, inner), dtype=np.uint8)
    start = int(inner * 0.43)
    alpha[start:] = np.linspace(0, 215, inner - start, dtype=np.uint8)[:, None]
    fade = Image.new("RGBA", (inner, inner), (0, 0, 0, 0))
    fade.putalpha(Image.fromarray(alpha, "L"))
    overlay = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    overlay.alpha_composite(fade, (border, border))
    card = Image.alpha_composite(card, overlay)

    action = q(34)
    action_mask = Image.new("L", (action, action), 0)
    ad = ImageDraw.Draw(action_mask)
    ad.rounded_rectangle((0, 0, action - 1, action - 1), radius=q(10), fill=255)
    ad.rectangle((0, 0, action - 1, q(10)), fill=255)
    ad.rectangle((0, 0, q(10), action - 1), fill=255)
    glass = Image.new("RGBA", (action, action), (255, 255, 255, 96))
    glass.putalpha(action_mask.point(lambda p: p * 96 // 255))
    card.alpha_composite(glass, (border, border))

    # Crisp vector check instead of a scaled bitmap.
    cd = ImageDraw.Draw(card)
    x0, y0 = border + q(8), border + q(15)
    cd.line((x0, y0, x0 + q(6), y0 + q(6), x0 + q(17), y0 - q(7)), fill=(255, 255, 255, 210), width=q(5), joint="curve")
    cd.line((x0, y0, x0 + q(6), y0 + q(6), x0 + q(17), y0 - q(7)), fill=VIOLET + (255,), width=q(2.4), joint="curve")

    badge_w, badge_h = q(68), q(50)
    bx, by = n - border - badge_w, n - border - badge_h
    bm = Image.new("L", (badge_w, badge_h), 0)
    bd = ImageDraw.Draw(bm)
    bd.rounded_rectangle((0, 0, badge_w - 1, badge_h - 1), radius=q(15), fill=255)
    bd.rectangle((q(15), 0, badge_w - 1, badge_h - 1), fill=255)
    bd.rectangle((0, q(15), badge_w - 1, badge_h - 1), fill=255)
    badge = Image.new("RGBA", (badge_w, badge_h), (255, 255, 255, 96))
    badge.putalpha(bm.point(lambda p: p * 96 // 255))
    card.alpha_composite(badge, (bx, by))

    draw = ImageDraw.Draw(card)
    baseline = n - border - q(14)
    draw.text((border + q(11), baseline), name, font=font(18, True), fill="white", anchor="ls", stroke_width=q(1), stroke_fill=(0, 0, 0, 105))
    draw.text((bx + badge_w // 2, baseline), f"{score}%", font=font(16, True), fill="white", anchor="ms", stroke_width=q(1), stroke_fill=(0, 0, 0, 105))
    return card


def paste_cards(canvas: Image.Image) -> None:
    cards = [
        ("compatiblefirst-portrait-alex-v10.png", "Alex, 29", 94, 145),
        ("compatiblefirst-portrait-marc-v10.png", "Marcus, 31", 88, 397),
        ("compatiblefirst-portrait-eli-v10.png", "Eli, 30", 81, 649),
    ]
    for photo, name, score, y in cards:
        card = result_card(photo, name, score)
        shadow = Image.new("RGBA", (card.width + q(44), card.height + q(44)), (0, 0, 0, 0))
        sm = card.getchannel("A").point(lambda p: p * 66 // 255)
        solid = Image.new("RGBA", card.size, (45, 24, 86, 66))
        solid.putalpha(sm)
        shadow.alpha_composite(solid, (q(22), q(27)))
        shadow = shadow.filter(ImageFilter.GaussianBlur(q(9)))
        canvas.alpha_composite(shadow, (q(1348), q(y - 22)))
        canvas.alpha_composite(card, (q(1370), q(y)))


def draw_footer(canvas: Image.Image) -> None:
    draw = ImageDraw.Draw(canvas)
    draw.text((q(560), q(785)), "Built from", font=font(35, True), fill=PURPLE)
    draw.text((q(560), q(829)), "what matters to you", font=font(29), fill=INK)


def render() -> None:
    canvas = make_background()
    draw_background_details(canvas)
    draw_headline(canvas)
    paste_logo(canvas)
    paste_you(canvas)
    draw_formula(canvas)
    draw_result_rail(canvas)
    draw_connectors(canvas)
    paste_sphere(canvas)
    paste_cards(canvas)
    draw_footer(canvas)
    final = canvas.convert("RGB").resize((W, H), Image.Resampling.LANCZOS)
    final = final.filter(ImageFilter.UnsharpMask(radius=0.65, percent=65, threshold=2))
    final.save(OUTPUT, quality=97)
    print(OUTPUT)


if __name__ == "__main__":
    render()
