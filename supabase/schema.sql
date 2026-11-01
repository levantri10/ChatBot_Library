create extension if not exists vector with schema public;
create extension if not exists unaccent with schema public;

create table if not exists public.library_books (
 id uuid primary key default gen_random_uuid(), title text not null check(length(title) between 1 and 200),
 author text not null default '', category text not null default '', location text not null default '',
 summary text not null default '', total integer not null default 0 check(total >= 0),
 available integer not null default 0 check(available >= 0 and available <= total), updated_at timestamptz not null default now()
);
create table if not exists public.library_documents (
 id uuid primary key default gen_random_uuid(), title text not null, content text not null,
 kind text not null default 'policy' check(kind in ('hours','policy','notice')), updated_at timestamptz not null default now()
);
create table if not exists public.library_chunks (
 id uuid primary key default gen_random_uuid(), source_id uuid not null, source_type text not null,
 title text not null, content text not null, embedding vector(768), updated_at timestamptz not null default now(),
 unique(source_id,source_type)
);
create table if not exists public.library_rate_limits (
 key text primary key, hits integer not null default 1, expires_at timestamptz not null
);
alter table public.library_books enable row level security;
alter table public.library_documents enable row level security;
alter table public.library_chunks enable row level security;
alter table public.library_rate_limits enable row level security;

create or replace function public.library_match(query_embedding vector(768), limit_count integer default 5)
returns table(source_id uuid, source_type text, title text, content text, similarity float)
language sql stable set search_path = public as $$
 select source_id, source_type, title, content, 1-(embedding <=> query_embedding) similarity
 from library_chunks where embedding is not null and 1-(embedding <=> query_embedding) > 0.35
 order by embedding <=> query_embedding limit least(limit_count,8);
$$;
create or replace function public.library_allow_request(bucket text, max_hits integer, window_seconds integer)
returns boolean language plpgsql set search_path = public as $$
declare n integer;
begin
 delete from library_rate_limits where expires_at < now();
 insert into library_rate_limits(key,hits,expires_at) values(bucket,1,now()+make_interval(secs=>window_seconds))
 on conflict(key) do update set hits=library_rate_limits.hits+1 returning hits into n;
 return n <= max_hits;
end; $$;
revoke all on function public.library_match(vector,integer) from public,anon,authenticated;
revoke all on function public.library_allow_request(text,integer,integer) from public,anon,authenticated;
grant execute on function public.library_match(vector,integer) to service_role;
grant execute on function public.library_allow_request(text,integer,integer) to service_role;

-- Sample records only. Replace these with actual library data before real use.
insert into library_books(title,author,category,location,summary,total,available)
select v.* from (values
 ('Nhập môn Trí tuệ nhân tạo','Nhóm biên soạn thư viện','Công nghệ','A1 · Tầng 2','Dữ liệu mẫu: giới thiệu tìm kiếm, biểu diễn tri thức, học máy và các ứng dụng trí tuệ nhân tạo.',12,7),
 ('Cơ sở dữ liệu','Nhóm biên soạn thư viện','Công nghệ','A2 · Tầng 2','Dữ liệu mẫu: mô hình quan hệ, SQL, chuẩn hóa dữ liệu, giao dịch và thiết kế cơ sở dữ liệu.',10,3),
 ('Lập trình Python căn bản','Nhóm biên soạn thư viện','Lập trình','A3 · Tầng 2','Dữ liệu mẫu: biến, cấu trúc điều khiển, hàm, xử lý tập tin và lập trình hướng đối tượng trong Python.',8,0),
 ('Cấu trúc dữ liệu và giải thuật','Nhóm biên soạn thư viện','Lập trình','A3 · Tầng 2','Dữ liệu mẫu: danh sách, ngăn xếp, hàng đợi, cây, đồ thị, tìm kiếm và sắp xếp.',15,9),
 ('Kỹ năng học tập đại học','Nhóm biên soạn thư viện','Kỹ năng','B1 · Tầng 1','Dữ liệu mẫu: quản lý thời gian, ghi chép, tự học và làm việc nhóm.',6,4),
 ('Mạng máy tính','Nhóm biên soạn thư viện','Công nghệ','A4 · Tầng 2','Dữ liệu mẫu: mô hình OSI, TCP/IP, địa chỉ IP, định tuyến và bảo mật mạng cơ bản.',9,5)
) v(title,author,category,location,summary,total,available)
where not exists(select 1 from library_books);
insert into library_documents(title,kind,content)
select v.* from (values
 ('Giờ hành chính thư viện (dữ liệu mẫu)','hours','DỮ LIỆU MẪU, chưa phải lịch chính thức. Thứ Hai đến Thứ Sáu: 07:30–11:30 và 13:00–17:00. Thứ Bảy, Chủ Nhật và ngày lễ: đóng cửa. Múi giờ: Asia/Ho_Chi_Minh. Liên hệ thủ thư để xác nhận lịch thực tế.'),
 ('Quy định mượn sách (dữ liệu mẫu)','policy','DỮ LIỆU MẪU: sinh viên mang thẻ sinh viên khi mượn sách, tối đa 3 cuốn trong 14 ngày. Có thể gia hạn một lần nếu chưa có người đặt trước. Sách chỉ đọc tại chỗ cần hỏi thủ thư.'),
 ('Giới thiệu dữ liệu demo','notice','Ứng dụng đang sử dụng dữ liệu minh họa. Tên sách, số lượng, vị trí, nội dung và giờ làm việc phải được quản trị viên thay bằng dữ liệu thực tế của thư viện. Không có thông tin chính thức về UTH trong bộ dữ liệu này.')
) v(title,kind,content)
where not exists(select 1 from library_documents);
