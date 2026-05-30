# BRAND GUIDELINES — BANK HANA
## Design System Reference untuk ICU Class App

---

## Logo
- File: `assets/hana-bank-logo.png`
- Deskripsi: Karakter kaligrafi Korea bergaya dinamis, teal dengan aksen pink
- Warna logo: Primary Teal #04B292 + Accent Pink #E62560
- Usage: Header app, login screen, loading screen
- Background: Gunakan di atas putih atau dark charcoal (bukan di atas teal)

---

## Color Palette

### Primary — Teal (Brand Utama)
| Token | Hex | Penggunaan |
|---|---|---|
| teal-50 | #EAF9F6 | Background ringan, hover state |
| teal-100 | #CDF0E9 | Icon background, badge bg |
| teal-500 | #04B292 | Logo, primary button, link aktif |
| teal-600 | #038E75 | Button hover, heading di light mode |
| teal-700 | #026B58 | Dark bg elemen, footer |

### Accent — Pink (CTA & Highlight)
| Token | Hex | Penggunaan |
|---|---|---|
| pink-50 | #FDECF2 | Badge bg, alert ringan |
| pink-100 | #FAD3DF | Highlight bg |
| pink-500 | #E62560 | CTA button, badge promo, alert |
| pink-600 | #B81E4D | CTA hover, teks kecil di bg terang |

### Neutral
| Token | Hex | Penggunaan |
|---|---|---|
| charcoal | #1F2933 | Background utama dark, teks pada light |
| slate | #52616B | Teks sekunder, placeholder |
| light-gray | #F5F7FA | Background page light mode |
| border-gray | #D9E2EC | Border, divider |
| white | #FFFFFF | Background card, teks di dark bg |

### Score Colors (Khusus ICU)
| Level | Hex | Tailwind approx |
|---|---|---|
| CRITICAL (1) | #EF4444 | red-500 |
| RECOVERY (2) | #F97316 | orange-500 |
| ON TRACK (3) | #3B82F6 | blue-500 |
| HIGH IMPACT (4) | #22C55E | green-500 |

---

## Typography

### Font Stack
```css
/* Display & Heading */
font-family: 'Barlow Condensed', sans-serif;
/* Body */
font-family: 'DM Sans', sans-serif;
```

### Google Fonts Import
```html
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
```

### Scale
| Element | Font | Weight | Size |
|---|---|---|---|
| App Title | Barlow Condensed | 800 | 32px |
| Page Heading | Barlow Condensed | 700 | 24px |
| Section Title | Barlow Condensed | 600 | 18px |
| Body | DM Sans | 400 | 14px |
| Label | DM Sans | 500 | 12px |
| Caption | DM Sans | 400 | 11px |

---

## App Theme (Dark Mode — Default)

```css
:root {
  --bg-primary:    #1F2933;   /* Charcoal — main background */
  --bg-card:       #263544;   /* Card, panel background */
  --bg-elevated:   #2E4057;   /* Elevated card, modal */
  --border:        #374B5C;   /* Subtle borders */
  
  --text-primary:  #FFFFFF;
  --text-secondary:#A0B4C8;
  --text-muted:    #52616B;
  
  --accent-teal:   #04B292;   /* Primary action */
  --accent-pink:   #E62560;   /* Secondary CTA */
  --accent-teal-dark: #026B58;
  
  --score-1: #EF4444;
  --score-2: #F97316;
  --score-3: #3B82F6;
  --score-4: #22C55E;
}
```

---

## Component Patterns

### Primary Button (Teal)
```
bg: #04B292  |  text: white  |  hover: #038E75
border-radius: 8px  |  padding: 12px 24px
font: DM Sans 600 14px
```

### CTA Button (Pink)
```
bg: #E62560  |  text: white  |  hover: #B81E4D
border-radius: 8px  |  padding: 12px 24px
```

### Card
```
bg: #263544  |  border: 1px solid #374B5C
border-radius: 12px  |  padding: 16px
```

### Score Badge
```
CRITICAL:    bg #EF4444/20  text #EF4444
RECOVERY:    bg #F97316/20  text #F97316
ON TRACK:    bg #3B82F6/20  text #3B82F6
HIGH IMPACT: bg #22C55E/20  text #22C55E
border-radius: 9999px  |  padding: 4px 12px
font: DM Sans 600 11px UPPERCASE
```

---

## Accessibility Notes
- JANGAN gunakan teal #04B292 sebagai teks di atas putih (kontras rendah)
- Gunakan teal-700 #026B58 untuk teks di background terang
- Pink #E62560 cukup kontras untuk CTA di atas putih
- Untuk teks kecil: gunakan pink-600 #B81E4D
- Dark theme app: teal-500 di atas charcoal = kontras baik ✓

---

*Referensi: hana-palette-analysis.png*
