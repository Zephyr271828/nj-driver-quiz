# NJ Driver Knowledge Test Practice

567 bilingual (English / 中文) practice questions for the New Jersey driver knowledge test, with an explanation for every question, a mistake notebook, mock exams, and progress saved in your browser.

**Use it online:** https://zephyr271828.github.io/nj-driver-quiz/

## Run locally

```bash
git clone <this repo> && cd nj-driver-quiz
python3 -m http.server 8000
```

Open http://localhost:8000. Opening `index.html` directly won't work.

Progress is stored in your browser. To move it to another device, use **进度总览 → 导出进度 / 导入进度** (export / import).

## Contributing

Each question is one line in `data/questions.json` (format: [docs/DATA.md](docs/DATA.md)). After editing, run `python3 scripts/validate.py`. See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md).

## Credits & license

All questions (with translations and images) come from [njq.vercel.app](https://njq.vercel.app). The explanations have been revised for this project. Rules come from the [NJ Driver Manual](https://www.nj.gov/mvc/pdf/license/drivermanual.pdf). This is an unofficial study aid. If anything here disagrees with the manual, the manual is right.

The code is under the [MIT License](LICENSE). The content in `data/` is not covered by MIT.
