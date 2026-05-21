# FinanceFlow — Hướng dẫn sử dụng

FinanceFlow giúp bạn theo dõi tiền trong các **ví**, khoản **phải thu**, thu **dự kiến**, ghi **thu/chi** hàng ngày và xem **tổng quan** trên một màn hình. Ứng dụng chạy trên trình duyệt; dữ liệu được lưu trên **máy bạn** (trình duyệt hiện tại), không cần đăng ký tài khoản riêng.

---

## Bắt đầu

1. Mở file **`index.html`** trong thư mục `finance-app` (nhấ đúp hoặc kéo vào Chrome, Edge, Firefox…).
2. Lần đầu mở cần **có internet** để tải biểu đồ; sau đó có thể dùng offline nếu trang đã mở sẵn.
3. Nên **xuất bản sao JSON** định kỳ (nút trên thanh công cụ) — nếu xóa dữ liệu trình duyệt hoặc đổi máy, bạn có thể **nhập lại** file đó.

> **Lưu ý:** Dữ liệu gắn với trình duyệt và máy bạn đang dùng. Đổi máy hoặc xóa cache trình duyệt có thể mất dữ liệu nếu chưa backup.

---

## Các màn hình chính

| Màn hình | Bạn làm được gì |
|----------|------------------|
| **Tổng quan** | Xem tổng tài sản, thu/chi tháng, biểu đồ, giao dịch gần đây, tiến độ ngân sách |
| **Tài sản** | Quản lý ví, phải thu, dự kiến; chuyển tiền giữa ví; chọn nhiều dòng để xem tổng |
| **Giao dịch** | Thêm, sửa, xóa thu/chi; lọc và xem thống kê theo ngày, tháng, ví, danh mục |
| **Danh mục** | Tạo nhóm thu, chi (và danh mục chuyển khoản hệ thống) |
| **Ngân sách** | Đặt hạn mức chi theo tháng và danh mục |
| **Đối soát** | Rà soát thu chi tháng, cho vay/thu hồi, nhật ký, bảng phải thu |
| **Định kỳ** | Ghi nhớ các khoản lặp lại (chưa tự tạo giao dịch) |

Góc trên: **Chế độ tối**, **Nhập JSON**, **Xuất JSON**, **Thêm giao dịch**.

---

## Tài sản

### Ba loại

- **Ví** — Tiền thật bạn đang giữ (ngân hàng, ví điện tử, tiền mặt…).
- **Phải thu** — Tiền người khác còn nợ bạn (cho vay, nợ cũ…).
- **Dự kiến** — Khoản bạn **kỳ vọng** sẽ nhận (lương tháng sau, tiền về dự kiến…), chưa nhất thiết đã vào ví.

**Tài sản ước tính** (trên Tổng quan) ≈ tổng số dư các ví + phần phải thu còn lại + phần dự kiến còn lại.

### Thêm và quản lý

1. **Thêm ví** — Đặt tên, số dư hiện tại, số dư ban đầu (lúc bắt đầu dùng app), ngày tạo.
2. **Thêm khoản phải thu / dự kiến** — Tên, số tiền, hạn hoặc ngày dự kiến (nếu có), ghi chú.
3. **Chuyển tiền** — Chọn ví gửi, ví nhận, số tiền (cần ít nhất 2 ví).

**Nhấn vào một dòng** (không nhấn nút) để mở **chi tiết**: lịch sử thu/nợ, giao dịch liên quan, chỉnh sửa.

### Chọn nhiều dòng để xem tổng

Tick ô chọn từng dòng (hoặc chọn tất cả đang hiển thị) → thẻ **Tổng đã chọn** hiện **một con số** = cộng giá trị các dòng đã chọn (có thể trộn ví + phải thu + dự kiến).

### Các nút trên bảng

| Nút | Ví | Phải thu | Dự kiến |
|-----|-----|----------|---------|
| **+** | — | Ghi nhận đã thu **hoặc** cho vay thêm | Ghi nhận đã nhận **hoặc** tăng khoản |
| **✎** | Sửa | Sửa | Sửa |
| **🗑** | Xóa (nếu có) | Xóa | Xóa |

---

## Giao dịch thu / chi

- Dùng **Thêm giao dịch** cho thu nhập hoặc chi tiêu thường.
- **Lọc** theo ngày, tháng, loại, danh mục, ví, từ khóa.
- Luôn thấy **Thu / Chi / Ròng** theo đúng bộ lọc đang chọn.
- Chọn **Tất cả ví** → thêm khối **Phân tích chi tiêu** (từng danh mục chi, % so với tổng chi).
- Chọn **một ví** → thêm thông tin số dư ví, số dư ban đầu, tổng thu/chi của ví đó.

**Bộ lọc loại giao dịch:**

- **Thu·Chi (bỏ chuyển khoản)** — Chỉ thu/chi thật, không gồm chuyển tiền giữa ví.
- **Chuyển khoản** — Chỉ các lần chuyển giữa ví.

Một số giao dịch **tự tạo** khi bạn thao tác trên Phải thu / Dự kiến (xem mục dưới). Giao dịch **chuyển khoản** nên sửa bằng nút **Chuyển tiền** hoặc ✎ trên dòng chuyển khoản, không sửa như thu/chi thường.

---

## Phải thu & dự kiến (nút +)

### Phải thu

| Thao tác | Điều gì xảy ra |
|----------|----------------|
| **Cho vay thêm** | Nợ tăng; tiền **trừ** khỏi ví bạn chọn; tạo giao dịch **chi** (danh mục Cho vay). |
| **Ghi nhận đã thu** | Phần còn nợ giảm; tiền **cộng** vào ví; tạo giao dịch **thu** (Thu hồi nợ). |

### Dự kiến

| Thao tác | Điều gì xảy ra |
|----------|----------------|
| **Tăng khoản** | Chỉ tăng số dự kiến; **không** trừ ví. |
| **Ghi nhận đã nhận** | Phần còn lại giảm; tiền **cộng** vào ví; tạo giao dịch **thu** (Nhận khoản dự kiến). |

Trong **chi tiết** phải thu / dự kiến bạn xem được: tổng gốc, đã thu/nhận, còn lại, từng lần tăng nợ hoặc thu/nhận, và danh sách giao dịch liên quan.

---

## Chuyển tiền giữa ví

- Dùng nút **Chuyển tiền** trên màn Tài sản.
- Tiền chỉ **đổi chỗ** giữa hai ví — **không** tính là thu hay chi trong tổng quan, đối soát thu chi thường, hay biểu đồ chi tiêu.
- **Tổng tiền trên tất cả ví** không đổi sau khi chuyển.
- Mỗi lần chuyển hiện **hai dòng** (tiền ra / tiền vào) trong danh sách giao dịch, danh mục **Chuyển tiền giữa ví**.

---

## Danh mục

- Tự tạo danh mục **thu** hoặc **chi**, kèm biểu tượng và màu.
- App có sẵn các danh mục quan trọng: Cho vay, Thu hồi nợ, Nhận khoản dự kiến, Chuyển tiền giữa ví — dùng khi thao tác từ Tài sản hoặc chuyển khoản.

---

## Ngân sách

- Đặt **hạn mức chi** theo **tháng** và **danh mục** (một lần hoặc lặp theo tháng).
- Chọn tháng, tìm kiếm, lọc theo trạng thái (đủ / gần hết / vượt…).
- **Nhấn một dòng ngân sách** để xem chi tiết và các giao dịch chi liên quan trong tháng.
- Trên **Tổng quan** có danh sách ngân sách tháng hiện tại.

---

## Đối soát

Chọn **tháng** cần rà soát:

- Tổng **thu chi thường** (không gồm chuyển khoản).
- Phần **cho vay** và **thu hồi nợ** trong tháng.
- Tổng hợp tài sản liên quan.
- **Nhật ký** giao dịch trong tháng.
- **Bảng đối chiếu** từng khoản phải thu.

Phù hợp khi cuối tháng bạn muốn đối lại sổ với số trên app.

---

## Khoản định kỳ

- Ghi nhớ tên, chu kỳ (hàng tháng / hàng năm), loại thu/chi, danh mục và ví mặc định.
- **Số tiền cố định** (Netflix, tiền nhà) hoặc **số tiền thay đổi theo kỳ** (điện, nước — nhập tiền thật khi thanh toán).
- Chọn **tháng** trên màn Định kỳ để xem kỳ đó **đã thanh toán chưa**; lọc **Chưa thanh toán** / **Đã thanh toán**.
- Hàng năm: trạng thái tính theo **năm** (ví dụ chọn tháng 5/2026 = xem đã trả trong năm 2026 chưa).
- Nút **Thanh toán** → tạo giao dịch (chọn đúng **ngày** trong kỳ đang xem). Đã trả rồi vẫn có **Ghi thêm** nếu cần ghi lần nữa.
- Dòng tóm tắt: *“Kỳ Tháng 5/2026: 3/5 đã thanh toán”*.

---

## Tổng quan & biểu đồ

| Biểu đồ | Ý nghĩa |
|---------|---------|
| **Chi tiêu theo danh mục** | Chi trong **tháng hiện tại**, không gồm chuyển khoản |
| **Dòng tiền theo tháng** | Tổng thu và tổng chi từng tháng |
| **Số dư theo thời gian** | Xu hướng số dư (từ số dư ban đầu các ví + thu/chi); **không** tính chuyển khoản |

Các chỉ số **Thu / Chi / Ròng** trên dashboard cũng **bỏ qua** chuyển khoản — chỉ phản ánh tiền thật vào/ra khỏi “ví tổng” của bạn.

---

## Sao lưu & khôi phục (JSON)

Trên thanh công cụ:

| Nút | Tác dụng |
|-----|----------|
| **Xuất JSON** | Tải file `financeflow-backup-YYYY-MM-DD.json` — chứa toàn bộ ví, giao dịch, phải thu, dự kiến, danh mục, ngân sách, định kỳ |
| **Nhập JSON** | Chọn file backup → app **hỏi xác nhận** và hiện tóm tắt (bao nhiêu ví, giao dịch…) → **thay thế** dữ liệu hiện tại trên máy |

**Nên backup khi nào**

- Cuối mỗi tuần hoặc tháng.
- Trước khi xóa cache trình duyệt, cài lại Windows, hoặc chuyển sang máy khác.
- Sau khi nhập nhiều giao dịch quan trọng.

**Nhập file cũ:** App vẫn đọc được bản backup trước đây; thiếu mục nào sẽ được bổ sung mặc định. Nếu file có lỗi nhóm chuyển khoản (thiếu đủ dòng ra/vào), app **cảnh báo** trước khi nhập — số dư ví có thể lệch nếu bạn vẫn tiếp tục.

> **Đồng bộ Google Drive:** Tính năng tự lưu / khôi phục lên cloud cá nhân đang được thiết kế riêng (tài liệu kỹ thuật cho nhà phát triển nằm ở thư mục gốc dự án). Phiên bản hiện tại dùng **xuất / nhập file JSON** thủ công.

---

## Mẹo sử dụng

1. **Tạo ví trước**, sau đó mới chuyển tiền hoặc gắn giao dịch vào ví.
2. Phân biệt rõ **phải thu** (đã cho vay) và **dự kiến** (chưa chắc đã vào tài khoản).
3. Dùng **Đối soát** cuối tháng thay vì chỉ nhìn Tổng quan.
4. **Xuất JSON** thường xuyên — đây là cách an toàn nhất để giữ dữ liệu khi dùng app trên trình duyệt.
5. Chuyển khoản giữa ví **không phải chi tiêu** — đừng ghi nhầm thành chi danh mục thường.

---

## Câu hỏi thường gặp

**Dữ liệu có trên điện thoại và máy tính cùng lúc không?**  
Không tự đồng bộ. Mỗi trình duyệt / máy là một bản riêng. Dùng **Xuất** trên máy này, **Nhập** trên máy kia.

**Xóa giao dịch chuyển khoản thế nào?**  
Xóa một dòng chuyển khoản (app sẽ xử lý cả cặp ra/vào theo quy tắc nội bộ), hoặc sửa lại từ **Chuyển tiền**.

**Tại sao tổng thu/chi khác với số tôi tự cộng tay?**  
Có thể bạn đang cộng cả **chuyển khoản** — hãy lọc **Thu·Chi (bỏ chuyển khoản)**.

**Mất hết dữ liệu sau khi dọn trình duyệt?**  
Khôi phục bằng file **Nhập JSON** nếu bạn đã xuất backup trước đó.

**Cần internet không?**  
Lần đầu mở cần internet (biểu đồ). Ghi giao dịch, xem số liệu thì dùng offline được sau khi đã mở trang.

---

## Giao diện

- **Chế độ sáng / tối** — nút góc trên.
- Giao diện **tự co giãn** trên máy tính, tablet và điện thoại.

---

*Nếu bạn là nhà phát triển cần tích hợp cloud hoặc chi tiết kỹ thuật, xem `CLOUD_SYNC_INTEGRATION.md` ở thư mục gốc dự án (ngoài thư mục `finance-app`).*
