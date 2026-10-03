import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch();const ctx=await browser.newContext({viewport:{width:1440,height:1000}});const p=await ctx.newPage();p.setDefaultTimeout(10000);
try{const r=await fetch('http://localhost:3001/api/boards',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"title":"Extended Test"}'});const b=await r.json();await p.goto(`http://localhost:5173/?board=${b.id}`);await p.getByText('所有更改已保存').waitFor();
 const tool=label=>p.getByRole('button',{name:label,exact:true}).click();
 await tool('矩形 R');await p.locator('.canvas').click({position:{x:250,y:250}});await p.locator('.world .rect').waitFor();await tool('圆形 O');await p.locator('.canvas').click({position:{x:550,y:250}});await p.locator('.world .ellipse').waitFor();
 const a=await p.locator('.world .rect').boundingBox(),c=await p.locator('.world .ellipse').boundingBox();await tool('连线 A');await p.mouse.move(a.x+a.width/2,a.y+a.height/2);await p.mouse.down();await p.mouse.move(c.x+c.width/2,c.y+c.height/2);await p.mouse.up();await p.locator('.world .connector line').waitFor({state:'attached'});
 await tool('思维导图');await p.locator('.canvas').click({position:{x:250,y:500}});await p.locator('.world').getByText('中心主题',{exact:true}).waitFor();
 await tool('表格');await p.locator('.canvas').click({position:{x:900,y:500}});await p.locator('.world').getByText('协作表格',{exact:true}).waitFor();
 await p.locator('input[type=file]').first().setInputFiles({name:'test.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=','base64')});await p.locator('.world .image img').waitFor();
 await p.locator('.canvas').dispatchEvent('drop',{dataTransfer:await p.evaluateHandle(()=>{const dt=new DataTransfer();dt.setData('text/plain','https://example.com');return dt}),clientX:450,clientY:500});await p.locator('.world .link a').waitFor();
 await p.getByTitle('撤销',{exact:true}).click();await p.waitForFunction(()=>document.querySelectorAll('.world .link').length===0);await p.getByTitle('撤销',{exact:true}).click();await p.waitForFunction(()=>document.querySelectorAll('.world .image').length===0);await p.getByTitle('重做',{exact:true}).click();await p.locator('.world .image').waitFor();await p.getByTitle('重做',{exact:true}).click();await p.locator('.world .link').waitFor();
 await p.getByRole('button',{name:'导出',exact:true}).click();const wait=p.waitForEvent('download');await p.getByRole('button',{name:'备份白板 JSON 保留对象、附件与评论'}).click();const d=await wait;const backup=await d.path();await p.locator('input[accept=".json"]').setInputFiles(backup);await p.getByText('备份已恢复').waitFor();await p.locator('.world .image').waitFor();assert.notEqual(new URL(p.url()).searchParams.get('board'),b.id);
 console.log('PASS: linked arrows, mind map, table, image upload, URL drop, multiple undo/redo, JSON backup/restore');
}finally{await browser.close()}
