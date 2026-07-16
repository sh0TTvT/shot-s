import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const distDir = fileURLToPath(new URL("../dist/", import.meta.url));
const textExtensions = new Set([".css", ".html", ".js", ".json", ".svg", ".txt"]);
const forbiddenHosts = [
  "api.github.com",
  "cdn.jsdelivr.net",
  "cdnjs.cloudflare.com",
  "cloud.umami.is",
  "fonts.googleapis.com",
  "fonts.gstatic.com",
  "raw.githubusercontent.com",
  "unpkg.com",
];

const listFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? listFiles(path) : [path];
    }),
  );

  return nestedFiles.flat();
};

const files = await listFiles(distDir);
const errors = [];

for (const file of files) {
  if (!textExtensions.has(extname(file))) continue;

  const content = await readFile(file, "utf8");
  for (const host of forbiddenHosts) {
    if (content.includes(host)) {
      errors.push(`${relative(distDir, file)} 仍引用 ${host}`);
    }
  }
}

const indexPath = join(distDir, "index.html");
const indexHtml = await readFile(indexPath, "utf8");

if (/(?:href|src)=["']\/(?!\/)/.test(indexHtml)) {
  errors.push("index.html 包含根路径资源，GitHub Pages 仓库子路径将无法加载");
}

if (!files.some((file) => file.endsWith(".woff2"))) {
  errors.push("构建产物中没有本地 WOFF2 字体");
}

if (!files.some((file) => relative(distDir, file).startsWith("licenses/"))) {
  errors.push("构建产物中没有第三方许可证");
}

if (errors.length > 0) {
  throw new Error(`生产构建检查失败：\n${errors.join("\n")}`);
}

console.log(`生产构建检查通过，共检查 ${files.length} 个文件。`);
