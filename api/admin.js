import {admin,allow,catalog,db,indexSource,init} from '../lib/server.js';
import {validateBook} from '../lib/core.js';
export default async function handler(req,res) {
 if(!init(req,res,['GET','POST'])) return;
 try {
  if(!await allow(req,'admin',40,600)) return res.status(429).json({error:'Quá nhiều yêu cầu. Vui lòng thử lại sau.'});
  if(!admin(req)) return res.status(401).json({error:'Mật khẩu quản trị không đúng.'});
  if(req.method==='GET') return res.json(await catalog());
  const {type,id,data}=req.body||{};
  if(!['book','document'].includes(type)) return res.status(400).json({error:'Loại dữ liệu không hợp lệ.'});
  if(id&&!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)) return res.status(400).json({error:'ID không hợp lệ.'});
  let values;
  try {
   if(type==='book') values=validateBook(data||{});
   else {
    if(typeof data?.title!=='string'||!data.title.trim()||data.title.length>200||typeof data.content!=='string'||!data.content.trim()||data.content.length>6000||!['hours','policy','notice'].includes(data.kind)) throw new Error('Thông tin tài liệu không hợp lệ.');
    values={title:data.title.trim(),content:data.content.trim(),kind:data.kind};
   }
  } catch(e) {return res.status(400).json({error:e.message});}
  const table=type==='book'?'library_books':'library_documents';
  const rows=await db(`${table}${id?`?id=eq.${id}`:''}`,{method:id?'PATCH':'POST',body:JSON.stringify({...values,updated_at:new Date().toISOString()})});
  if(!rows.length) return res.status(404).json({error:'Không tìm thấy bản ghi.'});
  let indexed=false;
  try { indexed=await indexSource(rows[0],type); } catch { /* Data saved; reindex CLI can retry. */ }
  res.json({saved:rows[0],indexed});
 } catch {res.status(503).json({error:'Không lưu được dữ liệu. Vui lòng thử lại.'});}
}
