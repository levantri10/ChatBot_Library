# API Thư Viện AI

Local: `http://127.0.0.1:3000`. Demo: `https://chatbot-library-jet.vercel.app`.

JSON dùng UTF-8. Không đưa key nhà cung cấp AI hoặc Supabase service role vào request từ frontend.

## Danh mục

```http
GET /api/catalog
```

Trả `200` với `{ "books": [...], "documents": [...] }`.

| Đối tượng | Các trường chính |
| --- | --- |
| Book | `id`, `title`, `author`, `category`, `location`, `summary`, `total`, `available`, `updated_at` |
| Document | `id`, `title`, `kind`, `content`, `updated_at` |

`kind`: `hours`, `policy` hoặc `notice`. Đây là dữ liệu công khai của demo.

## Hỏi chatbot

```bash
curl -X POST https://chatbot-library-jet.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Sách Cơ sở dữ liệu còn bao nhiêu cuốn?"}'
```

`message` là chuỗi không rỗng, tối đa 1.000 ký tự. Ví dụ phản hồi, đã rút gọn nguồn:

```json
{
  "answer": "Còn 3 cuốn. [1]",
  "sources": [
    {
      "source_id": "uuid-cua-ban-ghi",
      "source_type": "book",
      "title": "Cơ sở dữ liệu",
      "content": "... Tổng: 10 cuốn; còn: 3 cuốn; đang mượn: 7 cuốn. ...",
      "score": 3.5
    }
  ],
  "mode": "shopaipro",
  "semantic": false
}
```

Nội dung câu trả lời và điểm xếp hạng có thể thay đổi. `source_type` là `book`, `hours`, `policy` hoặc `notice`.

| Trường | Ý nghĩa |
| --- | --- |
| `answer` | Câu trả lời tiếng Việt hoặc dữ liệu tra cứu trực tiếp khi AI lỗi |
| `sources` | Tối đa 5 nguồn; mảng rỗng nếu không có thông tin phù hợp |
| `mode` | `shopaipro`, `gemini` hoặc `retrieval` (không sinh câu trả lời bằng AI) |
| `semantic` | Có kết quả vector tham gia truy xuất hay không; demo hiện là `false` |

Mỗi câu hỏi độc lập, API không nhận lịch sử hội thoại. Giới hạn 15 câu hỏi/10 phút/IP, gồm cả câu hỏi không có kết quả.

## Quản trị

Thêm header cho mọi request quản trị:

```http
Authorization: Bearer <ADMIN_PASSWORD>
```

### Đọc dữ liệu

`GET /api/admin` trả cùng cấu trúc danh mục sau khi xác thực. Giới hạn 40 request/10 phút/IP, bao gồm lần đăng nhập sai.

### Thêm hoặc sửa sách

```http
POST /api/admin
Content-Type: application/json
Authorization: Bearer <ADMIN_PASSWORD>
```

```json
{
  "type": "book",
  "data": {
    "title": "Sách minh họa",
    "author": "Tác giả minh họa",
    "category": "Tham khảo",
    "location": "A1",
    "summary": "Dữ liệu mẫu để trình bày chức năng quản trị.",
    "total": 5,
    "available": 3
  }
}
```

Thêm trường `id` ở cấp ngoài cùng để cập nhật bản ghi; bỏ `id` để tạo mới. Các trường text phải là chuỗi; tên sách không rỗng. `title`, `author`, `category`, `location` tối đa 200 ký tự; `summary` tối đa 6.000 ký tự. Tồn kho là số nguyên: `0 <= available <= total <= 100000`.

### Thêm hoặc sửa tài liệu

```json
{
  "type": "document",
  "data": {
    "title": "Giờ làm việc (dữ liệu mẫu)",
    "kind": "hours",
    "content": "Dữ liệu mẫu: Thứ Hai đến Thứ Sáu, 08:00–17:00."
  }
}
```

`title` không rỗng, tối đa 200 ký tự; `content` không rỗng, tối đa 6.000 ký tự. `kind`: `hours`, `policy` hoặc `notice`. Cập nhật cũng dùng `id` ngoài cùng.

Thành công trả `200` với `{ "saved": {...}, "indexed": false }`. `indexed=true` nghĩa là tạo được embedding trong lần lưu; `false` không đồng nghĩa lưu dữ liệu thất bại. Tra cứu từ khóa đọc dữ liệu mới trực tiếp.

## Lỗi và phương thức

| HTTP | Tình huống |
| --- | --- |
| `400` | Câu hỏi hoặc dữ liệu nhập không hợp lệ |
| `401` | Thiếu hoặc sai mật khẩu quản trị |
| `404` | Không tìm thấy bản ghi cần cập nhật |
| `405` | Phương thức không được hỗ trợ; xem header `Allow` |
| `429` | Vượt giới hạn request |
| `503` | Không truy xuất/lưu được dữ liệu backend |

Lỗi ứng dụng dùng `{ "error": "Thông báo tiếng Việt" }`. Lỗi nhà cung cấp AI thường được xử lý thành phản hồi `200`, `mode=retrieval`, kèm nguồn. Các endpoint đặt `Cache-Control: no-store`.
