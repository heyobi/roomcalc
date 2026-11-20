# Draws the app icon (1024x1024, no alpha) and the splash image, then copies them into the iOS project.
# A floor plan (L-shaped room with planks) inside LiDAR scan brackets, on a warm orange gradient.
# Usage: python scripts/icon.py
from PIL import Image, ImageDraw, ImageFilter
import shutil

S = 1024
img = Image.new('RGB', (S, S))
d = ImageDraw.Draw(img)
for y in range(S):
    for_x = None
    t = y / S
    d.line([(0, y), (S, y)], fill=(int(255 - 22 * t), int(146 - 64 * t), int(66 - 54 * t)))
glow = Image.new('RGBA', (S, S), (0, 0, 0, 0))
ImageDraw.Draw(glow).ellipse([120, 60, 760, 640], fill=(255, 214, 160, 90))
glow = glow.filter(ImageFilter.GaussianBlur(120))
img.paste(glow, (0, 0), glow)
d = ImageDraw.Draw(img)

W = (255, 255, 255)
# L-shaped floor plan
room = [(300, 300), (724, 300), (724, 560), (560, 560), (560, 724), (300, 724)]
# planks: clipped stripes
mask = Image.new('L', (S, S), 0)
ImageDraw.Draw(mask).polygon(room, fill=255)
planks = Image.new('RGBA', (S, S), (0, 0, 0, 0))
pd = ImageDraw.Draw(planks)
pd.polygon(room, fill=(255, 255, 255, 60))
for i, y in enumerate(range(300, 730, 54)):
    pd.line([(300, y), (724, y)], fill=(255, 255, 255, 120), width=6)
    off = 90 if i % 2 else 210
    for x in range(300 + off, 724, 240):
        pd.line([(x, y), (x, y + 54)], fill=(255, 255, 255, 120), width=6)
img.paste(planks, (0, 0), Image.composite(planks, Image.new('RGBA', (S, S)), mask).split()[3])
d = ImageDraw.Draw(img)
d.line(room + [room[0]], fill=W, width=34, joint='curve')
for p in room:
    d.ellipse([p[0] - 17, p[1] - 17, p[0] + 17, p[1] + 17], fill=W)

# scan corner brackets
L, w, m = 130, 40, 170
for (x, y, sx, sy) in [(m, m, 1, 1), (S - m, m, -1, 1), (m, S - m, 1, -1), (S - m, S - m, -1, -1)]:
    d.line([(x, y + sy * L), (x, y), (x + sx * L, y)], fill=W, width=w, joint='curve')
    for px, py in [(x, y + sy * L), (x + sx * L, y)]:
        d.ellipse([px - w / 2, py - w / 2, px + w / 2, py + w / 2], fill=W)
    d.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=W)
img.save('assets/icon-1024.png')

sp = Image.new('RGB', (2732, 2732), (16, 17, 20))
small = img.resize((360, 360), Image.LANCZOS)
mk = Image.new('L', (360, 360), 0)
ImageDraw.Draw(mk).rounded_rectangle([0, 0, 359, 359], radius=80, fill=255)
sp.paste(small, (1186, 1186), mk)
sp.save('assets/splash-2732.png')

shutil.copy('assets/icon-1024.png', 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png')
for n in ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']:
    shutil.copy('assets/splash-2732.png', f'ios/App/App/Assets.xcassets/Splash.imageset/{n}')
print('icon ok')
