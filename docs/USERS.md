# DUMMY USERS v4.0 — ICU CLASS BANK HANA

## 8 Users — Semua tampil di login page (klik langsung masuk)

| ID | Nama | Role | Cabang | Supervisor |
|---|---|---|---|---|
| rh_001 | Budi Hartono | RH | Regional Jakarta | — |
| bm_001 | Drs. Agus Salim | BM | Regional Jakarta | rh_001 |
| fwss_001 | Hendra Wijaya | FWSS | Cabang Jakarta Pusat | bm_001 |
| fwss_002 | Maya Sari | FWSS | Cabang Jakarta Selatan | bm_001 |
| fa_001 | Andi Pratama | FA | Cabang Jakarta Pusat | fwss_001 |
| fa_002 | Sari Dewi | FA | Cabang Jakarta Pusat | fwss_001 |
| fa_003 | Budi Santoso | FA | Cabang Jakarta Selatan | fwss_002 |
| fa_004 | Rina Marlina | FA | Cabang Jakarta Selatan | fwss_002 |

**Password semua:** `icu2026`

## Relasi Monitoring
- fwss_001 → monitor fa_001, fa_002
- fwss_002 → monitor fa_003, fa_004
- bm_001   → monitor fwss_001, fwss_002 (+ FA semua indirect)
- rh_001   → monitor semua (bm, fwss, fa)
