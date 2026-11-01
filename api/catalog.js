import {catalog,init} from '../lib/server.js';
export default async function handler(req,res) {
 if(!init(req,res,['GET'])) return;
 try {res.json(await catalog());} catch {res.status(503).json({error:'Chưa kết nối được cơ sở dữ liệu. Vui lòng thử lại.'});}
}
