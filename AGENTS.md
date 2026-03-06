# AGENTS_V4.md
AGENT OPERATING PROTOCOL

================================================
1. MỤC TIÊU
================================================

Sửa code nhanh
không phá VPS
không phá DB
không mất dữ liệu.

================================================
2. NON NEGOTIABLES
================================================

App đang LIVE.

Không:

DROP DB
WIPE DB
đổi runtime
đổi routing

================================================
3. DATABASE RULE
================================================

Schema change phải:

additive
backward compatible
idempotent

Ví dụ:

ALTER TABLE ADD COLUMN

Check trước:

PRAGMA table_info

================================================
4. MULTI SHOP RULE
================================================

Resolve shop:

slug
query shopId
fallback shop_1

/api/orders
không tin client shopId.

================================================
5. ORDER STATUS CONTRACT
================================================

NEW
CONFIRMED
DONE
REJECTED

Inventory trừ khi:

NEW → CONFIRMED

================================================
6. PAYMENT RULE
================================================

TRANSFER hiển thị:

QR image
bankInfo

QR source:

transferQrUrl

Không phụ thuộc VietQR CDN.

================================================
7. OWNER UI RULE
================================================

Không dùng Kanban mobile.

Dùng tabs.

Order block luôn nằm trên.

================================================
8. CUSTOMER UI RULE
================================================

Mobile first.

Desktop 2 column.

LEFT menu
RIGHT cart sticky.

================================================
9. OUTPUT RULE
================================================

Nếu user yêu cầu:

"dán đè full"

trả full file code.

Không trả diff.

================================================
10. DEBUG CHECKLIST
================================================

QR không hiện

check transferQrUrl

DONE không chạy

check types
check server
check owner UI
check customer UI