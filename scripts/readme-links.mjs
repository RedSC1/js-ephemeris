import { execFileSync } from "node:child_process";

const repositoryPath = "/RedSC1/js-ephemeris/";

export function trackedRepositoryFiles(directory) {
  return new Set(
    execFileSync("git", ["ls-files", "-z"], {
      cwd: directory,
      encoding: "utf8",
    })
      .split("\0")
      .filter(Boolean),
  );
}

/** Validate inline links in our npm READMEs, not Markdown shown inside code fences. */
export function checkReadmeLinks(markdown, trackedFiles, label = "README") {
  const prose = markdown.replace(/^```[^\n]*\n[\s\S]*?^```[^\n]*$/gm, "");
  const urls = new Set();
  for (const [, target] of prose.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    if (!target.startsWith("https://"))
      throw new Error(
        `${label}: README links must be absolute HTTPS URLs: ${target}`,
      );
    const url = new URL(target);
    if (url.username || url.password)
      throw new Error(`${label}: credentials are not allowed in README URLs`);
    if (
      url.hostname === "github.com" &&
      url.pathname.startsWith(repositoryPath + "blob/")
    ) {
      const [, ...segments] = url.pathname
        .slice((repositoryPath + "blob/").length)
        .split("/");
      const file = decodeURIComponent(segments.join("/"));
      if (!trackedFiles.has(file))
        throw new Error(
          `${label}: GitHub target is not a tracked repository file: ${file}`,
        );
    }
    urls.add(url.href);
  }
  return [...urls];
}

export async function checkOnlineLinks(urls, request = fetch) {
  const targets = [
    ...new Set(
      urls.map((value) => {
        const url = new URL(value);
        url.hash = "";
        return url.href;
      }),
    ),
  ];
  for (let start = 0; start < targets.length; start += 3)
    await Promise.all(
      targets.slice(start, start + 3).map(async (url) => {
        const response = await request(url, {
          method: "HEAD",
          redirect: "follow",
          signal: AbortSignal.timeout(20000),
        });
        if (!response.ok)
          throw new Error(
            `README link returned HTTP ${response.status}: ${url}`,
          );
        await response.body?.cancel();
      }),
    );
  return targets.length;
}
