#!/usr/bin/env python3
"""检查 data/questions.json 的结构是否完整。用法：python3 scripts/validate.py"""
import json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = json.load(open(os.path.join(ROOT, 'data', 'questions.json'), encoding='utf-8'))
Q, TOP, EXP = D['q'], D['topics'], D['exp']
errs, warns = [], []
def err(qid, msg): errs.append(f'#{qid}: {msg}')
def warn(qid, msg): warns.append(f'#{qid}: {msg}')

STR = ['en', 'zh', 'why', 'tip', 'flag', 'why_en', 'tip_en', 'flag_en']
ids = [q.get('id') for q in Q]
if ids != list(range(1, len(Q) + 1)):
    errs.append('题号必须从 1 开始连续递增')
for q in Q:
    i = q.get('id')
    for k in STR:
        if not isinstance(q.get(k), str): err(i, f'{k} 必须是字符串')
    for k in ('oe', 'oz'):
        if not (isinstance(q.get(k), list) and len(q[k]) == 4): err(i, f'{k} 必须是 4 个选项的数组')
    if q.get('a') not in (0, 1, 2, 3): err(i, 'a（答案下标）必须是 0-3')
    elif not ((q['oe'][q['a']] or '').strip() or (q['oz'][q['a']] or '').strip()):
        # 原题数据本身残缺的题，只要写了 flag 说明就只提示不报错
        (warn if q.get('flag') else err)(i, '正确答案对应的选项是空的')
    if not q.get('why'): err(i, '缺少中文解析 why')
    if not q.get('why_en'): err(i, '缺少英文解析 why_en')
    if bool(q.get('flag')) != bool(q.get('flag_en')): err(i, 'flag 和 flag_en 要么都有，要么都空')
    for t in q.get('t', []):
        if t not in TOP: err(i, f'未知分类 {t}')
    if q.get('ek') is not None and q['ek'] not in EXP: err(i, f'未知知识卡 {q["ek"]}')
    if q.get('img') and not os.path.isfile(os.path.join(ROOT, 'data', 'images', q['img'])):
        err(i, f'图片不存在 data/images/{q["img"]}')
    if not isinstance(q.get('cm'), bool): err(i, 'cm 必须是 true/false')

if warns:
    print('提示（原题残缺，已用 flag 说明）：\n  ' + '\n  '.join(warns) + '\n')
if errs:
    print('\n'.join(errs)); print(f'\n{len(errs)} 个问题'); sys.exit(1)
print(f'OK：{len(Q)} 题，{len(TOP)} 个分类，{len(EXP)} 张知识卡，'
      f'{sum(1 for q in Q if q["img"])} 题带图，{sum(1 for q in Q if q["flag"])} 题标注了疑点')
