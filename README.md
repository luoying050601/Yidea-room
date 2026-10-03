# Idea Room

一个适合私人小团队使用的中文协作白板。无需部署，安装依赖后可以离线运行。当前版本是可运行的 MVP。

## 本地启动

需要 Node.js 22.12+。

```bash
npm ci
npm run dev
```

打开 http://localhost:5173 。第一次打开自带 Hackathon 示例板。点击左上角品牌打开白板列表，新建白板。

多人协作：所有人访问同一台电脑的服务，例如 `http://192.168.1.20:5173/?board=白板ID`。邀请窗口可以复制当前链接；将其中的 localhost 换成运行服务电脑的局域网 IP。终端启动日志会显示 Network 地址。电脑需要开机并持续运行服务；不同电脑各自启动的服务不会互相同步。

安装后可以用单服务方式启动：

```bash
npm run build
npm start
```

打开 http://localhost:3001 ，局域网成员使用这台电脑的 IP 和 3001 端口。停止服务按 Ctrl+C，重新启动后白板会恢复。

## 已实现

- 可平移、缩放的自由画布，适应全板内容。
- 彩色便签、文字、矩形、圆形；双击编辑，拖动移动，设置宽高、颜色，复制和删除。
- 箭头：从一个对象拖到另一个对象，连接随对象移动；也可以创建自由箭头。
- 框架：包含区域内的对象随框架一起移动。
- 思维导图起始结构；节点和连线均可继续手动编辑。
- 可编辑表格结构、To Do / Doing / Done 看板模板，卡片可拖动。
- 图片、PDF、其他附件拖入或通过上传按钮添加；网页链接和纯文本也可拖入。
- Brainstorming、User Journey、Flowchart、Kanban、Roadmap 五种模板。模板追加到画布下方，保留已有内容。
- 同一白板实时同步，成员头像、远端鼠标位置。
- 白板或对象评论，解决和重新打开讨论。
- 多白板创建、切换、搜索、重命名。
- 撤销、重做；当其他修改使撤销版本过期时拒绝撤销，保护最新内容。
- 中文和图片 PDF 导出，完整画布单页；JSON 备份与恢复到新白板。
- 自动保存到 `data/`；不需要数据库、云账户或 AI API。

## 操作

左侧选择工具，点击画布放置。双击对象编辑，点击空白结束编辑；Ctrl / ⌘ + Enter 确认。选择对象后底部工具条可以修改颜色、宽高、复制、删除或评论。

滚轮平移；Ctrl / ⌘ + 滚轮缩放；H 或 Alt + 拖动平移；V 选择；N 便签；T 文字；R 矩形；O 圆形；A 连线；F 框架；C 评论；Delete 删除；Ctrl / ⌘ + Z 撤销，加 Shift 重做。

## 数据与当前范围

`data/<board-id>.json` 包含对象、评论和附件，写入时使用临时文件再原子替换。备份整个 data 目录即可保留所有白板。单个白板支持 3000 个对象，单个上传文件最大 4 MB。图片内嵌保存，适合少量素材的小团队；较大图片应先压缩。不同对象的操作独立合并，同一对象同时修改时最后一次提交生效。拖动完成后广播位置；光标在拖动时持续同步。

当前不包含账户登录、成员权限、企业组织管理、多人同一段文字的逐字符合并、多选框选、自动排版思维导图、任务字段管理或全文搜索。思维导图、表格、看板采用基础白板对象组合实现。PDF 附件以文件卡片呈现，不提供页内预览。导出的 PDF 为栅格画布，文字不可选择，评论不包含在 PDF 中；JSON 保留评论。超大画布会降低 PDF 分辨率，推荐分成多个白板。

服务适用于可信私人网络；持有链接并可访问服务的人能编辑，白板列表可访问。公开部署前须增加认证和访问控制。当前持久化为单 Node 进程设计，不适用于多实例运行。

## GitHub + Vercel + Render 部署

前端静态资源部署到 Vercel，Express/Socket.IO 服务部署到 Render，白板数据保存在 Supabase PostgreSQL。不要将 `.env`、数据库连接串或本地 `data/` 提交到 GitHub。当前应用没有登录或权限控制；任何能访问公开网址的人都可以查看和修改白板，不要放入敏感内容。

### 初始化数据库

1. 在 Supabase 创建项目，打开 SQL Editor，并执行 [`server/schema.sql`](server/schema.sql)。该表启用了 Row Level Security，且没有给 `anon` 或 `authenticated` 角色开放表权限；应用只从 Render 使用服务端数据库连接串访问。
2. 从 Supabase 项目的 Connect 页面复制 PostgreSQL 连接串。优先使用适用于应用服务的 Session Pooler；若使用 Transaction Pooler，当前驱动已关闭 prepared statements。连接串只配置在 Render，绝不设置成 `VITE_*` 环境变量。

### 部署服务

1. 将项目根目录推送到 GitHub 私有仓库。`.gitignore` 已排除 `data/`、依赖、构建结果和 `.env`。本机白板不会自动迁移；线上首次访问会创建一个新的 welcome 白板。
2. 从该仓库在 Render 创建 Node Web Service。运行环境使用 Node.js 22.12 或更新版本；构建命令 `npm ci && npm run build`，启动命令 `npm start`。设置 `DATABASE_URL` 为 Supabase 连接串、`CLIENT_ORIGIN` 为 Vercel 生产域名（无末尾 `/`）。Render 注入 `PORT`。不需要磁盘；JSON 本地存储仅用于未设置 `DATABASE_URL` 的本地开发。
3. 在 Vercel 导入同一仓库，构建命令 `npm run build`，输出目录 `dist`。设置 `VITE_SERVER_URL` 为 Render HTTPS 服务地址（无末尾 `/`），然后部署。
4. 首次拿到 Vercel 生产域名后，将其填入 Render 的 `CLIENT_ORIGIN` 并重新部署/重启服务。CORS 只允许这个准确的生产 origin；Vercel preview 部署默认不能连接后端。

Render 免费服务可能休眠并产生冷启动，但白板由 Supabase 持久化。数据库免费计划受其容量、休眠和服务条款限制，应定期导出备份。Supabase 项目地区尽量靠近 Render 服务地区。

本地开发仍使用 JSON 文件：将 `.env.example` 复制为 `.env`，保持 `DATABASE_URL` 为空即可。后端变量由 Node 加载，Vite 变量由前端构建读取；`CLIENT_ORIGIN` 是准确的前端 origin，不包含末尾 `/`。前后端同一服务本地运行无需设置跨域 origin。

官方参考：[Vite 静态部署](https://vite.dev/guide/static-deploy.html)、[Socket.IO 房间](https://socket.io/docs/v4/rooms/)、[Render 持久磁盘](https://render.com/docs/disks)。

## 验证

```bash
npm test
npm run build
npm audit
```

浏览器回归需要服务运行且安装测试浏览器：

```bash
npx playwright install chromium
npm run test:browser
node tests/extended.mjs
```

测试包括双客户端协作、中文编辑、拖动、评论解决、刷新持久化、模板、PDF 下载、连线、思维导图、表格、附件、链接拖入、连续撤销/重做与 JSON 恢复。浏览器测试会创建独立测试白板，生成的截图和 PDF 放在项目上两级的 work/。
