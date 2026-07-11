import { getCollection } from "astro:content";

export async function GET() {
    const posts = (await getCollection("posts"))
        .filter((post) => !post.data.draft)
        .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

    return new Response(
        JSON.stringify(
            posts.map((post) => ({
                title: post.data.title,
                description: post.data.description,
                author: post.data.author,
                tags: post.data.tags,
                pubDate: post.data.pubDate.toISOString().slice(0, 10),
                url: `/posts/${post.id}/`,
            })),
        ),
        {
            headers: {
                "content-type": "application/json; charset=utf-8",
            },
        },
    );
}
