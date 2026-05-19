# FinanceFlow

FinanceFlow là ứng dụng web quản lý tài chính cá nhân chạy hoàn toàn ở phía trình duyệt. Ứng dụng dùng HTML, CSS, Vanilla JavaScript và LocalStorage, không cần backend, database hay tài khoản đăng nhập.

## Tính năng chính

- Tổng quan tài chính trên Dashboard.
- Theo dõi tài sản theo từng nguồn tiền.
- Quản lý giao dịch thu nhập và chi tiêu.
- Quản lý danh mục có icon và màu nhãn.
- Quản lý ngân sách theo tháng và danh mục.
- Quản lý các khoản thanh toán định kỳ.
- Lọc và tìm kiếm giao dịch.
- Xuất giao dịch ra CSV.
- Hỗ trợ giao diện sáng/tối.
- Responsive cho desktop, tablet và mobile.

## Tài sản

Mục **Tài sản** dùng để theo dõi tổng tiền từ nhiều nguồn khác nhau:

- **Ví**: tiền sẵn dùng trong VietinBank, MoMo, tiền mặt hoặc ví tự tạo.
- **Phải thu**: các khoản đã cho vay hoặc đang chờ thu lại.
- **Dự kiến**: các khoản thu nhập sẽ nhận trong tương lai nhưng chưa chắc thời gian.

Dashboard hiển thị **Tài sản ước tính** theo công thức:

```text
Tài sản ước tính = tiền trong ví + khoản phải thu + thu nhập dự kiến
```

KPI **Số dư hiện tại** trên Dashboard là tổng số dư của tất cả ví.

## Công nghệ sử dụng

- HTML5
- CSS3
- Vanilla JavaScript
- LocalStorage
- Chart.js qua CDN

## Cấu trúc thư mục

```text
finance-app/
├── index.html
├── README.md
├── multi-agent-expansion.md
├── css/
│   ├── style.css
│   ├── dashboard.css
│   └── responsive.css
├── js/
│   ├── app.js
│   ├── storage.js
│   ├── dashboard.js
│   ├── transaction.js
│   ├── budget.js
│   ├── chart.js
│   └── utils.js
└── assets/
    └── icons/
```

## Cách chạy

Mở trực tiếp file:

```text
finance-app/index.html
```

Ứng dụng không cần build step. Vì Chart.js đang được tải qua CDN, biểu đồ cần internet trong lần tải trang.

## Lưu trữ dữ liệu

Dữ liệu được lưu trong LocalStorage của trình duyệt:

- `finance_transactions`
- `finance_categories`
- `finance_wallets`
- `finance_receivables`
- `finance_expected_income`
- `finance_budgets`
- `finance_recurring`
- `finance_theme`

LocalStorage chỉ tồn tại trên trình duyệt và thiết bị hiện tại. Nếu xóa cache hoặc dùng trình duyệt khác, dữ liệu sẽ không tự đồng bộ.

## Ghi chú phát triển

- `storage.js` quản lý dữ liệu mặc định và đọc/ghi LocalStorage.
- `transaction.js` xử lý CRUD và lọc giao dịch.
- `budget.js` xử lý ngân sách và thanh toán định kỳ.
- `dashboard.js` render KPI, giao dịch gần đây và trạng thái ngân sách.
- `chart.js` render biểu đồ Chart.js.
- `app.js` điều phối UI, modal, form và các hành động người dùng.

## Hướng mở rộng

Xem thêm file `multi-agent-expansion.md` để tham khảo hướng mở rộng ứng dụng theo mô hình multi-agent, gồm phân tích chi tiêu, tư vấn ngân sách, phát hiện bất thường và tạo báo cáo tài chính cá nhân.
