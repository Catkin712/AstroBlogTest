import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const defaultGuestbookPath = path.join(process.cwd(), "data", "guestbook.json");
const maxNicknameLength = 24;
const maxContentLength = 120;
const maxMessages = 160;

export async function listGuestbookMessages(env = {}) {
    const messages = await readGuestbookFile(env);
    return messages
        .filter((message) => message && message.id && message.content)
        .sort((a, b) => new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf());
}

export async function addGuestbookMessage(env = {}, payload = {}) {
    const nickname = normalizeText(payload.nickname, maxNicknameLength) || "匿名小猫";
    const content = normalizeText(payload.content, maxContentLength);

    if (!content) {
        throw new Error("留言内容不能为空");
    }

    const messages = await readGuestbookFile(env);
    const message = {
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        nickname,
        content,
        createdAt: new Date().toISOString(),
    };

    messages.unshift(message);
    await writeGuestbookFile(env, messages.slice(0, maxMessages));
    return message;
}

async function readGuestbookFile(env) {
    const filePath = guestbookPath(env);
    try {
        const text = await readFile(filePath, "utf8");
        const value = JSON.parse(text);
        return Array.isArray(value) ? value : [];
    } catch (error) {
        if (error.code === "ENOENT") {
            return [];
        }
        throw error;
    }
}

async function writeGuestbookFile(env, messages) {
    const filePath = guestbookPath(env);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(messages, null, 2)}\n`, "utf8");
}

function guestbookPath(env) {
    return env.GUESTBOOK_FILE || defaultGuestbookPath;
}

function normalizeText(value, maxLength) {
    return String(value ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, maxLength);
}
