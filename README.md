# FinanceFlow

FinanceFlow là ứng dụng web quản lý tài chính cá nhân chạy hoàn toàn trên trình duyệt. Dự án dùng `HTML`, `CSS`, `Vanilla JavaScript` và `LocalStorage`, không cần backend hay database riêng.

## Tính năng hiện có

- Dashboard tổng quan với KPI, biểu đồ thu/chi, số dư lũy kế và ngân sách tháng.
- Quản lý tài sản: **Ví**, **Phải thu**, **Dự kiến** — tick chọn nhiều nguồn để **cộng tổng** theo lựa chọn.
- **Chuyển tiền giữa ví** — không tính vào thu/chi, chỉ đổi số dư giữa các ví.
- Chi tiết tài sản: nhấn dòng → lịch sử, giao dịch liên quan, thao tác thu/tăng nợ.
- Giao dịch thu/chi/chuyển khoản; lọc theo ngày, tháng, loại, danh mục, ví, từ khóa.
- Thống kê thu/chi/ròng theo bộ lọc; **phân tích chi theo danh mục** khi chọn **Tất cả ví**.
- Đối soát theo tháng: thu chi thường, cho vay, thu hồi; nhật ký và bảng phải thu.
- Ngân sách theo tháng/danh mục; khoản định kỳ (ghi nhớ, chưa tự tạo giao dịch).
- Xuất / nhập JSON backup đầy đủ (`js/backup.js`), chuẩn hóa khi đọc file cũ.
- Giao diện sáng/tối; responsive desktop, tablet, mobile.

## Cách dùng nhanh

### 1. Mở ứng dụng

```text
finance-app/index.html
```

Chạy trực tiếp trên trình duyệt, dữ liệu lưu `LocalStorage`. Lần đầu cần internet để tải `Chart.js` (CDN).

### 2. Tài sản

1. **Thêm ví** — tên, số dư hiện tại, `initialBalance`, ngày tạo.
2. **Thêm khoản phải thu** / **Thêm khoản dự kiến** nếu cần.
3. **Chuyển tiền** — chọn ví gửi, ví nhận, số tiền (cần ≥ 2 ví).

```text
Tài sản ước tính = tổng số dư ví + phải thu còn lại + dự kiến còn lại
```

**Chọn nhiều nguồn:** tick checkbox từng dòng (hoặc chọn tất cả dòng đang hiện) → thẻ **Tổng đã chọn** hiện **một số** = cộng giá trị các dòng đã tick (không chia theo loại).

**Thao tác trên bảng:**

| Nút | Ví | Phải thu | Dự kiến |
|-----|-----|----------|---------|
| **+** | — | Ghi nhận đã thu **hoặc** cho vay thêm | Ghi nhận đã nhận **hoặc** tăng khoản |
| **✎** | Sửa | Sửa | Sửa |
| **🗑** | Xóa (nếu có) | Xóa | Xóa |

Nhấn **dòng** (không phải nút) → mở chi tiết.

### 3. Giao dịch

- **Thêm giao dịch** (thanh trên): thu nhập / chi tiêu thường.
- Lọc: ngày, tháng, loại, danh mục, ví, từ khóa.
- Luôn hiện **Thu / Chi / Ròng** theo bộ lọc hiện tại.
- Chọn **Tất cả ví** → thêm khối **Phân tích chi tiêu** (thẻ theo danh mục, % tổng chi).
- Chọn **một ví** → thêm số dư ví, số dư ban đầu, tổng thu/chi lịch sử ví đó.
- Loại **Chuyển khoản** / **Thu·Chi (bỏ chuyển khoản)** trong bộ lọc loại.

Giao dịch tự sinh từ Tài sản (thu nợ, cho vay) hoặc chuyển khoản: sửa/xóa theo quy tắc riêng (chuyển khoản sửa từ **Chuyển tiền** hoặc nút ✎ trên dòng transfer).

### 4. Phải thu & dự kiến (qua nút +)

**Phải thu — cho vay thêm:** tăng nợ, trừ ví, tạo giao dịch **chi tiêu** (danh mục Cho vay).

**Phải thu — ghi nhận đã thu:** giảm số còn lại, cộng ví, tạo giao dịch **thu nhập** (Thu hồi nợ).

**Dự kiến — tăng khoản:** chỉ tăng số dự kiến, không trừ ví.

**Dự kiến — ghi nhận đã nhận:** giảm số còn lại, cộng ví, tạo thu nhập (Nhận khoản dự kiến).

### 5. Chuyển tiền giữa ví

- Tạo **2 giao dịch** liên kết (`transferRole`: `out` / `in`), cùng `transferGroupId`.
- Danh mục: **Chuyển tiền giữa ví** (`type: transfer`).
- **Không** cộng vào tổng thu/chi Dashboard, đối soát “thu chi thường”, biểu đồ chi — chỉ đổi `balance` từng ví.
- Tổng số dư **tất cả ví** không đổi (chỉ chuyển nội bộ).

### 6. Danh mục, ngân sách, đối soát, định kỳ

- **Danh mục:** thu / chi / transfer; icon, màu. Có sẵn Cho vay, Thu hồi nợ, Nhận khoản dự kiến, Chuyển tiền giữa ví.
- **Ngân sách:** hạn mức theo tháng; nhấn dòng → chi tiết, giao dịch liên quan.
- **Đối soát:** thẻ thu chi thường, cho vay/thu hồi, tổng hợp tài sản; nhật ký tháng; bảng đối chiếu từng phải thu.
- **Định kỳ:** lưu khoản lặp (chưa auto-post).

### 7. Nhập / Xuất JSON

Thanh trên cùng:

- **Xuất JSON** → `financeflow-backup-YYYY-MM-DD.json`
- **Nhập JSON** → ghi đè LocalStorage (xác nhận + tóm tắt số lượng từng loại)

Nên backup định kỳ — dữ liệu chỉ trên trình duyệt hiện tại.

## Chi tiết tài sản (nhấn dòng)

### Ví

Số dư, `initialBalance`, ngày tạo, tổng thu/chi, bảng giao dịch, **Chỉnh sửa ví**.

### Phải thu / Dự kiến

Tổng gốc, đã thu/nhận, còn lại, lịch sử tăng nợ, lịch sử thu/nhận, giao dịch liên quan.  
Nút **Ghi nhận / Tăng nợ** (một nút) và **Chỉnh sửa**.

## Cấu trúc dữ liệu & backup JSON

### Ví

```json
{
  "id": "wallet_momo",
  "name": "MoMo",
  "balance": 533222,
  "initialBalance": 724222,
  "createdAt": "2026-05-19"
}
```

| Trường | Ý nghĩa |
|--------|---------|
| `balance` | Số dư hiện tại |
| `initialBalance` | Số dư lúc tạo ví (trước giao dịch trong app) |
| `createdAt` | Ngày tạo (`YYYY-MM-DD`) |

```text
balance ≈ initialBalance + tổng thu − tổng chi
```

(chỉ giao dịch `income` / `expense` trên ví đó; **không** tính `transfer`)

### Phải thu / dự kiến

```json
{
  "id": "recv_...",
  "name": "Anh Sanh",
  "amount": 1815000,
  "originalAmount": 1815000,
  "dueDate": "",
  "note": "",
  "settlements": [],
  "adjustments": []
}
```

- `settlements[]` — từng lần thu/nhận (`transactionId` nếu có).
- `adjustments[]` — từng lần tăng nợ (phải thu: có thể kèm giao dịch chi + trừ ví).

### Giao dịch

| Trường | Ghi chú |
|--------|---------|
| `type` | `income` \| `expense` \| `transfer` |
| `category`, `amount`, `wallet`, `note`, `date` | |
| `sourceType`, `sourceId`, `sourceEventId` | Giao dịch tự sinh từ Tài sản |
| `transferTo`, `transferGroupId`, `transferRole` | Chuyển khoản (`out` / `in`); mỗi lần chuyển = 2 dòng |

### Danh mục

`type`: `income` \| `expense` \| `transfer`

### File backup

```json
{
  "app": "FinanceFlow",
  "version": 1,
  "exportedAt": "2026-05-21T...",
  "data": {
    "categories": [],
    "wallets": [],
    "receivables": [],
    "expectedIncome": [],
    "transactions": [],
    "budgets": [],
    "recurring": []
  }
}
```

Logic trong `js/backup.js`.

**Export:** đủ schema; giữ `initialBalance`, trường chuyển khoản, `settlements`, `adjustments`.

**Import:**

1. Chuẩn hóa toàn bộ `data`.
2. Tự thêm danh mục hệ thống (Cho vay, Thu hồi nợ, Nhận khoản dự kiến, Chuyển tiền giữa ví) nếu thiếu.
3. Ghi **ví → phải thu → dự kiến → giao dịch → ngân sách → định kỳ**.
4. File cũ thiếu `initialBalance` → suy từ `balance` + thu/chi cùng ví.
5. Thiếu `adjustments` / `transfer*` → mặc định rỗng.
6. Cảnh báo nếu nhóm chuyển khoản không đủ 2 dòng (ra + vào).

## Biểu đồ (Dashboard)

| Biểu đồ | Mô tả |
|---------|--------|
| Chi tiêu theo danh mục | Tháng hiện tại, chỉ `expense` |
| Dòng tiền theo tháng | Thu / chi từng tháng |
| Số dư theo thời gian | Từ tổng `initialBalance` + thu/chi (`transfer` bỏ qua) |

## Các màn hình

| Màn hình | Chức năng |
|----------|-----------|
| **Tổng quan** | KPI, biểu đồ, giao dịch gần đây, ngân sách |
| **Tài sản** | Ví / phải thu / dự kiến, chọn tổng, chuyển tiền |
| **Giao dịch** | CRUD, lọc, thống kê, phân tích chi |
| **Danh mục** | Thu / chi / transfer |
| **Ngân sách** | Hạn mức tháng, chi tiết |
| **Đối soát** | Thu chi & cho vay theo tháng |
| **Định kỳ** | Khoản lặp lại |

## Công nghệ

- HTML5, CSS3, Vanilla JavaScript
- LocalStorage
- Chart.js (CDN)

## Cấu trúc thư mục

```text
finance-app/
├── index.html
├── README.md
├── css/
│   ├── style.css         # Layout, form, modal, badge, giao dịch
│   ├── dashboard.css     # Tài sản, đối soát, ngân sách
│   └── responsive.css    # Breakpoint mobile/tablet
└── js/
    ├── utils.js          # Tiền tệ, ngày, id
    ├── storage.js        # LocalStorage, chuẩn hóa, seed
    ├── transaction.js    # CRUD, lọc, tổng hợp (bỏ transfer trong thu/chi)
    ├── budget.js         # Ngân sách, định kỳ
    ├── chart.js          # Biểu đồ
    ├── dashboard.js      # KPI tổng quan
    ├── reconcile.js      # Đối soát tháng
    ├── backup.js         # Export / import JSON
    └── app.js            # UI chính, modal, chuyển khoản, tài sản
```

## LocalStorage

| Key | Nội dung |
|-----|----------|
| `finance_transactions` | Giao dịch (gồm transfer) |
| `finance_categories` | Danh mục |
| `finance_wallets` | Ví |
| `finance_receivables` | Phải thu |
| `finance_expected_income` | Dự kiến |
| `finance_budgets` | Ngân sách |
| `finance_recurring` | Định kỳ |
| `finance_theme` | `light` / `dark` |

## Kiến trúc mã (tóm tắt)

- **storage.js** — seed, migrate, `decorateWallet`, `normalizeTransaction`, danh mục hệ thống.
- **transaction.js** — lọc, `summarize` (chỉ income/expense), `isCashflow()`.
- **app.js** — render UI, `saveTransfer`, chọn tài sản, modal tài sản/ngân sách, import/export.
- **backup.js** — `buildSnapshot`, `normalizeImport`, kiểm tra cặp chuyển khoản.
- **reconcile.js** — thống kê tháng, nhật ký (có badge chuyển khoản).
- **chart.js** / **dashboard.js** — biểu đồ và KPI (không tính transfer vào thu/chi).

## Gợi ý cải tiến

- Cảnh báo khi chi vượt số dư ví.
- Import kiểu merge (không ghi đè toàn bộ).
- Định kỳ tự tạo giao dịch theo lịch.
- Đa tiền tệ.
