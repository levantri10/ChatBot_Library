# Kịch bản trình bày đồ án Thư Viện AI

## Mục tiêu

Xây dựng trợ lý tiếng Việt cho dữ liệu riêng của thư viện: sách, số lượng còn lại, vị trí, nội dung cơ bản và giờ làm việc. AI chỉ nhận các nguồn được truy xuất; kết quả có trích dẫn để người dùng đối chiếu.

## Trình bày trong 5–7 phút

1. Mở demo, chỉ rõ banner dữ liệu minh họa. Giới thiệu frontend Vite, API Vercel, Supabase PostgreSQL và model nemotron-super.
2. Hỏi **Sách Cơ sở dữ liệu còn bao nhiêu cuốn?** Kỳ vọng còn 3/10 cuốn, vị trí A2. Mở nguồn [1] để đối chiếu số liệu.
3. Hỏi **Giờ hành chính thư viện là khi nào?** Kỳ vọng lịch mẫu thứ Hai–thứ Sáu, nhắc chưa phải lịch chính thức.
4. Hỏi **Quy định mượn sách như thế nào?** Kỳ vọng quy định mẫu tối đa 3 cuốn trong 14 ngày; ứng dụng chỉ tư vấn, không thực hiện giao dịch mượn.
5. Hỏi **Thư viện có sách Harry Potter không?** Kỳ vọng không tự bịa tồn kho, báo chưa có thông tin.
6. Mở danh mục, tìm **sherlock**. Giới thiệu mô tả tự biên soạn, tồn kho giả lập và liên kết văn bản tiếng Anh trên Project Gutenberg.
7. Mở quản trị bằng mật khẩu trong cấu hình server (không chiếu file chứa key). Chọn một sách demo, sửa tồn kho hợp lệ; kiểm tra danh mục phản ánh giá trị mới. Sau trình bày khôi phục giá trị cũ nếu cần tiếp tục dùng smoke test.
8. Giới thiệu dự phòng khi nhà cung cấp AI lỗi: ứng dụng vẫn trả nguồn dữ liệu, có nhãn **Tra cứu dữ liệu**. Có thể minh họa local bằng cách tạm đặt key sai trong cấu hình local và khởi động lại; không sửa key Production chỉ để trình bày.

## Những điểm cần giải thích khi bảo vệ

- RAG là truy xuất dữ liệu rồi đưa ngữ cảnh vào model; không phải huấn luyện lại model.
- Demo hiện dùng truy xuất từ khóa chuẩn hóa tiếng Việt. Code hỗ trợ vector Gemini/pgvector nhưng chỉ hoạt động sau khi có key embedding hợp lệ và lập chỉ mục; không trình bày như một phần đã được nghiệm thu.
- Nội dung câu trả lời và tồn kho lấy từ dữ liệu hiện tại, không dựa vào trí nhớ của model. Câu hỏi độc lập, chưa có trí nhớ nhiều lượt.
- Key ở backend; bảng Supabase bật RLS; quản trị dùng Bearer password; IP được băm cho bộ đếm rate limit.
- Bộ dữ liệu nhỏ phù hợp phạm vi đồ án. Khi mở rộng cần tài khoản quản trị riêng, nhật ký thay đổi, đánh giá retrieval và công cụ nhập tài liệu có quyền sử dụng.

## Bàn giao

- `README.md`: cài đặt, biến môi trường, API và triển khai.
- `supabase/schema.sql`: bảng, RPC, RLS và dữ liệu mẫu ban đầu.
- `data/public-domain-books.json`: 3 sách công cộng, nguồn và tồn kho minh họa.
- `npm run dev`: chạy giao diện và API local ở cổng 3000.
- `npm test`, `npm run build`, `npm run smoke`: kiểm tra trước khi bàn giao/deploy.
- Người vận hành quản lý các key và mật khẩu trong `.env`/Vercel; không đưa file bí mật vào báo cáo hoặc Git.

## Mô tả ngắn cho CV

**Thư Viện AI — Chatbot tiếng Việt có truy xuất nguồn:** xây dựng giao diện Vite, API serverless Vercel và cơ sở dữ liệu Supabase; tích hợp nemotron-super qua Chat Completions, tra cứu sách/tồn kho và tài liệu nội bộ, quản trị dữ liệu có xác thực, rate limit và cơ chế dự phòng khi AI không khả dụng.
