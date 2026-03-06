# CONTINUITY_V4.md
PROJECT: Quan Cua Tui
TYPE: Mini ordering system (Owner + Customer)
STACK: Node.js + TypeScript + Vite SPA + Express + SQLite + PM2 + Ubuntu VPS
MODE: ESM + TSX runtime

================================================
0. MỤC ĐÍCH FILE
================================================

File này lưu toàn bộ trạng thái dự án để khi
chuyển cửa sổ làm việc AI vẫn hiểu đầy đủ:

- kiến trúc hệ thống
- quyết định sản phẩm
- schema DB
- UX đã chốt
- bug đã gặp
- roadmap tiếp theo

Đọc file này trước khi sửa code.

================================================
1. INFRA / DEPLOYMENT (KHÔNG ĐƯỢC PHÁ)
================================================

Server:
Ubuntu 22.04 VPS

Firewall:
UFW chỉ mở
22/tcp
3000/tcp

Process manager:
PM2

Start command:

pm2 start server.ts --name quan-cua-tui --interpreter npx --interpreter-args "tsx"

Restart:

pm2 restart quan-cua-tui
pm2 save

Runtime:
ESM + TSX

Không được:
- chuyển CommonJS
- bắt build tsc
- phá slug routing

DB:
SQLite app.db

Không bao giờ:
DROP TABLE
WIPE DB

Migration rule:
additive + idempotent

================================================
2. ROUTING HỆ THỐNG
================================================

Owner dashboard
/o/:slug

Setup
/o/:slug/setup

Customer
/c/:slug

================================================
3. MULTI SHOP ARCHITECTURE
================================================

Resolve shop theo thứ tự:

1 slug
2 query shopId
3 fallback shop_1

Backend luôn gắn shopId server side.

SSE realtime:

/api/events

client subscribe theo shopId

broadcast(type,payload,shopId)

================================================
4. DATABASE SCHEMA
================================================

shops
id
slug
name
closingTime
status
password
phone
bankInfo
logoUrl
bannerUrl
transferQrUrl

menu
id
shopId
name
price
isAvailable
imageUrl
stockQty (optional)
unit (optional)

orders
id
shopId
customerPhone
receiveTime
receiveLocation
note
status
totalPrice
createdAt
paymentMethod

order_items
orderId
shopId
menuItemId
quantity
price
name
note

================================================
5. ORDER STATUS
================================================

NEW
CONFIRMED
DONE
REJECTED

logic:

NEW
→ chờ xác nhận

CONFIRMED
→ quán đã nhận

DONE
→ hoàn thành

REJECTED
→ từ chối

inventory chỉ trừ khi:

NEW → CONFIRMED

================================================
6. PAYMENT
================================================

PaymentMethod

CASH
TRANSFER

TRANSFER hiển thị:

QR
bankInfo
nội dung CK

QR source:

transferQrUrl (ưu tiên)

fallback:
bankInfo text

Không phụ thuộc 100% VietQR CDN.

================================================
7. OWNER DASHBOARD UI (ĐÃ CHỐT)
================================================

Thứ tự block:

1 Đơn hàng vận hành
2 Trạng thái hôm nay
3 Tổng quan doanh thu
4 Chia sẻ cho khách
5 Menu hôm nay
6 Đơn đã từ chối

Đơn hàng vận hành:

tabs mobile first

NEW
CONFIRMED
DONE

Modal xem chi tiết đơn.

================================================
8. OWNER REVENUE
================================================

Revenue tách:

CASH
TRANSFER

Pie chart 2 phần.

Report ngày/tuần/tháng
đã chuyển hướng sang Setup.

================================================
9. CUSTOMER UI (REDESIGN)
================================================

Menu card gọn.

Note per item
toggle mở.

Qty input trực tiếp.

Mobile:

sticky mini cart
drawer checkout

Desktop:

2 column layout

LEFT
menu

RIGHT
cart + checkout sticky

================================================
10. FEATURE ĐÃ HOÀN THÀNH
================================================

Multi shop slug routing

SSE scoped

Branding logo banner

Payment method

Item note

Qty input

DONE status

Customer desktop 2 column

Owner tabs orders

================================================
11. BUG ĐÃ GẶP
================================================

VietQR CDN đôi khi không trả ảnh.

Fix:
dùng transferQrUrl.

Owner status không đổi được.

Nguyên nhân:
updateStore thiếu payload.

================================================
12. ROADMAP TIẾP
================================================

P0

verify:

Owner status change
DONE workflow
Customer desktop layout

P1

menu grouping
menu search

P2

copy bank info
copy transfer note

================================================
13. DEFINITION OF DONE
================================================

Owner

tabs orders hoạt động
status đổi được
revenue hiển thị

Customer

mobile đặt món mượt
desktop 2 column đẹp

Setup

logo banner save OK
transferQrUrl hoạt động