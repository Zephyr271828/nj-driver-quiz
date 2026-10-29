# NJ 驾照笔试题库 · NJ Driver Knowledge Test Practice

新泽西州（New Jersey）驾照笔试练习，567 道题，中英双语，逐题解析，带错题本和进度记录。纯静态网页，不需要安装任何依赖。

A bilingual (中文 / English) practice site for the New Jersey driver knowledge test: 567 questions, a per-question explanation for every one, a mistake notebook, mock exams, and saved progress. Plain static HTML/JS, no build step, no dependencies.

## 功能 Features

- **顺序练习**：从上次做到的那题继续；可以跳到下一道没做过的题
- **错题本**：答错自动加入，在错题本里连续答对 2 次自动移出，也能手动移出
- **模拟考试**：随机 50 题，40 题及格，交卷后才显示对错，保留考试记录
- **进度总览**：567 格进度图，按分类、状态、关键词筛选，各分类掌握程度
- **逐题解析**：每题都有中文和英文解析、记忆口诀；原题有问题的题（51 道）会标注「题目可能有误」
- **语言切换**：双语 / 只看中文 / 只看英文
- **进度保存**：存在浏览器本地（localStorage）；可以导出进度文件，在另一台设备导入后按题合并
- 键盘快捷键：`1`–`4` 或 `A`–`D` 选答案，`←` `→` 翻题，`Enter` 下一题

## 本地运行 Run locally

需要一个本地静态服务器（直接双击 `index.html` 打不开，因为浏览器不允许 `file://` 页面读取 JSON）。任选一种：

You need a local static server (opening `index.html` directly won't work because browsers block `fetch` on `file://`). Pick one:

```bash
git clone <this repo>
cd nj-driver-quiz

# macOS / Linux 自带 Python
python3 -m http.server 8000

# 或者用 Node.js
npx serve .
```

然后打开 http://localhost:8000 （`npx serve` 默认是 http://localhost:3000）。

Then open http://localhost:8000 (or http://localhost:3000 for `npx serve`).

想在手机上用：电脑和手机连同一个 Wi-Fi，用电脑的局域网 IP 访问，例如 `http://192.168.1.23:8000`。也可以把整个目录部署到 GitHub Pages、Vercel、Netlify 等任意静态托管。

To use it on your phone, join the same Wi-Fi and open your computer's LAN IP, e.g. `http://192.168.1.23:8000`. Any static host (GitHub Pages, Vercel, Netlify…) also works as-is.

## 换设备 / 备份 Moving progress between devices

进度只存在当前浏览器里。到「进度总览 → 备份与换设备」点「导出进度」，把下载的 JSON 文件拿到另一台设备上「导入进度」即可。导入是按题合并的（每道题保留较新的作答记录），不会覆盖掉另一边的进度。

Progress lives in your browser only. Use **进度总览 → 导出进度 / 导入进度** to move it; imports are merged per question (newer answer wins), never overwritten wholesale.

## 目录结构 Layout

```
index.html              页面骨架
css/style.css           样式（浅色 / 深色自动切换）
js/app.js               全部逻辑（原生 JS，无框架）
data/questions.json     题库 + 解析 + 分类 + 知识卡（一题一行）
data/images/            题目配图（153 张）
scripts/validate.py     数据校验脚本
docs/                   数据格式说明、贡献指南
```

## 参与贡献 Contributing

发现解析写错、答案有疑问、翻译不准，欢迎提 Issue 或 PR。改题目最简单的方式是直接编辑 `data/questions.json` 里对应的那一行，然后运行：

Found a wrong explanation or a suspicious answer key? Issues and PRs welcome. Edit the question's line in `data/questions.json`, then run:

```bash
python3 scripts/validate.py
```

详见 [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) 和数据格式说明 [docs/DATA.md](docs/DATA.md)。

## 数据来源与免责声明 Data source & disclaimer

- 题目、选项、中文翻译、分类、知识卡和配图整理自 [njq.vercel.app](https://njq.vercel.app)。知识卡里引用的规定出自 [NJ MVC Driver Manual](https://www.nj.gov/mvc/pdf/license/drivermanual.pdf)。
- 逐题解析（中英文）和「题目可能有误」标注是本项目新写的。
- 这是民间练习题库，不是 NJ MVC 官方材料。题库里有一部分原题本身就有缺陷（选项缺失、翻译错位等），已尽量标注。**以官方 Driver Manual 为准。**

Questions, options, Chinese translations, topics, knowledge cards and images are compiled from [njq.vercel.app](https://njq.vercel.app); rules cited in knowledge cards come from the [NJ MVC Driver Manual](https://www.nj.gov/mvc/pdf/license/drivermanual.pdf). Per-question explanations and data-quality flags were written for this project. This is an unofficial study aid, not an MVC publication — when in doubt, the official manual wins.

## License

代码（`index.html`、`css/`、`js/`、`scripts/`）使用 [MIT License](LICENSE)。`data/` 下的题库内容来源见上文，不包含在 MIT 授权范围内。

Code is MIT-licensed. Content under `data/` is not covered by the MIT license; see the data source section above.
