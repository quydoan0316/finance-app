# FinanceFlow

FinanceFlow là ứng dụng web quản lý tài chính cá nhân chạy hoàn toàn trên trình duyệt. Dự án dùng `HTML`, `CSS`, `Vanilla JavaScript` và `LocalStorage`, không cần backend hay database riêng.

## Tính năng hiện có

- Dashboard tổng quan với KPI tài sản, thu nhập, chi tiêu, số dư hiện tại và ngân sách còn lại.
- Quản lý tài sản theo 3 nhóm: `Ví`, `Phải thu`, `Dự kiến`.
- **Chi tiết tài sản**: nhấn vào một dòng trong mục Tài sản để xem giao dịch phát sinh và thông tin liên quan.
- Quản lý giao dịch thu nhập và chi tiêu.
- Tự động đồng bộ số dư ví khi thêm, sửa hoặc xóa giao dịch.
- Ghi nhận thu tiền từng phần cho `Phải thu` và `Dự kiến`, đồng thời tự cộng vào đúng ví.
- Quản lý danh mục thu chi có icon và màu sắc.
- Quản lý ngân sách theo tháng và theo danh mục (xem chi tiết khi nhấn vào từng dòng).
- Quản lý các khoản định kỳ.
- Lọc giao dịch theo tháng, loại, danh mục, ví và từ khóa.
- Xuất / nhập JSON backup đầy đủ, có chuẩn hóa dữ liệu khi đọc file.
- Hỗ trợ giao diện sáng/tối.
- Responsive cho desktop, tablet và mobile.

## Cách dùng nhanh

### 1. Mở ứng dụng

Mở file:

```text
finance-app/index.html
```

Ứng dụng chạy trực tiếp trên trình duyệt và tự lưu dữ liệu vào `LocalStorage`. Lần đầu cần internet để tải `Chart.js` qua CDN.

### 2. Thiết lập tài sản ban đầu

Vào mục **Tài sản**.

1. Bấm **Thêm ví** — nhập tên, **số dư hiện tại**, **số dư ban đầu** (`initialBalance`) và **ngày tạo ví**.
2. Bấm **Thêm khoản phải thu** nếu có người còn nợ bạn.
3. Bấm **Thêm khoản dự kiến** nếu có thu nhập sắp nhận.

Mục Tài sản tự tính:

```text
Tài sản ước tính = tổng số dư ví + phải thu còn lại + dự kiến còn lại
```

**Xem chi tiết:** nhấn vào **dòng** ví / phải thu / dự kiến (không phải nút ✎ hay 🗑). Nút **✎** để sửa, **+** (phải thu / dự kiến) để ghi nhận đã thu.

### 3. Ghi nhận giao dịch

Bấm **Thêm giao dịch** trên thanh trên cùng.

- **Thu nhập**: cộng vào ví được chọn.
- **Chi tiêu**: trừ khỏi ví được chọn.

Khi sửa hoặc xóa giao dịch, app hoàn tác ảnh hưởng cũ rồi áp dụng lại để số dư ví không bị lệch.

### 4. Ghi nhận tiền từ phải thu / dự kiến

Trong **Tài sản**, dùng nút **+** trên dòng phải thu hoặc dự kiến (hoặc từ màn chi tiết).

- Số còn lại của khoản giảm.
- Ví nhận tiền tăng số dư.
- Một giao dịch thu nhập tự sinh được tạo.

**Không** sửa/xóa giao dịch tự sinh trong mục **Giao dịch** — quản lý từ **Tài sản** để giữ đồng bộ.

### 5. Danh mục, ngân sách, định kỳ

- **Danh mục**: thêm / sửa danh mục thu chi, icon, màu.
- **Ngân sách**: đặt hạn mức theo danh mục; nhấn dòng để xem chi tiết theo tháng, theo ví và giao dịch liên quan.
- **Định kỳ**: lưu các khoản lặp lại (chưa tự tạo giao dịch).

### 6. Nhập / Xuất JSON

Trên thanh trên cùng:

- **Xuất JSON** → file `financeflow-backup-YYYY-MM-DD.json`
- **Nhập JSON** → ghi đè dữ liệu trên trình duyệt hiện tại (có xác nhận và xem trước số ví / giao dịch)

Nên xuất JSON định kỳ vì dữ liệu chỉ nằm trên trình duyệt.

## Chi tiết tài sản (nhấn vào dòng)

### Ví

- Số dư hiện tại, số dư ban đầu, ngày tạo.
- Tổng thu, tổng chi, số giao dịch.
- Bảng **giao dịch phát sinh** (mọi giao dịch gắn với tên ví đó).
- Nút **Chỉnh sửa ví**.

### Phải thu / Dự kiến

- Tổng gốc, đã thu/nhận, còn lại, hạn / ngày dự kiến, ghi chú.
- **Lịch sử đã thu/nhận** (từng lần ghi nhận).
- **Giao dịch liên quan** (giao dịch thu tự sinh).
- Nút **Ghi nhận đã thu/nhận** và **Chỉnh sửa**.

## Cấu trúc ví và backup JSON

Mỗi ví trong file backup / LocalStorage:

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
| `balance` | Số dư hiện tại (sau mọi giao dịch) |
| `initialBalance` | Số dư lúc tạo ví, **trước** các giao dịch trong app |
| `createdAt` | Ngày tạo ví (`YYYY-MM-DD`) |

Quan hệ (khi dữ liệu khớp):

```text
balance ≈ initialBalance + tổng thu − tổng chi
```

(cùng một ví, chỉ tính giao dịch gắn `wallet` = tên ví đó)

### File backup đầy đủ

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

**Export:** luôn ghi đủ trường ví (kể cả `initialBalance`, `createdAt`).

**Import:**

1. Chuẩn hóa dữ liệu trong bộ nhớ.
2. Ghi **ví trước**, **giao dịch sau** (đúng thứ tự nghiệp vụ: có ví rồi mới phát sinh giao dịch).
3. Nếu file cũ thiếu `initialBalance`, app tự tính từ `balance` và lịch sử giao dịch.

## Biểu đồ trên Dashboard

### Chi tiêu theo danh mục

Tổng **chi tiêu** trong **tháng hiện tại**, nhóm theo danh mục.

### Dòng tiền theo tháng

Tổng **thu** và **chi** từng tháng (cột xanh / đỏ).

### Số dư theo thời gian

- Điểm xuất phát: **tổng `initialBalance` của tất cả ví** (gộp một đường).
- Mỗi giao dịch (mọi ví, theo ngày): thu `+`, chi `−`.
- Đường phụ: **chi tiêu lũy kế** (chỉ cộng dồn chi).

Điểm cuối trên biểu đồ thường khớp **Số dư hiện tại** trên Dashboard (= tổng `balance` các ví) nếu dữ liệu nhất quán.

## Các màn hình chính

| Màn hình | Chức năng chính |
|----------|-----------------|
| **Tổng quan** | KPI, 3 biểu đồ, giao dịch gần đây, ngân sách tháng |
| **Tài sản** | Ví, phải thu, dự kiến; nhấn dòng → chi tiết |
| **Giao dịch** | CRUD, lọc, tìm kiếm |
| **Danh mục** | Thu/chi, icon, màu |
| **Ngân sách** | Hạn mức theo tháng; nhấn dòng → chi tiết |
| **Định kỳ** | Khoản lặp lại hàng tháng / năm |

## Công nghệ

- `HTML5`, `CSS3`, `Vanilla JavaScript`
- `LocalStorage`
- `Chart.js` (CDN)

## Cấu trúc thư mục

```text
finance-app/
├── index.html
├── README.md
├── css/
│   ├── style.css
│   ├── dashboard.css
│   └── responsive.css
└── js/
    ├── app.js          # UI, modal, tài sản, import/export
    ├── storage.js      # LocalStorage, chuẩn hóa ví/danh mục
    ├── transaction.js  # CRUD giao dịch
    ├── dashboard.js    # KPI, danh sách tổng quan
    ├── budget.js       # Ngân sách, định kỳ
    ├── chart.js        # Biểu đồ Chart.js
    └── utils.js        # Format tiền, ngày, id
```

## LocalStorage

| Key | Nội dung |
|-----|----------|
| `finance_transactions` | Giao dịch |
| `finance_categories` | Danh mục |
| `finance_wallets` | Ví |
| `finance_receivables` | Phải thu |
| `finance_expected_income` | Dự kiến |
| `finance_budgets` | Ngân sách |
| `finance_recurring` | Định kỳ |
| `finance_theme` | Sáng / tối |

Dữ liệu chỉ trên trình duyệt và thiết bị hiện tại. Xóa cache hoặc đổi trình duyệt sẽ mất dữ liệu nếu chưa backup JSON.

## Kiến trúc mã (tóm tắt)

- **`storage.js`**: đọc/ghi, seed, migrate nhãn tiếng Việt, `decorateWallet`, `decorateCategory`, `normalizeTransaction`.
- **`app.js`**: render màn hình, modal chi tiết (tài sản, ngân sách), đồng bộ ví theo giao dịch, ghi nhận thu phải thu/dự kiến, import/export.
- **`transaction.js`**: CRUD, lọc; metadata `sourceType` / `sourceId` cho giao dịch tự sinh.
- **`budget.js`**: ngân sách, override theo tháng, định kỳ.
- **`chart.js`**: biểu đồ danh mục, thu/chi tháng, số dư lũy kế.
- **`dashboard.js`**: KPI và khối tổng quan.

## Gợi ý cải tiến

- Chuyển tiền giữa hai ví.
- Cảnh báo chi vượt số dư ví.
- Import JSON có xem trước chi tiết / chế độ merge.
- Giao dịch định kỳ tự tạo từ mục Định kỳ.
