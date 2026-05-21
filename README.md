# FinanceFlow

FinanceFlow là ứng dụng web quản lý tài chính cá nhân chạy hoàn toàn trên trình duyệt. Dự án dùng `HTML`, `CSS`, `Vanilla JavaScript` và `LocalStorage`, không cần backend hay database riêng.

## Tính năng hiện có

- Dashboard tổng quan với KPI tài sản, thu nhập, chi tiêu, số dư hiện tại và ngân sách còn lại.
- Quản lý tài sản theo 3 nhóm:
  - `Ví`
  - `Phải thu`
  - `Dự kiến`
- Quản lý giao dịch thu nhập và chi tiêu.
- Tự động đồng bộ số dư ví khi thêm, sửa hoặc xóa giao dịch.
- Ghi nhận thu tiền từng phần cho `Phải thu` và `Dự kiến`, đồng thời tự cộng vào đúng ví.
- Quản lý danh mục thu chi có icon và màu sắc.
- Quản lý ngân sách theo tháng và theo danh mục.
- Quản lý các khoản định kỳ.
- Lọc giao dịch theo tháng, loại, danh mục và từ khóa.
- Xuất dữ liệu đầy đủ ra file JSON backup.
- Nhập nhanh dữ liệu từ file JSON backup của FinanceFlow.
- Hỗ trợ giao diện sáng/tối.
- Responsive cho desktop, tablet và mobile.

## Cách dùng nhanh

## 1. Mở ứng dụng

Mở file:

```text
finance-app/index.html
```

Ứng dụng chạy trực tiếp trên trình duyệt và tự lưu dữ liệu vào `LocalStorage`.

## 2. Thiết lập tài sản ban đầu

Vào mục `Tài sản`.

Bạn nên cập nhật trước các nguồn tiền:

1. Bấm `Thêm ví` để thêm ví hoặc tài khoản ngân hàng.
2. Nhập tên ví, ví dụ `VietinBank`, `MoMo`, `Tiền mặt`.
3. Nhập số dư hiện tại của ví.
4. Nếu có khoản người khác còn nợ bạn, bấm `Thêm khoản phải thu`.
5. Nếu có khoản thu nhập sắp nhận nhưng chưa chắc ngày, bấm `Thêm khoản dự kiến`.

Mục `Tài sản` sẽ tự tính:

```text
Tài sản ước tính = ví + phải thu còn lại + dự kiến còn lại
```

## 3. Ghi nhận giao dịch hằng ngày

Bấm `Thêm giao dịch`.

Với giao dịch thu nhập:

- chọn loại `Thu nhập`
- chọn danh mục thu nhập
- nhập số tiền
- chọn ví nhận tiền

Với giao dịch chi tiêu:

- chọn loại `Chi tiêu`
- chọn danh mục chi tiêu
- nhập số tiền
- chọn ví bị trừ tiền

Khi lưu giao dịch:

- thu nhập sẽ cộng vào ví
- chi tiêu sẽ trừ khỏi ví
- Dashboard và mục Tài sản sẽ cập nhật lại

## 4. Ghi nhận tiền đã thu từ khoản phải thu hoặc dự kiến

Trong mục `Tài sản`, các dòng `Phải thu` và `Dự kiến` có nút `+`.

Dùng nút này khi bạn nhận được một phần hoặc toàn bộ khoản tiền.

Khi ghi nhận:

- khoản còn lại sẽ giảm
- ví được chọn sẽ tăng số dư
- hệ thống tự tạo một giao dịch thu nhập tương ứng

Không nên sửa/xóa trực tiếp giao dịch tự sinh này trong mục `Giao dịch`; hãy quản lý từ mục `Tài sản` để dữ liệu không bị lệch.

## 5. Quản lý danh mục

Vào mục `Danh mục`.

Bạn có thể:

- thêm danh mục thu nhập
- thêm danh mục chi tiêu
- đổi icon
- đổi màu nhãn

Danh mục sẽ được dùng khi thêm giao dịch, tạo ngân sách và ghi nhận khoản đã thu.

## 6. Quản lý ngân sách

Vào mục `Ngân sách`.

Bạn có thể đặt hạn mức theo danh mục và chọn kiểu áp dụng:

- `Hàng tháng`: tự áp dụng cho các tháng sau.
- `Chỉ một tháng`: chỉ dùng cho tháng đã chọn.
- `Theo khoảng tháng`: áp dụng từ tháng bắt đầu đến tháng kết thúc.

Mục `Ngân sách` có bộ chọn tháng để xem tổng kết:

- tổng ngân sách
- tổng đã chi
- còn lại hoặc vượt
- trạng thái dư / vừa đủ / vượt ngân sách

Khi bấm vào một dòng ngân sách, app sẽ mở chi tiết:

- hạn mức
- đã chi
- còn lại hoặc vượt
- số tiền chi theo từng ví
- danh sách giao dịch liên quan đến ngân sách đó trong tháng đang xem

Nếu một ngân sách hằng tháng hoặc theo khoảng tháng chỉ thay đổi ở một tháng cụ thể, bấm vào ngân sách đó rồi chọn `Chỉnh riêng tháng này`. Hạn mức riêng chỉ áp dụng cho tháng đang xem, các tháng khác vẫn dùng hạn mức mặc định. Có thể dùng `Bỏ chỉnh riêng` để quay lại mức mặc định.

Dashboard sẽ hiển thị trạng thái ngân sách của tháng hiện tại.

## 7. Nhập / Xuất JSON

Ở thanh trên cùng:

- `Xuất JSON`: tải xuống một file backup đầy đủ.
- `Nhập JSON`: nạp lại file backup đã xuất trước đó.

File xuất ra có dạng:

```text
financeflow-backup-YYYY-MM-DD.json
```

Lưu ý:

- file JSON là cách backup/khôi phục chính của app
- khi nhập JSON, dữ liệu hiện tại trong trình duyệt sẽ bị ghi đè
- nên xuất JSON định kỳ nếu dữ liệu quan trọng

## Cách hoạt động của tài sản

### Ví

`Ví` là nguồn tiền khả dụng thực tế như:

- VietinBank
- MoMo
- Tiền mặt
- Ví tự tạo thêm từ giao diện

Mỗi ví có số dư riêng và được dùng khi ghi nhận giao dịch.

### Đồng bộ giao dịch và ví

Khi phát sinh giao dịch:

- `income` sẽ tự cộng tiền vào ví được chọn
- `expense` sẽ tự trừ tiền khỏi ví được chọn
- khi sửa giao dịch, hệ thống hoàn tác ảnh hưởng cũ rồi áp dụng lại ảnh hưởng mới
- khi xóa giao dịch, hệ thống hoàn tác lại số dư ví tương ứng

Điều này giúp mục `Tài sản` và danh sách `Giao dịch` không còn bị lệch nhau như trước.

### Phải thu

`Phải thu` dùng để theo dõi các khoản người khác còn nợ bạn hoặc khoản hoàn tiền đang chờ nhận.

Mỗi khoản phải thu có:

- tổng số tiền gốc
- số tiền còn lại chưa thu
- ngày hẹn trả
- ghi chú
- lịch sử các lần đã thu từng phần

Từ màn hình `Tài sản`, bạn có thể dùng nút `+` trên từng dòng để:

- ghi nhận đã thu bao nhiêu
- chọn tiền về ví nào
- chọn ngày nhận
- chọn danh mục thu nhập

Khi ghi nhận:

- số tiền còn lại của khoản phải thu sẽ giảm
- số dư ví được cộng đúng số tiền nhận
- một giao dịch `income` mới sẽ được tạo trong lịch sử giao dịch

### Dự kiến

`Dự kiến` hoạt động tương tự `Phải thu`, nhưng dành cho các khoản thu nhập tương lai chưa nhận được.

Bạn cũng có thể ghi nhận nhận tiền từng phần. Mỗi lần ghi nhận sẽ:

- giảm số tiền dự kiến còn lại
- cộng tiền vào ví đã chọn
- tạo một giao dịch thu nhập tương ứng

### Công thức tài sản

Dashboard hiển thị:

```text
Tài sản ước tính = Tổng số dư ví + Tổng phải thu còn lại + Tổng dự kiến còn lại
```

`Số dư hiện tại` trên Dashboard chỉ tính tổng tiền trong các ví.

## Các màn hình chính

### Tổng quan

- KPI tổng hợp
- biểu đồ chi tiêu theo danh mục
- biểu đồ thu/chi theo tháng
- biểu đồ số dư lũy kế theo giao dịch
- giao dịch gần đây
- tình trạng ngân sách

### Tài sản

- thêm ví
- thêm khoản phải thu
- thêm khoản dự kiến
- sửa và xóa từng nguồn tài sản
- ghi nhận thu từng phần cho `Phải thu` và `Dự kiến`

### Giao dịch

- thêm giao dịch mới
- sửa giao dịch thường
- xóa giao dịch thường
- lọc và tìm kiếm

Lưu ý:

- các giao dịch được tạo tự động từ `Phải thu` hoặc `Dự kiến` không nên sửa/xóa trực tiếp từ danh sách giao dịch
- các giao dịch đó nên được quản lý từ mục `Tài sản` để dữ liệu đồng bộ

### Danh mục

- thêm danh mục thu nhập
- thêm danh mục chi tiêu
- chỉnh sửa icon và màu

### Ngân sách

- tạo ngân sách theo danh mục
- áp dụng ngân sách một tháng, hằng tháng hoặc theo khoảng tháng
- xem tổng kết ngân sách theo tháng
- xem chi tiết từng ngân sách theo ví và giao dịch liên quan

### Định kỳ

- lưu các khoản chi lặp lại theo tháng hoặc năm

## Công nghệ sử dụng

- `HTML5`
- `CSS3`
- `Vanilla JavaScript`
- `LocalStorage`
- `Chart.js` qua CDN

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
    ├── app.js
    ├── storage.js
    ├── dashboard.js
    ├── transaction.js
    ├── budget.js
    ├── chart.js
    └── utils.js
```

## Cách chạy

Mở trực tiếp file:

```text
finance-app/index.html
```

Không có build step.

Lưu ý:

- biểu đồ dùng `Chart.js` qua CDN
- lần tải trang đầu tiên cần có internet để tải thư viện biểu đồ

## Dữ liệu lưu trữ

Dữ liệu được lưu trong `LocalStorage` của trình duyệt:

- `finance_transactions`
- `finance_categories`
- `finance_wallets`
- `finance_receivables`
- `finance_expected_income`
- `finance_budgets`
- `finance_recurring`
- `finance_theme`

Lưu ý:

- dữ liệu chỉ tồn tại trên trình duyệt và thiết bị hiện tại
- nếu xóa cache hoặc đổi trình duyệt, dữ liệu sẽ không tự đồng bộ

## Nhập / Xuất JSON

Nút `Xuất JSON` sẽ tải xuống một file backup đầy đủ:

```text
financeflow-backup-YYYY-MM-DD.json
```

Nút `Nhập JSON` dùng để nạp lại file JSON backup. Khi nhập, dữ liệu FinanceFlow trong trình duyệt hiện tại sẽ được ghi đè bằng dữ liệu trong file.

## Kiến trúc mã nguồn

### `js/storage.js`

- định nghĩa key LocalStorage
- seed dữ liệu mặc định
- đọc/ghi dữ liệu
- migrate một số nhãn cũ sang tiếng Việt

### `js/transaction.js`

- quản lý CRUD giao dịch
- hỗ trợ metadata cho giao dịch sinh ra từ `Phải thu` và `Dự kiến`
- lọc giao dịch theo điều kiện trên UI

### `js/app.js`

- điều phối toàn bộ UI
- render các màn hình chính
- xử lý modal và form
- đồng bộ số dư ví theo giao dịch
- quản lý logic ghi nhận thu từng phần cho `Phải thu` và `Dự kiến`

### `js/dashboard.js`

- tính KPI
- render giao dịch gần đây
- render tình trạng ngân sách

### `js/budget.js`

- quản lý ngân sách
- quản lý khoản định kỳ
- tính trạng thái chi tiêu theo tháng

### `js/chart.js`

- render biểu đồ danh mục
- render biểu đồ thu chi theo tháng
- render biểu đồ số dư lũy kế

### `js/utils.js`

- format tiền tệ
- tạo id
- format ngày/tháng
- escape HTML
- các hàm tiện ích chung

## Gợi ý cải tiến tiếp theo

- thêm xác thực số dư để tránh chi vượt quá số tiền trong ví
- thêm chuyển tiền giữa hai ví
- thêm lịch sử chi tiết cho từng lần thu của `Phải thu` và `Dự kiến`
- thêm cơ chế reset dữ liệu trực tiếp từ giao diện
