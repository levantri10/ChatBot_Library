# Triển khai Thư Viện AI

## 1. Chuẩn bị Supabase

1. Tạo project Supabase của bạn, mở **SQL Editor**.
2. Chạy toàn bộ [schema.sql](../supabase/schema.sql). Schema tạo bảng, extension `vector`/`unaccent`, RPC, RLS và dữ liệu mẫu ban đầu; chỉ seed khi bảng tương ứng trống.
3. Lấy URL project và khóa server service role để cấu hình backend. Không dùng các giá trị của demo công khai.
4. Điền `.env`, sau đó chạy `npm run demo:import` để bổ sung ba sách công cộng và `npm run index` nếu muốn lập lại chỉ mục.

RLS được bật và không có policy truy cập công khai trực tiếp. API server dùng service role. RPC truy xuất vector và rate limit chỉ được cấp cho service role.

## 2. Cấu hình Vercel

Import repository của bạn vào Vercel. Chọn Vite, build `npm run build`, output `dist`. Thư mục `api/` tạo các Node.js Functions cùng domain. [vercel.json](../vercel.json) đặt thời gian tối đa 60 giây cho function.

Trong **Settings → Environment Variables**, thêm cho môi trường Production:

| Biến | Ví dụ/giá trị |
| --- | --- |
| `SUPABASE_URL` | `https://YOUR_PROJECT.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Khóa server Supabase, lưu dạng bí mật |
| `CHAT_PROVIDER` | `shopaipro` |
| `SHOPAI_BASE_URL` | `https://shopaipro.tech/v1` |
| `LIBRARY_SHOPAI_API_KEY` | Key SHOP AI PRO của bạn, lưu dạng bí mật |
| `SHOPAI_MODEL` | `nemotron-super` |
| `EMBEDDING_PROVIDER` | `none` |
| `ADMIN_PASSWORD` | Mật khẩu dài, ngẫu nhiên, lưu dạng bí mật |
| `RATE_LIMIT_SALT` | Chuỗi dài, ngẫu nhiên, lưu dạng bí mật |

Không dùng tiền tố `VITE_` cho bí mật. Thay đổi biến môi trường cần redeploy. `.vercelignore` loại `.env*`, `.vercel`, `.git`, log và các thư mục build local khỏi gói upload.

## 3. Triển khai

Có thể dùng dashboard hoặc Vercel CLI:

```bash
npm install --global vercel
vercel login
vercel link
vercel --prod
```

Khi liên kết, chọn project của bạn. Không đưa token Vercel vào tài liệu hoặc lệnh được chia sẻ công khai.

## 4. Kiểm tra sau deploy

1. Mở trang, xác nhận danh mục tải được và có banner dữ liệu minh họa.
2. Hỏi tồn kho và giờ hành chính, mở nguồn để đối chiếu.
3. Hỏi tên sách chưa có, kiểm tra ứng dụng không tự bịa dữ liệu.
4. Kiểm tra đăng nhập quản trị sai bị từ chối.
5. Chạy smoke từ máy đã cấu hình `.env` với database và mật khẩu tương ứng deployment:

```powershell
$env:BASE_URL='https://TEN-DEMO-CUA-BAN.vercel.app'
$env:REQUIRE_AI='1'
npm run smoke
Remove-Item Env:BASE_URL
Remove-Item Env:REQUIRE_AI
```

Smoke cần dữ liệu mẫu Cơ sở dữ liệu còn 3 cuốn. Khi bộ dữ liệu thay đổi, cập nhật kỳ vọng trong `scripts/smoke.mjs`. Script kiểm tra API trên `BASE_URL`, đồng thời đọc số nguồn lập chỉ mục từ Supabase trong cấu hình local; không coi đây là kiểm tra mọi cấu hình của một deployment bất kỳ.

## Embedding vector tùy chọn

Mặc định `EMBEDDING_PROVIDER=none`: không gọi Gemini, truy xuất dùng từ khóa. Muốn bật vector:

1. Đặt `EMBEDDING_PROVIDER=gemini` và cung cấp `GEMINI_API_KEY` hoạt động ở local.
2. Chạy `npm run index`. Dòng `vector` xác nhận tạo được embedding thật; `lexical` nghĩa là chưa tạo được.
3. Cập nhật hai biến tương ứng trên Vercel rồi redeploy.
4. Xác minh `semantic` và chất lượng nguồn trong phản hồi chat.

Embedding dùng `gemini-embedding-001`, 768 chiều. Model chat nemotron-super không được dùng làm embedding. Quota phụ thuộc tài khoản nhà cung cấp.

## Chẩn đoán nhanh

| Hiện tượng | Kiểm tra |
| --- | --- |
| Danh mục trả `503` | URL/key Supabase, project có hoạt động không, schema/RPC đã được tạo chưa |
| Chat có nhãn Tra cứu dữ liệu | Key/model/base URL, quota, timeout hoặc câu trả lời bị cắt |
| Quản trị trả `401` | `ADMIN_PASSWORD` đúng môi trường, không có khoảng trắng ngoài ý muốn |
| Trả `429` | Chờ hết cửa sổ 10 phút; tránh chạy smoke liên tục |
| Sửa `.env` nhưng local vẫn dùng giá trị cũ | `.env.local` ưu tiên cao hơn; kiểm tra cả hai và khởi động lại |
| Production chưa có thay đổi | Redeploy sau khi cập nhật biến; xác nhận domain trỏ vào deployment mới |
| `semantic=false` | Bình thường với demo từ khóa; kiểm tra embedding chỉ khi đã chủ động bật vector |
