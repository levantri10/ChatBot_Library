export function normalize(text) {
 return text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
}
export function bookText(b) {
 return `${b.title}. Tác giả: ${b.author}. Thể loại: ${b.category}. Vị trí: ${b.location}. Nội dung: ${b.summary}. Tổng: ${b.total} cuốn; còn: ${b.available} cuốn; đang mượn: ${b.total-b.available} cuốn. Cập nhật: ${b.updated_at}.`;
}
export function lexicalScore(query,text) {
 const stop = new Set(['co','khong','la','va','cua','cho','toi','minh','ban','thu','vien','sach','the','nao','bao','nhieu','ve','gi','con','muon','cuon']);
 const terms = [...new Set(normalize(query).match(/[a-z0-9]+/g)||[])].filter(t=>!stop.has(t));
 const normalized=normalize(text);
 return terms.reduce((n,t)=>n+(normalized.includes(t)?1:0),0)/Math.max(terms.length,1);
}
export function validateBook(b) {
 for(const k of ['title','author','category','location','summary']) {
  if(typeof b[k] !== 'string' || b[k].length>(k==='summary'?6000:200)) throw new Error('Thông tin sách không hợp lệ.');
 }
 if(!b.title.trim() || !Number.isInteger(b.total)||!Number.isInteger(b.available)||b.total<0||b.total>100000||b.available<0||b.available>b.total) throw new Error('Số sách còn phải từ 0 đến tổng số sách.');
 return Object.fromEntries(['title','author','category','location','summary','total','available'].map(k=>[k,typeof b[k]==='string'?b[k].trim():b[k]]));
}
