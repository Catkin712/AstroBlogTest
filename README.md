# Catkin's Blog 
基于 Astro 7 搭建的轻量化个人内容站，内容待定

## 🔗 在线访问
站点地址：https://catkinsblog.netlify.app/
托管平台：Netlify

<!-- ## 🎯 项目优势
1. 纯静态站点，加载速度极快，无冗余 JavaScript
2. Markdown 原生支持，写作简单，专注内容阅读
3. 推送代码自动触发 Netlify 打包部署，无需手动操作
4. 结构轻量化，布局、组件可自由自定义修改
5. TypeScript 类型约束，代码规范易维护 -->

## 技术栈
- 核心框架：Astro v7.0.3
- 语言：TypeScript
- 样式：原生 CSS
- 包管理：npm
- 代码托管：GitHub
- 线上部署：Netlify

## 内容管理
文章存放在 `src/content/posts`，并由 `src/content.config.ts` 统一校验 frontmatter。

## 本地写作后台
```bash
npm run admin
```

打开 `http://127.0.0.1:8787` 后，可以新建或编辑 Markdown 文章。保存草稿会写入 `draft: true`，发布会写入 `draft: false`，后台里的“构建检查”会运行 `npm run build`。

## 本地开发运行
环境要求：Node.js 22.12.0 及以上版本
```bash
# 1. 克隆项目到本地
git clone https://github.com/Catkin712/AstroBlogTest.git
cd Catkin'sBlog

# 2. 安装全部依赖
npm install

# 3. 启动本地开发服务（访问 http://localhost:4321）
npm run dev

# 4. 打包生产静态资源
npm run build

# 5. 本地预览打包后的线上产物
npm run preview
