# 数据格式 Data format

所有数据都在 `data/questions.json`，顶层三个字段：

```jsonc
{
  "q": [ ... ],        // 567 道题，数组，一题一行
  "topics": { ... },   // 分类：key → { "zh": "交通标志", "en": "Traffic Signs" }
  "exp": { ... }       // 知识卡：key → 卡片内容（见下）
}
```

## 题目 `q[]`

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | number | 题号，从 1 连续递增。进度按题号保存，**不要给已有的题改号或调换顺序** |
| `en` / `zh` | string | 英文 / 中文题干，可以为空字符串 |
| `img` | string \| null | 配图文件名，对应 `data/images/<img>` |
| `oe` / `oz` | string[4] | 英文 / 中文选项，固定 4 个，没有的写 `""`。页面只显示至少一种语言非空的选项 |
| `a` | 0–3 | 正确答案下标（0 = A） |
| `t` | string[] | 分类 key，必须在 `topics` 里 |
| `cm` | boolean | 是否「易错题」（来自原站标注） |
| `ek` | string \| null | 关联的知识卡 key，必须在 `exp` 里；没有合适的就填 `null`，宁缺毋滥 |
| `why` / `why_en` | string | 中文 / 英文解析：为什么选这个答案 |
| `tip` / `tip_en` | string | 一句话口诀，可以为空 |
| `flag` / `flag_en` | string | 「题目可能有误」说明。原题有缺陷（选项缺失、翻译错位、答案存疑等）时填写，没有问题就留空。两种语言要么都填、要么都空 |

例子：

```json
{"id": 1, "en": "The motor vehicle registration shall be renewed:", "zh": "车牌重新注册的时限是", "img": null, "oe": ["every six months", "every year", "every three years", "every month"], "oz": ["每六个月", "每年", "每三年", "每月"], "a": 1, "t": ["license_admin"], "cm": false, "ek": null, "why": "新泽西州的车辆注册 (registration) 每年 (every year) 续期一次。", "tip": "注册一年一续", "flag": "", "why_en": "In New Jersey, vehicle registration is renewed every year.", "tip_en": "Registration: renew yearly", "flag_en": ""}
```

## 知识卡 `exp{}`

```json
"adult_bac": {
  "zh": "NJ 成年司机（21 岁及以上）的 BAC 限值是 0.08%；…",
  "en": "For NJ drivers 21 and older, the BAC limit is 0.08%. …",
  "source_label": "NJ Driver Manual p117",
  "source_url": "https://www.nj.gov/mvc/pdf/license/drivermanual.pdf",
  "card": { "title": "NJ BAC 限值　BAC Limits", "rows": [["成人 21+　Adult", "0.08%"], ["未满 21　Under 21", "0.01%"]] }
}
```

知识卡是按主题共享的（多道题可以挂同一张卡），所以只有卡片内容和题目真正对应时才挂上。

## 进度格式（浏览器本地）

保存在 `localStorage['njq_progress_v1']`，导出的文件也是同一个格式：

```jsonc
{
  "v": 2,
  "at": 1730000000000,        // 最后修改时间
  "reset": 0,                 // 最近一次「重置」的时间，早于它的记录在合并时丢弃
  "ans":  { "12": { "c": 2, "ok": 1, "n": 3, "w": 1, "s": 1, "t": 1730000000000 } },
                              // c 最后选的选项, ok 是否答对, n 作答次数, w 答错次数, s 错题本里连续答对次数, t 修改时间
  "book": { "12": { "on": true, "a": 1730000000000, "t": 1730000000000 } },
                              // on 是否在错题本, a 加入时间, t 修改时间
  "exams": [ { "at": 1730000000000, "s": 43, "sec": 812 } ],   // 模拟考试：s 答对题数, sec 用时秒数
  "pos":  { "seq": 13, "book": 0 },
  "lang": "bi",               // bi | zh | en
  "view": "seq"               // seq | book | exam | map
}
```

导入时按题合并：每道题、每条错题本记录各自比较 `t`，保留较新的一边。
