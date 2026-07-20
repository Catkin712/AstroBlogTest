const applyTheme = () => {
    const savedTheme = localStorage.getItem("theme");
    const theme = ["dark", "light"].includes(savedTheme)
        ? savedTheme
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
};

applyTheme();

document.querySelector(".menu")?.addEventListener("click", (event) => {
    const button = event.currentTarget;
    const isExpanded = button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", String(!isExpanded));
});

document.querySelectorAll(".nav-group-toggle").forEach((button) => {
    button.addEventListener("click", () => {
        const group = button.closest(".nav-group");
        const isExpanded = button.getAttribute("aria-expanded") === "true";
        button.setAttribute("aria-expanded", String(!isExpanded));
        group?.classList.toggle("open", !isExpanded);
    });
});

document.querySelector("#themeToggle")?.addEventListener("click", () => {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
});

const searchInput = document.querySelector("#site-search");
const searchResults = document.querySelector("#search-results");
let searchPosts = [];

const clearResults = () => {
    if (!searchResults) {
        return;
    }
    searchResults.innerHTML = "";
    searchResults.hidden = true;
};

const renderResults = (posts) => {
    if (!searchResults) {
        return;
    }

    if (posts.length === 0) {
        searchResults.innerHTML = '<p class="search-empty">没有找到文章</p>';
        searchResults.hidden = false;
        return;
    }

    searchResults.innerHTML = posts
        .map(
            (post) => `
                <a class="search-result" href="${post.url}">
                    <span>${post.title}</span>
                    <small>${post.author} · ${post.category ?? "未分类"} · ${post.pubDate}</small>
                </a>
            `,
        )
        .join("");
    searchResults.hidden = false;
};

const search = (keyword) => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) {
        clearResults();
        return;
    }

    const results = searchPosts
        .filter((post) => {
            const haystack = [
                post.title,
                post.author,
                post.category,
                post.description,
                ...(post.tags ?? []),
            ]
                .join(" ")
                .toLowerCase();
            return haystack.includes(normalizedKeyword);
        })
        .slice(0, 6);

    renderResults(results);
};

if (searchInput && searchResults) {
    fetch("/search.json")
        .then((response) => response.json())
        .then((posts) => {
            searchPosts = posts;
        })
        .catch(() => {
            searchPosts = [];
        });

    searchInput.addEventListener("input", () => search(searchInput.value));
    searchInput.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            searchInput.value = "";
            clearResults();
        }
    });
}

const guestbookForm = document.querySelector("#guestbook-form");
const guestbookSky = document.querySelector("#guestbook-sky");
const guestbookStatus = document.querySelector("#guestbook-status");

const escapeHtml = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    })[char]);

const hashText = (value) => {
    let hash = 0;
    for (const char of String(value)) {
        hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    }
    return hash;
};

const renderGuestbookCloud = (message, index) => {
    const seed = hashText(message.id || `${message.createdAt}-${message.content}`);
    const x = 4 + (seed % 72);
    const y = 8 + ((seed >> 3) % 68);
    const tone = (seed % 5) + 1;
    const scale = 86 + (seed % 34);
    const drift = index % 2 === 0 ? "normal" : "reverse";
    const nickname = escapeHtml(message.nickname || "匿名小猫");
    const content = escapeHtml(message.content || "");

    return `
        <article
            class="guestbook-cloud tone-${tone}"
            style="--x:${x}; --y:${y}; --scale:${scale}; --drift:${drift};"
            title="${nickname}"
            data-author="${nickname}"
        >
            <p>${content}</p>
        </article>
    `;
};

const renderGuestbookMessages = (messages) => {
    if (!guestbookSky) {
        return;
    }

    guestbookSky.innerHTML = messages.length > 0
        ? messages.map(renderGuestbookCloud).join("")
        : '<p class="guestbook-empty">还没有留言，第一朵云等你来放飞。</p>';
};

if (guestbookForm && guestbookSky) {
    guestbookForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const submitButton = guestbookForm.querySelector('button[type="submit"]');
        const formData = new FormData(guestbookForm);
        const payload = {
            nickname: formData.get("nickname"),
            content: formData.get("content"),
        };

        if (guestbookStatus) {
            guestbookStatus.textContent = "正在放飞留言...";
        }
        submitButton.disabled = true;

        try {
            const response = await fetch("/api/guestbook", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(payload),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || "留言失败");
            }

            const listResponse = await fetch("/api/guestbook");
            const listResult = await listResponse.json();
            renderGuestbookMessages(listResult.messages || [result.message]);
            guestbookForm.reset();
            if (guestbookStatus) {
                guestbookStatus.textContent = "留言已经变成云啦。";
            }
        } catch (error) {
            if (guestbookStatus) {
                guestbookStatus.textContent = error.message || "留言失败，请稍后再试。";
            }
        } finally {
            submitButton.disabled = false;
        }
    });
}
