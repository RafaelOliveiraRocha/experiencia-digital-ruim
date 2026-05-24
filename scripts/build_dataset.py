import pandas as pd
import numpy as np
import glob, os, re, json, math
from pathlib import Path

import argparse
parser = argparse.ArgumentParser(description='Processa CSVs mensais do Consumidor.gov.br e gera dashboardData.json')
parser.add_argument('--raw-dir', default='raw_data', help='Pasta com os CSVs baixados do portal oficial')
parser.add_argument('--out-dir', default='src/data', help='Pasta de saída do dashboardData.json')
args = parser.parse_args()
RAW_DIR = Path(args.raw_dir)
OUT_DIR = Path(args.out_dir)
OUT_DIR.mkdir(parents=True, exist_ok=True)

USECOLS = [
    'Região','UF','Data Abertura','Data Finalização',
    'Tempo Resposta','Segmento de Mercado','Área','Grupo Problema','Problema','Como Comprou Contratou',
    'Respondida','Avaliação Reclamação','Nota do Consumidor'
]
TEXT_COLS = ['Região','UF','Segmento de Mercado','Área','Grupo Problema','Problema','Como Comprou Contratou','Respondida','Avaliação Reclamação']
PERIOD_MONTHS = ['2026-01','2026-02','2026-03','2026-04']
MIN_SEGMENT_COUNT = 300

def clean_cols(df):
    for c in TEXT_COLS:
        df[c] = df[c].fillna('Não informado').astype(str).str.strip().str.replace(r'\s+', ' ', regex=True)
        df.loc[df[c].eq(''), c] = 'Não informado'
    return df

def grouped_metrics(g, keys):
    if isinstance(keys, str): keys=[keys]
    out = g.groupby(keys, dropna=False).agg(
        total=('__one','sum'),
        evaluated=('avaliada_flag','sum'),
        resolved=('resolvida_flag','sum'),
        responded=('respondida_flag','sum'),
        score_sum=('nota_consumidor','sum'),
        score_count=('nota_consumidor','count'),
        response_sum=('tempo_resposta','sum'),
        response_count=('tempo_resposta','count')
    ).reset_index()
    return out

def combine(parts, keys):
    if isinstance(keys, str): keys=[keys]
    if not parts:
        return pd.DataFrame(columns=keys+['total','evaluated','resolved','responded','score_sum','score_count','response_sum','response_count'])
    allp=pd.concat(parts, ignore_index=True)
    sums=['total','evaluated','resolved','responded','score_sum','score_count','response_sum','response_count']
    return allp.groupby(keys, dropna=False)[sums].sum().reset_index()

def finalize_metrics(m, key_col='name'):
    m=m.copy()
    m['resolutionRate'] = np.where(m['evaluated']>0, m['resolved']/m['evaluated'], np.nan)
    m['respondedRate'] = np.where(m['total']>0, m['responded']/m['total'], np.nan)
    m['avgSatisfaction'] = np.where(m['score_count']>0, m['score_sum']/m['score_count'], np.nan)
    m['avgResponseTime'] = np.where(m['response_count']>0, m['response_sum']/m['response_count'], np.nan)
    return m

def add_iad(m, total_rows, global_resolution, global_score, global_resp):
    m=m.copy()
    m['resolutionRateFilled']=m['resolutionRate'].fillna(global_resolution)
    m['avgSatisfactionFilled']=m['avgSatisfaction'].fillna(global_score)
    m['avgResponseTimeFilled']=m['avgResponseTime'].fillna(global_resp)
    vol=np.log1p(m['total'])
    m['volumeScore']=0 if vol.max()==vol.min() else (vol-vol.min())/(vol.max()-vol.min())
    m['nonResolutionScore']=1-m['resolutionRateFilled'].clip(0,1)
    m['lowSatisfactionScore']=1-((m['avgSatisfactionFilled'].clip(1,5)-1)/4)
    delay=m['avgResponseTimeFilled'].clip(lower=0, upper=m['avgResponseTimeFilled'].quantile(0.95))
    m['delayScore']=0 if delay.max()==delay.min() else (delay-delay.min())/(delay.max()-delay.min())
    m['iad']=(100*(0.30*m['volumeScore']+0.30*m['nonResolutionScore']+0.25*m['lowSatisfactionScore']+0.15*m['delayScore'])).round(1)
    m['share']=(m['total']/total_rows).round(6)
    return m

def clean_num(x, decimals=2):
    if pd.isna(x) or np.isinf(x): return None
    return round(float(x), decimals)

def row_to_dict(row, name_col):
    return {
        'name': str(row[name_col]),
        'total': int(row['total']),
        'evaluated': int(row['evaluated']),
        'resolved': int(row['resolved']),
        'responded': int(row['responded']),
        'scoreSum': clean_num(row['score_sum'],4),
        'scoreCount': int(row['score_count']),
        'responseSum': clean_num(row['response_sum'],4),
        'responseCount': int(row['response_count']),
        'resolutionRate': clean_num(row['resolutionRate'],4),
        'respondedRate': clean_num(row['respondedRate'],4),
        'avgSatisfaction': clean_num(row['avgSatisfaction'],2),
        'avgResponseTime': clean_num(row['avgResponseTime'],2),
        'iad': clean_num(row.get('iad', np.nan),1),
        'share': clean_num(row.get('share', np.nan),6),
        'volumeScore': clean_num(row.get('volumeScore', np.nan),4),
        'nonResolutionScore': clean_num(row.get('nonResolutionScore', np.nan),4),
        'lowSatisfactionScore': clean_num(row.get('lowSatisfactionScore', np.nan),4),
        'delayScore': clean_num(row.get('delayScore', np.nan),4),
    }

def pct(v):
    return None if v is None or pd.isna(v) else round(float(v)*100,1)

parts={k:[] for k in ['segment','area','problem_group','uf','channel','month','month_segment','segment_problem','segment_channel']}
metadata_files=[]
raw_rows=0
analysis_rows=0
excluded_rows=0
finalization_months=set()
opening_months=set()

overall={'total':0,'evaluated':0,'resolved':0,'responded':0,'score_sum':0.0,'score_count':0,'response_sum':0.0,'response_count':0,'internet':0}

for path in sorted(RAW_DIR.glob('*.csv')):
    source_rows=0
    print('processing', path.name, flush=True)
    m=re.search(r'(\d{4})-(\d{2})', path.name)
    source_month=f'{m.group(1)}-{m.group(2)}' if m else path.stem
    for chunk in pd.read_csv(path, sep=';', encoding='utf-8-sig', usecols=USECOLS, chunksize=100000, low_memory=False):
        source_rows += len(chunk)
        raw_rows += len(chunk)
        chunk=clean_cols(chunk)
        chunk['mes_finalizacao']=chunk['Data Finalização'].astype(str).str.slice(0,7)
        finalization_months.update(chunk['mes_finalizacao'].dropna().unique().tolist())
        # dd/mm/yyyy => yyyy-mm
        da=chunk['Data Abertura'].astype(str)
        chunk['mes_abertura']=da.str.slice(6,10)+'-'+da.str.slice(3,5)
        opening_months.update(chunk['mes_abertura'].dropna().unique().tolist())
        chunk=chunk[chunk['mes_finalizacao'].isin(PERIOD_MONTHS)].copy()
        excluded_rows += (source_rows if False else 0)
        if chunk.empty:
            continue
        analysis_rows += len(chunk)
        chunk['tempo_resposta']=pd.to_numeric(chunk['Tempo Resposta'], errors='coerce')
        chunk['nota_consumidor']=pd.to_numeric(chunk['Nota do Consumidor'], errors='coerce')
        chunk['respondida_flag']=chunk['Respondida'].str.upper().eq('S')
        chunk['avaliada_flag']=chunk['Avaliação Reclamação'].isin(['Resolvida','Não Resolvida'])
        chunk['resolvida_flag']=chunk['Avaliação Reclamação'].eq('Resolvida')
        chunk['__one']=1
        overall['total'] += len(chunk)
        overall['evaluated'] += int(chunk['avaliada_flag'].sum())
        overall['resolved'] += int(chunk['resolvida_flag'].sum())
        overall['responded'] += int(chunk['respondida_flag'].sum())
        overall['score_sum'] += float(chunk['nota_consumidor'].sum(skipna=True))
        overall['score_count'] += int(chunk['nota_consumidor'].count())
        overall['response_sum'] += float(chunk['tempo_resposta'].sum(skipna=True))
        overall['response_count'] += int(chunk['tempo_resposta'].count())
        overall['internet'] += int(chunk['Como Comprou Contratou'].eq('Internet').sum())
        parts['segment'].append(grouped_metrics(chunk, 'Segmento de Mercado'))
        parts['area'].append(grouped_metrics(chunk, 'Área'))
        parts['problem_group'].append(grouped_metrics(chunk, 'Grupo Problema'))
        parts['uf'].append(grouped_metrics(chunk, 'UF'))
        parts['channel'].append(grouped_metrics(chunk, 'Como Comprou Contratou'))
        parts['month'].append(grouped_metrics(chunk, 'mes_finalizacao'))
        parts['month_segment'].append(grouped_metrics(chunk, ['Segmento de Mercado','mes_finalizacao']))
        parts['segment_problem'].append(grouped_metrics(chunk, ['Segmento de Mercado','Grupo Problema']))
        parts['segment_channel'].append(grouped_metrics(chunk, ['Segmento de Mercado','Como Comprou Contratou']))
    metadata_files.append({'file': path.name, 'rows': int(source_rows), 'source_month': source_month})

excluded_rows = raw_rows - analysis_rows
print('combining', flush=True)
segment=finalize_metrics(combine(parts['segment'],'Segmento de Mercado'))
area=finalize_metrics(combine(parts['area'],'Área'))
problem=finalize_metrics(combine(parts['problem_group'],'Grupo Problema'))
uf=finalize_metrics(combine(parts['uf'],'UF'))
channel=finalize_metrics(combine(parts['channel'],'Como Comprou Contratou'))
month=finalize_metrics(combine(parts['month'],'mes_finalizacao'))
month_segment=finalize_metrics(combine(parts['month_segment'],['Segmento de Mercado','mes_finalizacao']))
segment_problem=finalize_metrics(combine(parts['segment_problem'],['Segmento de Mercado','Grupo Problema']))
segment_channel=finalize_metrics(combine(parts['segment_channel'],['Segmento de Mercado','Como Comprou Contratou']))

global_resolution = overall['resolved']/overall['evaluated'] if overall['evaluated'] else 0.5
global_score = overall['score_sum']/overall['score_count'] if overall['score_count'] else 3
global_resp = overall['response_sum']/overall['response_count'] if overall['response_count'] else 5

segment=segment[segment['total']>=MIN_SEGMENT_COUNT].copy()
segment=add_iad(segment, analysis_rows, global_resolution, global_score, global_resp).sort_values('iad', ascending=False).reset_index(drop=True)
segment['rank']=np.arange(1,len(segment)+1)
area=add_iad(area, analysis_rows, global_resolution, global_score, global_resp).sort_values('iad', ascending=False).reset_index(drop=True); area['rank']=np.arange(1,len(area)+1)
problem=add_iad(problem, analysis_rows, global_resolution, global_score, global_resp).sort_values('total', ascending=False).reset_index(drop=True)
uf=add_iad(uf, analysis_rows, global_resolution, global_score, global_resp).sort_values('total', ascending=False).reset_index(drop=True)
channel=add_iad(channel, analysis_rows, global_resolution, global_score, global_resp).sort_values('total', ascending=False).reset_index(drop=True)

seg_set=set(segment['Segmento de Mercado'])
month_segment=month_segment[month_segment['Segmento de Mercado'].isin(seg_set)].copy()
segment_problem=segment_problem[segment_problem['Segmento de Mercado'].isin(seg_set)].copy()
segment_channel=segment_channel[segment_channel['Segmento de Mercado'].isin(seg_set)].copy()

kpis={
    'totalComplaints': int(overall['total']),
    'evaluatedComplaints': int(overall['evaluated']),
    'respondedRate': clean_num(overall['responded']/overall['total'],4),
    'resolutionRate': clean_num(overall['resolved']/overall['evaluated'],4),
    'avgSatisfaction': clean_num(overall['score_sum']/overall['score_count'],2),
    'avgResponseTime': clean_num(overall['response_sum']/overall['response_count'],2),
    'internetShare': clean_num(overall['internet']/overall['total'],4),
    'segments': int(segment['Segmento de Mercado'].nunique()),
    'states': int(uf['UF'].nunique()),
    'periodStart':'2026-01','periodEnd':'2026-04','periodLabel':'Jan-Abr 2026','basis':'Data Finalização'
}

# Arrays
ranking_iad=[]
for _,r in segment.head(20).iterrows():
    d=row_to_dict(r,'Segmento de Mercado'); d['rank']=int(r['rank']); ranking_iad.append(d)
quadrant=[row_to_dict(r,'Segmento de Mercado') for _,r in segment.iterrows()]
areas=[]
for _,r in area.head(12).iterrows():
    d=row_to_dict(r,'Área'); d['rank']=int(r['rank']); areas.append(d)
problems=[row_to_dict(r,'Grupo Problema') for _,r in problem.head(12).iterrows()]
ufs=[row_to_dict(r,'UF') for _,r in uf.head(27).iterrows()]
channels=[row_to_dict(r,'Como Comprou Contratou') for _,r in channel.head(10).iterrows()]
monthly=[]
for _,r in month.sort_values('mes_finalizacao').iterrows():
    monthly.append({
        'month': r['mes_finalizacao'], 'total': int(r['total']), 'evaluated': int(r['evaluated']),
        'resolutionRate': clean_num(r['resolutionRate'],4), 'respondedRate': clean_num(r['respondedRate'],4),
        'avgSatisfaction': clean_num(r['avgSatisfaction'],2), 'avgResponseTime': clean_num(r['avgResponseTime'],2)
    })
monthly_by_segment=[]
for _,r in month_segment.sort_values(['Segmento de Mercado','mes_finalizacao']).iterrows():
    monthly_by_segment.append({
        'segment': r['Segmento de Mercado'], 'month': r['mes_finalizacao'], 'total': int(r['total']),
        'evaluated': int(r['evaluated']), 'resolved': int(r['resolved']), 'responded': int(r['responded']),
        'scoreSum': clean_num(r['score_sum'],4), 'scoreCount': int(r['score_count']),
        'responseSum': clean_num(r['response_sum'],4), 'responseCount': int(r['response_count']),
        'resolutionRate': clean_num(r['resolutionRate'],4), 'respondedRate': clean_num(r['respondedRate'],4),
        'avgSatisfaction': clean_num(r['avgSatisfaction'],2), 'avgResponseTime': clean_num(r['avgResponseTime'],2)
    })
problems_by_segment=[]
for seg, gs in segment_problem.groupby('Segmento de Mercado'):
    tmp=gs.sort_values('total', ascending=False)
    for _,r in tmp.iterrows():
        problems_by_segment.append({
            'segment': seg, 'name': r['Grupo Problema'], 'total': int(r['total']),
            'evaluated': int(r['evaluated']), 'resolved': int(r['resolved']), 'responded': int(r['responded']),
            'scoreSum': clean_num(r['score_sum'],4), 'scoreCount': int(r['score_count']),
            'responseSum': clean_num(r['response_sum'],4), 'responseCount': int(r['response_count']),
            'resolutionRate': clean_num(r['resolutionRate'],4), 'respondedRate': clean_num(r['respondedRate'],4),
            'avgSatisfaction': clean_num(r['avgSatisfaction'],2), 'avgResponseTime': clean_num(r['avgResponseTime'],2)
        })
channels_by_segment=[]
for seg, gs in segment_channel.groupby('Segmento de Mercado'):
    tmp=gs.sort_values('total', ascending=False)
    for _,r in tmp.iterrows():
        channels_by_segment.append({
            'segment': seg, 'name': r['Como Comprou Contratou'], 'total': int(r['total']),
            'evaluated': int(r['evaluated']), 'resolved': int(r['resolved']), 'responded': int(r['responded']),
            'scoreSum': clean_num(r['score_sum'],4), 'scoreCount': int(r['score_count']),
            'responseSum': clean_num(r['response_sum'],4), 'responseCount': int(r['response_count']),
            'resolutionRate': clean_num(r['resolutionRate'],4), 'respondedRate': clean_num(r['respondedRate'],4),
            'avgSatisfaction': clean_num(r['avgSatisfaction'],2), 'avgResponseTime': clean_num(r['avgResponseTime'],2)
        })
segments={}
for _,r in segment.iterrows():
    d=row_to_dict(r,'Segmento de Mercado'); d['rank']=int(r['rank']); segments[r['Segmento de Mercado']]=d

# Insights
eligible=segment[segment['total']>=segment['total'].quantile(0.25)]
best=eligible.sort_values('iad').iloc[0]
worst=segment.iloc[0]
highest=segment.sort_values('total', ascending=False).iloc[0]
top_problem=problem.sort_values('total', ascending=False).iloc[0]
med_res=segment['resolutionRate'].median(); med_sat=segment['avgSatisfaction'].median()
contrast=segment[(segment['resolutionRate']>=med_res)&(segment['avgSatisfaction']<=med_sat)].sort_values(['total','iad'], ascending=[False,False])
contrast_row=contrast.iloc[0] if len(contrast) else worst
slowest=segment.sort_values('avgResponseTime', ascending=False).iloc[0]
fastest=segment.sort_values('avgResponseTime', ascending=True).iloc[0]
insights={
    'highestFriction': {'segment': worst['Segmento de Mercado'], 'iad': clean_num(worst['iad'],1), 'total': int(worst['total']), 'resolutionRate': clean_num(worst['resolutionRate'],4), 'avgSatisfaction': clean_num(worst['avgSatisfaction'],2)},
    'bestExperience': {'segment': best['Segmento de Mercado'], 'iad': clean_num(best['iad'],1), 'total': int(best['total']), 'resolutionRate': clean_num(best['resolutionRate'],4), 'avgSatisfaction': clean_num(best['avgSatisfaction'],2)},
    'highestVolume': {'segment': highest['Segmento de Mercado'], 'total': int(highest['total']), 'share': clean_num(highest['share'],4)},
    'topProblem': {'name': top_problem['Grupo Problema'], 'total': int(top_problem['total']), 'resolutionRate': clean_num(top_problem['resolutionRate'],4), 'avgSatisfaction': clean_num(top_problem['avgSatisfaction'],2)},
    'resolutionSatisfactionContrast': {'segment': contrast_row['Segmento de Mercado'], 'resolutionRate': clean_num(contrast_row['resolutionRate'],4), 'avgSatisfaction': clean_num(contrast_row['avgSatisfaction'],2), 'total': int(contrast_row['total'])},
    'slowestResponse': {'segment': slowest['Segmento de Mercado'], 'avgResponseTime': clean_num(slowest['avgResponseTime'],2), 'total': int(slowest['total'])},
    'fastestResponse': {'segment': fastest['Segmento de Mercado'], 'avgResponseTime': clean_num(fastest['avgResponseTime'],2), 'total': int(fastest['total'])},
}
metadata={
    'generatedAt': pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S'),
    'source':'Consumidor.gov.br - dados abertos de reclamações',
    'sourceUrl':'https://dados.mj.gov.br/dataset/reclamacoes-do-consumidor-gov-br',
    'files':metadata_files,
    'rawRows':int(raw_rows),
    'analysisRows':int(analysis_rows),
    'excludedRowsOutsideFinalizationPeriod':int(excluded_rows),
    'finalizationMonthsFound':sorted([x for x in finalization_months if re.match(r'\d{4}-\d{2}',str(x))]),
    'openingMonthsFound':sorted([x for x in opening_months if re.match(r'\d{4}-\d{2}',str(x))])[:40],
    'notes':[
        'O recorte principal usa Data Finalização, porque os arquivos mensais de 2026 trazem reclamações finalizadas no mês de referência.',
        'Data Abertura pode conter meses anteriores ao recorte, pois uma reclamação aberta em 2025 pode ter sido finalizada em 2026.',
        'Taxa de resolução é calculada apenas sobre reclamações avaliadas como Resolvida ou Não Resolvida.',
        'O IAD é uma proxy comparativa e não deve ser lido como ranking absoluto de qualidade de empresas ou setores.'
    ]
}
out={'metadata':metadata,'kpis':kpis,'weights':{'volume':0.30,'nonResolution':0.30,'lowSatisfaction':0.25,'responseDelay':0.15},'rankingIad':ranking_iad,'quadrant':quadrant,'areas':areas,'problems':problems,'ufs':ufs,'channels':channels,'monthly':monthly,'monthlyBySegment':monthly_by_segment,'problemsBySegment':problems_by_segment,'channelsBySegment':channels_by_segment,'segments':segments,'insights':insights}
with open(OUT_DIR/'dashboardData.json','w',encoding='utf-8') as f: json.dump(out,f,ensure_ascii=False,indent=2,allow_nan=False)
summary=[]
summary.append('# QA dos dados processados\n')
summary.append(f'- Linhas brutas nos 4 arquivos: {raw_rows:,}'.replace(',','.'))
summary.append(f'- Linhas usadas na análise por Data Finalização Jan-Abr/2026: {analysis_rows:,}'.replace(',','.'))
summary.append(f'- Linhas fora do recorte de finalização: {excluded_rows:,}'.replace(',','.'))
summary.append(f'- Meses de finalização encontrados: {", ".join(metadata["finalizationMonthsFound"])}')
summary.append('- Meses de abertura existem antes de 2026 porque o recorte é por finalização, não por abertura.')
summary.append(f'- Setores com pelo menos {MIN_SEGMENT_COUNT} reclamações no ranking IAD: {len(segment)}')
summary.append('\n## Arquivos de origem\n')
for file in metadata_files: summary.append(f'- {file["file"]}: {file["rows"]:,} linhas'.replace(',','.'))
summary.append('\n## KPIs gerais\n')
summary.append(f'- Total de reclamações: {kpis["totalComplaints"]:,}'.replace(',','.'))
summary.append(f'- Taxa de resposta: {pct(kpis["respondedRate"])}%')
summary.append(f'- Taxa de resolução entre avaliadas: {pct(kpis["resolutionRate"])}%')
summary.append(f'- Nota média do consumidor: {kpis["avgSatisfaction"]}')
summary.append(f'- Tempo médio de resposta: {kpis["avgResponseTime"]} dias')
summary.append('\n## Top 5 IAD\n')
for _,r in segment.head(5).iterrows(): summary.append(f'- {r["Segmento de Mercado"]}: IAD {r["iad"]}, {int(r["total"]):,} reclamações'.replace(',','.'))
Path('docs').mkdir(exist_ok=True)
(Path('docs')/'data_qa_summary.md').write_text('\n'.join(summary),encoding='utf-8')
print('\n'.join(summary[:20]), flush=True)
