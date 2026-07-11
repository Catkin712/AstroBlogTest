import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const postsDir = path.join(projectRoot, "src", "content", "posts");
const coversDir = path.join(projectRoot, "public", "covers");
const host = process.env.ADMIN_HOST ?? "127.0.0.1";
const port = Number(process.env.ADMIN_PORT ?? 8787);

const html = String.raw`<!doctype html>
<html lang="zh-CN">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Catkin's Blog Admin</title>
        <style>
            :root {
                color-scheme: light;
                --bg: #f6f7f9;
                --panel: #ffffff;
                --line: #d9dee7;
                --text: #20242c;
                --muted: #687386;
                --brand: #216869;
                --brand-strong: #154c4d;
                --danger: #b42318;
                --code: #101828;
            }

            * {
                box-sizing: border-box;
            }

            body {
                margin: 0;
                background: var(--bg);
                color: var(--text);
                font-family:
                    ui-sans-serif,
                    system-ui,
                    -apple-system,
                    BlinkMacSystemFont,
                    "Segoe UI",
                    sans-serif;
            }

            header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 1rem;
                padding: 0.875rem 1rem;
                border-bottom: 1px solid var(--line);
                background: var(--panel);
            }

            header h1 {
                margin: 0;
                font-size: 1.1rem;
            }

            button,
            input,
            textarea {
                font: inherit;
            }

            button {
                min-height: 2.25rem;
                border: 1px solid var(--line);
                border-radius: 6px;
                background: #ffffff;
                color: var(--text);
                cursor: pointer;
                padding: 0.4rem 0.7rem;
            }

            button:hover {
                border-color: var(--brand);
            }

            button.primary {
                border-color: var(--brand);
                background: var(--brand);
                color: #ffffff;
            }

            button.primary:hover {
                background: var(--brand-strong);
            }

            button.danger {
                color: var(--danger);
            }

            .layout {
                display: grid;
                grid-template-columns: minmax(220px, 280px) 1fr;
                min-height: calc(100vh - 61px);
            }

            aside {
                border-right: 1px solid var(--line);
                background: var(--panel);
                padding: 1rem;
            }

            main {
                padding: 1rem;
            }

            .toolbar,
            .actions {
                display: flex;
                flex-wrap: wrap;
                gap: 0.5rem;
                align-items: center;
            }

            .post-list {
                display: grid;
                gap: 0.5rem;
                margin-top: 1rem;
            }

            .post-item {
                display: grid;
                gap: 0.25rem;
                width: 100%;
                text-align: left;
            }

            .post-item.active {
                border-color: var(--brand);
                box-shadow: inset 3px 0 0 var(--brand);
            }

            .post-title {
                font-weight: 700;
            }

            .post-meta,
            .hint,
            label span {
                color: var(--muted);
                font-size: 0.875rem;
            }

            form {
                display: grid;
                gap: 1rem;
            }

            .fields {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 0.75rem;
            }

            label {
                display: grid;
                gap: 0.35rem;
                font-weight: 700;
            }

            input,
            textarea {
                width: 100%;
                border: 1px solid var(--line);
                border-radius: 6px;
                background: #ffffff;
                color: var(--text);
                padding: 0.55rem 0.65rem;
            }

            textarea {
                min-height: 460px;
                resize: vertical;
                line-height: 1.55;
                font-family:
                    ui-monospace,
                    SFMono-Regular,
                    Consolas,
                    "Liberation Mono",
                    monospace;
            }

            .editor-grid {
                display: grid;
                grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
                gap: 1rem;
                align-items: start;
            }

            .preview,
            .output {
                border: 1px solid var(--line);
                border-radius: 6px;
                background: var(--panel);
                padding: 1rem;
            }

            .preview {
                min-height: 460px;
                overflow-wrap: anywhere;
            }

            .preview h1,
            .preview h2,
            .preview h3 {
                line-height: 1.2;
            }

            .preview code,
            .output {
                color: var(--code);
                font-family:
                    ui-monospace,
                    SFMono-Regular,
                    Consolas,
                    "Liberation Mono",
                    monospace;
                font-size: 0.875rem;
            }

            .status {
                min-height: 1.5rem;
                color: var(--muted);
            }

            .output {
                display: none;
                max-height: 280px;
                overflow: auto;
                white-space: pre-wrap;
            }

            @media (max-width: 860px) {
                .layout,
                .editor-grid,
                .fields {
                    grid-template-columns: 1fr;
                }

                aside {
                    border-right: 0;
                    border-bottom: 1px solid var(--line);
                }
            }
        </style>
    </head>
    <body>
        <header>
            <h1>Catkin's Blog Admin</h1>
            <div class="toolbar">
                <button id="refreshPosts" type="button">刷新</button>
                <button id="buildSite" type="button" class="primary">构建检查</button>
            </div>
        </header>
        <div class="layout">
            <aside>
                <div class="toolbar">
                    <button id="newPost" type="button" class="primary">新文章</button>
                </div>
                <div id="postList" class="post-list"></div>
            </aside>
            <main>
                <form id="postForm">
                    <div class="fields">
                        <label>
                            标题
                            <input id="title" name="title" required />
                        </label>
                        <label>
                            Slug
                            <input id="slug" name="slug" pattern="[a-z0-9][a-z0-9_-]*" required />
                            <span>只使用小写字母、数字、短横线和下划线</span>
                        </label>
                        <label>
                            日期
                            <input id="pubDate" name="pubDate" type="date" required />
                        </label>
                        <label>
                            作者
                            <input id="author" name="author" required />
                        </label>
                        <label>
                            标签
                            <input id="tags" name="tags" placeholder="astro, blog" />
                            <span>用英文逗号分隔</span>
                        </label>
                        <label>
                            封面 URL
                            <input id="imageUrl" name="imageUrl" />
                            <span>可填写外链或 /covers/example.png</span>
                        </label>
                        <label>
                            本地封面
                            <input id="imageFile" name="imageFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" />
                            <span>选择本地图片会覆盖封面 URL</span>
                        </label>
                        <label>
                            封面描述
                            <input id="imageAlt" name="imageAlt" />
                        </label>
                        <label>
                            摘要
                            <input id="description" name="description" required />
                        </label>
                    </div>
                    <div class="editor-grid">
                        <label>
                            Markdown
                            <textarea id="body" name="body" required></textarea>
                        </label>
                        <section>
                            <p class="hint">预览</p>
                            <article id="preview" class="preview"></article>
                        </section>
                    </div>
                    <div class="actions">
                        <button id="saveDraft" type="button">保存草稿</button>
                        <button id="publishPost" type="button" class="primary">发布</button>
                    </div>
                    <p id="status" class="status"></p>
                    <pre id="output" class="output"></pre>
                </form>
            </main>
        </div>
        <script>
            const els = {
                postList: document.querySelector("#postList"),
                form: document.querySelector("#postForm"),
                title: document.querySelector("#title"),
                slug: document.querySelector("#slug"),
                pubDate: document.querySelector("#pubDate"),
                author: document.querySelector("#author"),
                tags: document.querySelector("#tags"),
                imageUrl: document.querySelector("#imageUrl"),
                imageFile: document.querySelector("#imageFile"),
                imageAlt: document.querySelector("#imageAlt"),
                description: document.querySelector("#description"),
                body: document.querySelector("#body"),
                preview: document.querySelector("#preview"),
                status: document.querySelector("#status"),
                output: document.querySelector("#output"),
            };

            let posts = [];
            let currentSlug = "";

            const today = () => new Date().toISOString().slice(0, 10);
            const setStatus = (message) => {
                els.status.textContent = message;
            };

            const slugify = (value) => {
                const slug = value
                    .toLowerCase()
                    .trim()
                    .normalize("NFKD")
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-+|-+$/g, "");
                return slug || "post-" + today();
            };

            const escapeHtml = (value) =>
                value.replace(/[&<>"']/g, (char) => ({
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#039;",
                }[char]));

            const inlineMarkdown = (value) =>
                escapeHtml(value)
                    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                    .replace(/\x60(.+?)\x60/g, "<code>$1</code>");

            const renderMarkdown = (markdown) => {
                const lines = markdown.split(/\r?\n/);
                const html = [];
                let inList = false;

                for (const line of lines) {
                    if (/^\s*$/.test(line)) {
                        if (inList) {
                            html.push("</ul>");
                            inList = false;
                        }
                        continue;
                    }

                    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
                    if (heading) {
                        if (inList) {
                            html.push("</ul>");
                            inList = false;
                        }
                        html.push(
                            "<h" +
                                heading[1].length +
                                ">" +
                                inlineMarkdown(heading[2]) +
                                "</h" +
                                heading[1].length +
                                ">",
                        );
                        continue;
                    }

                    const item = /^\s*(?:[-*]|\d+\.)\s+(.+)$/.exec(line);
                    if (item) {
                        if (!inList) {
                            html.push("<ul>");
                            inList = true;
                        }
                        html.push("<li>" + inlineMarkdown(item[1]) + "</li>");
                        continue;
                    }

                    if (inList) {
                        html.push("</ul>");
                        inList = false;
                    }
                    html.push("<p>" + inlineMarkdown(line) + "</p>");
                }

                if (inList) {
                    html.push("</ul>");
                }

                return html.join("");
            };

            const refreshPreview = () => {
                els.preview.innerHTML = renderMarkdown(els.body.value);
            };

            const fillForm = (post) => {
                currentSlug = post.slug;
                els.title.value = post.data.title ?? "";
                els.slug.value = post.slug ?? "";
                els.slug.readOnly = Boolean(post.slug);
                els.pubDate.value = (post.data.pubDate ?? today()).slice(0, 10);
                els.author.value = post.data.author ?? "catkin";
                els.tags.value = (post.data.tags ?? []).join(", ");
                els.imageUrl.value = post.data.image?.url ?? "";
                els.imageFile.value = "";
                els.imageAlt.value = post.data.image?.alt ?? "";
                els.description.value = post.data.description ?? "";
                els.body.value = post.body ?? "";
                refreshPreview();
                renderPostList();
            };

            const newPost = () => {
                currentSlug = "";
                els.form.reset();
                els.slug.readOnly = false;
                els.pubDate.value = today();
                els.author.value = "catkin";
                els.body.value = "";
                refreshPreview();
                setStatus("正在新建文章。");
                renderPostList();
            };

            const readImageFile = (file) =>
                new Promise((resolve, reject) => {
                    if (!file) {
                        resolve(null);
                        return;
                    }

                    const reader = new FileReader();
                    reader.addEventListener("load", () => {
                        const result = String(reader.result ?? "");
                        const [, base64 = ""] = result.split(",");
                        resolve({
                            name: file.name,
                            type: file.type,
                            size: file.size,
                            base64,
                        });
                    });
                    reader.addEventListener("error", () => reject(new Error("封面读取失败")));
                    reader.readAsDataURL(file);
                });

            const formData = async (draft) => ({
                slug: els.slug.value.trim(),
                title: els.title.value.trim(),
                pubDate: els.pubDate.value,
                description: els.description.value.trim(),
                author: els.author.value.trim(),
                tags: els.tags.value.split(",").map((tag) => tag.trim()).filter(Boolean),
                draft,
                imageUrl: els.imageUrl.value.trim(),
                imageUpload: await readImageFile(els.imageFile.files?.[0]),
                imageAlt: els.imageAlt.value.trim(),
                body: els.body.value,
            });

            const requestJson = async (url, options) => {
                const response = await fetch(url, {
                    headers: { "content-type": "application/json" },
                    ...options,
                });
                const payload = await response.json();
                if (!response.ok) {
                    throw new Error(payload.error ?? "请求失败");
                }
                return payload;
            };

            const loadPosts = async () => {
                posts = await requestJson("/api/posts");
                renderPostList();
            };

            const loadPost = async (slug) => {
                const post = await requestJson("/api/posts/" + slug);
                fillForm(post);
                setStatus("已加载 " + slug + ".md");
            };

            const save = async (draft) => {
                if (!els.form.reportValidity()) {
                    return;
                }

                const payload = await formData(draft);
                await requestJson("/api/posts/" + payload.slug, {
                    method: "PUT",
                    body: JSON.stringify(payload),
                });
                currentSlug = payload.slug;
                await loadPosts();
                await loadPost(payload.slug);
                setStatus(draft ? "草稿已保存。" : "文章已发布。");
            };

            const buildSite = async () => {
                els.output.style.display = "block";
                els.output.textContent = "正在运行 npm run build...";
                setStatus("正在构建检查。");
                const result = await requestJson("/api/build", { method: "POST", body: "{}" });
                els.output.textContent = result.output;
                setStatus(result.ok ? "构建通过。" : "构建失败，请查看输出。");
            };

            const renderPostList = () => {
                els.postList.innerHTML = "";
                for (const post of posts) {
                    const button = document.createElement("button");
                    button.type = "button";
                    button.className = "post-item" + (post.slug === currentSlug ? " active" : "");
                    button.innerHTML =
                        '<span class="post-title">' +
                        escapeHtml(post.title) +
                        '</span><span class="post-meta">' +
                        escapeHtml(post.pubDate) +
                        " · " +
                        (post.draft ? "草稿" : "已发布") +
                        "</span>";
                    button.addEventListener("click", () => loadPost(post.slug));
                    els.postList.append(button);
                }
            };

            els.title.addEventListener("input", () => {
                if (!currentSlug) {
                    els.slug.value = slugify(els.title.value);
                }
            });
            els.body.addEventListener("input", refreshPreview);
            document.querySelector("#newPost").addEventListener("click", newPost);
            document.querySelector("#refreshPosts").addEventListener("click", loadPosts);
            document.querySelector("#saveDraft").addEventListener("click", () => save(true).catch((error) => setStatus(error.message)));
            document.querySelector("#publishPost").addEventListener("click", () => save(false).catch((error) => setStatus(error.message)));
            document.querySelector("#buildSite").addEventListener("click", () => buildSite().catch((error) => setStatus(error.message)));

            loadPosts()
                .then(() => {
                    if (posts[0]) {
                        return loadPost(posts[0].slug);
                    }
                    newPost();
                })
                .catch((error) => setStatus(error.message));
        </script>
    </body>
</html>`;

const server = createServer(async (request, response) => {
    try {
        const url = new URL(request.url ?? "/", `http://${request.headers.host}`);

        if (request.method === "GET" && url.pathname === "/") {
            send(response, 200, html, "text/html; charset=utf-8");
            return;
        }

        if (request.method === "GET" && url.pathname === "/api/posts") {
            sendJson(response, 200, await listPosts());
            return;
        }

        const postMatch = /^\/api\/posts\/([^/]+)$/.exec(url.pathname);
        if (postMatch && request.method === "GET") {
            sendJson(response, 200, await readPost(decodeURIComponent(postMatch[1])));
            return;
        }

        if (postMatch && request.method === "PUT") {
            const slug = decodeURIComponent(postMatch[1]);
            const payload = await readJson(request);
            await writePost(slug, payload);
            sendJson(response, 200, { ok: true });
            return;
        }

        if (request.method === "POST" && url.pathname === "/api/build") {
            sendJson(response, 200, await runBuild());
            return;
        }

        sendJson(response, 404, { error: "Not found" });
    } catch (error) {
        sendJson(response, 500, { error: error.message });
    }
});

server.listen(port, host, () => {
    console.log(`Admin server running at http://${host}:${port}`);
});

function send(response, status, body, contentType) {
    response.writeHead(status, {
        "content-type": contentType,
        "cache-control": "no-store",
    });
    response.end(body);
}

function sendJson(response, status, payload) {
    send(response, status, JSON.stringify(payload), "application/json; charset=utf-8");
}

async function readJson(request) {
    let body = "";
    for await (const chunk of request) {
        body += chunk;
        if (body.length > 8_000_000) {
            throw new Error("请求内容过大");
        }
    }
    return body ? JSON.parse(body) : {};
}

async function listPosts() {
    await mkdir(postsDir, { recursive: true });
    const files = (await readdir(postsDir)).filter((file) => file.endsWith(".md"));
    const posts = await Promise.all(
        files.map(async (file) => {
            const slug = file.replace(/\.md$/, "");
            const post = await readPost(slug);
            return {
                slug,
                title: post.data.title,
                pubDate: post.data.pubDate,
                description: post.data.description,
                author: post.data.author,
                tags: post.data.tags,
                draft: post.data.draft,
            };
        }),
    );

    return posts.sort((a, b) => b.pubDate.localeCompare(a.pubDate));
}

async function readPost(slug) {
    assertSlug(slug);
    const file = path.join(postsDir, `${slug}.md`);
    const markdown = await readFile(file, "utf8");
    const { data, body } = parseMarkdown(markdown);
    return { slug, data, body };
}

async function writePost(slug, payload) {
    assertSlug(slug);
    if (payload.slug !== slug) {
        throw new Error("Slug 与请求路径不一致");
    }

    const post = normalizePost(payload);
    if (payload.imageUpload?.base64) {
        post.image = await saveCover(slug, payload.imageUpload, payload.imageAlt || post.title);
    }
    await mkdir(postsDir, { recursive: true });
    await writeFile(path.join(postsDir, `${slug}.md`), serializeMarkdown(post), "utf8");
}

function assertSlug(slug) {
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(slug)) {
        throw new Error("Slug 只能包含小写字母、数字、短横线和下划线");
    }
}

function normalizePost(payload) {
    const required = ["title", "pubDate", "description", "author", "body"];
    for (const field of required) {
        if (!String(payload[field] ?? "").trim()) {
            throw new Error(`${field} 不能为空`);
        }
    }

    const post = {
        title: String(payload.title).trim(),
        pubDate: String(payload.pubDate).slice(0, 10),
        description: String(payload.description).trim(),
        author: String(payload.author).trim(),
        tags: Array.isArray(payload.tags)
            ? payload.tags.map((tag) => String(tag).trim()).filter(Boolean)
            : [],
        draft: Boolean(payload.draft),
        body: String(payload.body).replace(/\s+$/, ""),
    };

    if (!/^\d{4}-\d{2}-\d{2}$/.test(post.pubDate)) {
        throw new Error("pubDate 必须是 YYYY-MM-DD");
    }

    if (payload.imageUrl) {
        post.image = {
            url: String(payload.imageUrl).trim(),
            alt: String(payload.imageAlt ?? "").trim() || post.title,
        };
    }

    return post;
}

async function saveCover(slug, upload, alt) {
    const extensions = {
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/webp": "webp",
        "image/gif": "gif",
    };
    const extension = extensions[upload.type];
    if (!extension) {
        throw new Error("封面只支持 PNG、JPG、WebP 或 GIF");
    }

    const buffer = Buffer.from(String(upload.base64), "base64");
    if (buffer.length > 5_000_000) {
        throw new Error("封面图片不能超过 5MB");
    }

    await mkdir(coversDir, { recursive: true });
    const fileName = `${slug}.${extension}`;
    await writeFile(path.join(coversDir, fileName), buffer);
    return {
        url: `/covers/${fileName}`,
        alt: String(alt ?? "").trim() || slug,
    };
}

function parseMarkdown(markdown) {
    const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(markdown);
    if (!match) {
        throw new Error("Markdown 缺少 frontmatter");
    }

    return {
        data: parseFrontmatter(match[1]),
        body: match[2].trimStart(),
    };
}

function parseFrontmatter(frontmatter) {
    const data = { tags: [], draft: false };
    const lines = frontmatter.split(/\r?\n/);

    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        const keyValue = /^([a-zA-Z][\w-]*):\s*(.*)$/.exec(line);
        if (!keyValue) {
            continue;
        }

        const [, key, rawValue] = keyValue;
        if (key === "image" && rawValue === "") {
            const image = {};
            while (lines[i + 1]?.startsWith("    ") || lines[i + 1]?.startsWith("  ")) {
                i += 1;
                const child = /^\s+([a-zA-Z][\w-]*):\s*(.*)$/.exec(lines[i]);
                if (child) {
                    image[child[1]] = parseScalar(child[2]);
                }
            }
            data.image = image;
            continue;
        }

        data[key] = parseScalar(rawValue);
    }

    return {
        title: data.title ?? "",
        pubDate: String(data.pubDate ?? ""),
        description: data.description ?? "",
        author: data.author ?? "",
        image: data.image,
        tags: Array.isArray(data.tags) ? data.tags : [],
        draft: Boolean(data.draft),
    };
}

function parseScalar(value) {
    const trimmed = value.trim();
    if (trimmed === "true") {
        return true;
    }
    if (trimmed === "false") {
        return false;
    }
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        return JSON.parse(trimmed.replaceAll("'", '"'));
    }
    if (
        (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
        return trimmed.slice(1, -1);
    }
    return trimmed;
}

function serializeMarkdown(post) {
    const lines = [
        "---",
        `title: ${JSON.stringify(post.title)}`,
        `pubDate: ${post.pubDate}`,
        `description: ${JSON.stringify(post.description)}`,
        `author: ${JSON.stringify(post.author)}`,
    ];

    if (post.image) {
        lines.push("image:");
        lines.push(`    url: ${JSON.stringify(post.image.url)}`);
        lines.push(`    alt: ${JSON.stringify(post.image.alt)}`);
    }

    lines.push(`tags: ${JSON.stringify(post.tags)}`);
    lines.push(`draft: ${post.draft}`);
    lines.push("---", "", post.body, "");
    return lines.join("\n");
}

function runBuild() {
    return new Promise((resolve) => {
        const command = process.platform === "win32" ? "npm.cmd" : "npm";
        execFile(
            command,
            ["run", "build"],
            {
                cwd: projectRoot,
                shell: process.platform === "win32",
                timeout: 120_000,
            },
            (error, stdout, stderr) => {
                resolve({
                    ok: !error,
                    output: `${stdout}${stderr}`,
                });
            },
        );
    });
}
