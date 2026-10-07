import { useMemo, useState } from 'react';
import rawData from './data/dashboardData.json';

type Lang = 'pt' | 'en';
type View = 'overview' | 'explore' | 'readings' | 'methodology';
type MetricRow = {
  name: string;
  total: number;
  evaluated?: number;
  resolved?: number;
  responded?: number;
  scoreSum?: number;
  scoreCount?: number;
  responseSum?: number;
  responseCount?: number;
  resolutionRate?: number | null;
  respondedRate?: number | null;
  avgSatisfaction?: number | null;
  avgResponseTime?: number | null;
  iad?: number | null;
  share?: number | null;
  rank?: number;
  volumeScore?: number | null;
  nonResolutionScore?: number | null;
  lowSatisfactionScore?: number | null;
  delayScore?: number | null;
};
type MonthlyRow = Partial<MetricRow> & { month: string; segment?: string; total: number };
type SegmentMetricRow = MetricRow & { segment?: string };
type DashboardData = typeof rawData & {
  rankingIad: MetricRow[];
  quadrant: MetricRow[];
  problems: MetricRow[];
  channels: MetricRow[];
  monthly: MonthlyRow[];
  monthlyBySegment: MonthlyRow[];
  problemsBySegment: SegmentMetricRow[];
  channelsBySegment: SegmentMetricRow[];
  segments: Record<string, MetricRow>;
};
type TooltipState = { x: number; y: number; title: string; lines: string[] } | null;

const data = rawData as DashboardData;

const copy = {
  pt: {
    navOverview: 'Visão geral',
    navExplore: 'Explorar dados',
    navReadings: 'Leituras executivas',
    navMethod: 'Metodologia',
    badge: 'Dados públicos do Consumidor.gov.br',
    title: 'Quanto custa uma experiência digital ruim?',
    subtitle: 'Uma análise pública sobre atrito, resolução e satisfação nas relações de consumo digitais no Brasil.',
    heroText: 'A resposta não está em uma métrica isolada. O custo aparece quando volume, demora, baixa resolução e baixa satisfação começam a contar a mesma história.',
    byline: 'Projeto de Rafael Rocha · Data Analyst | BI, Data Products & AI',
    heroPrimary: 'Explorar dados',
    heroSecondary: 'Ver metodologia',
    overviewKicker: 'Tese do estudo',
    overviewTitle: 'O digital prometeu escala. Os dados mostram onde ainda existe esforço.',
    overviewText: 'Este estudo analisou reclamações finalizadas entre janeiro e abril de 2026. A pergunta não é quem tem mais reclamações. A pergunta melhor é onde a experiência digital está acumulando atrito suficiente para virar custo operacional, perda de confiança e retrabalho.',
    answerTitle: 'Então, quanto custa?',
    answerText: 'Neste recorte, o custo aparece em 1,38 milhão de registros, taxa média de resolução de 37,3%, nota média de 2,37 e tempo médio de resposta de 6,3 dias. Não é uma conta em reais. É uma leitura de desgaste. Quando a experiência falha, alguém paga com tempo, esforço e confiança.',
    trace1Title: 'Volume mostra pressão',
    trace1Text: 'Mais reclamações não significam automaticamente pior experiência, mas indicam onde há mais exposição ao atrito.',
    trace2Title: 'Resolução mostra efetividade',
    trace2Text: 'Resolver pouco, mesmo respondendo muito, é sinal de que a conversa pode não estar atacando a causa.',
    trace3Title: 'Satisfação mostra percepção',
    trace3Text: 'A experiência não termina quando o caso fecha. Ela termina quando o cliente sente que valeu o esforço.',
    trace4Title: 'Tempo mostra confiança',
    trace4Text: 'No digital, silêncio também comunica. Tempo de resposta não é só SLA, é percepção de prioridade.',
    kpiComplaints: 'Reclamações analisadas',
    kpiResolution: 'Taxa de resolução',
    kpiSatisfaction: 'Nota média',
    kpiResponse: 'Tempo médio de resposta',
    kpiResponded: 'Taxa de resposta',
    kpiShare: 'Participação no total',
    highestSectorIad: 'Maior IAD entre setores',
    sectorIad: 'IAD do setor',
    individualIads: 'IADs dos setores selecionados',
    individualIadNote: 'Índices individuais; não há IAD combinado.',
    sectors: 'Setores analisados',
    exploreTitle: 'Explorar dados',
    exploreText: 'Use o filtro para investigar setores específicos ou criar um recorte combinado. Volumes, taxas e médias refletem a seleção; os IADs permanecem individuais por setor.',
    filterLabel: 'Recorte de setores',
    filterButton: 'Selecionar setores',
    filterSearch: 'Buscar setor...',
    filterClear: 'Limpar filtro',
    filterAll: 'Todos os setores analisados',
    filterOne: '1 setor selecionado',
    filterMany: 'setores selecionados',
    summaryAll: 'Visão geral da base Jan-Abr/2026',
    summaryOne: 'Recorte filtrado para um setor',
    summaryMany: 'Recorte combinado de setores selecionados',
    summaryTitle: 'Resumo do recorte',
    summaryTextAll: 'Sem filtro ativo, o painel mostra o comportamento geral da base analisada.',
    summaryTextOne: 'Com um setor selecionado, o painel vira uma leitura de benchmark contra a média geral.',
    summaryTextMany: 'Volumes, taxas e médias são agregados para a seleção. Os IADs são apresentados por setor, sem média ou índice combinado.',
    rankingTitleAll: 'Ranking de atrito por setor',
    rankingTitleSelected: 'Comparação do recorte selecionado',
    rankingSubtitleAll: 'Clique em uma barra para focar o setor. O IAD combina volume, não resolução, baixa satisfação e demora de resposta.',
    rankingSubtitleSelected: 'Quando há filtro ativo, o ranking mostra apenas o recorte selecionado. Com um único setor, a visão vira benchmark contra a média geral.',
    quadrantTitle: 'Quadrante de experiência',
    quadrantSubtitle: 'Cada bolha representa um setor. Clique em uma bolha para incluir ou remover o setor do recorte.',
    monthlyTitle: 'Evolução mensal',
    monthlySubtitle: 'O recorte usa Data Finalização. Reclamações abertas antes de 2026 podem aparecer se foram finalizadas entre janeiro e abril.',
    problemsTitle: 'Principais grupos de problema',
    problemsSubtitle: 'Distribuição dos temas mais frequentes no recorte selecionado.',
    channelsTitle: 'Como o consumidor comprou ou contratou',
    channelsSubtitle: 'Canais declarados na reclamação, úteis para observar a presença digital na origem do atrito.',
    signalsTitle: 'Sinais de atenção',
    readingsTitle: 'Leituras executivas',
    readingsText: 'Perguntas que um time executivo deveria fazer antes de chamar uma experiência digital de eficiente.',
    readingsNoteTitle: 'Como ler esta seção',
    readingsNote: 'Aqui, os dados viram perguntas de negócio. A ideia é sair do ranking pelo ranking e olhar para sinais que ajudam liderança, produto e operação a tomar decisões melhores.',
    selectedQuestion: 'Pergunta selecionada',
    methodTitle: 'Metodologia',
    methodIntro: 'Os dados foram agregados a partir dos quatro arquivos mensais oficiais do Consumidor.gov.br de janeiro a abril de 2026. O recorte principal usa Data Finalização, não Data Abertura.',
    iadTitle: 'Como o IAD foi calculado',
    iadText: 'O Índice de Atrito Digital é um índice exploratório autoral de 0 a 100. Valores maiores indicam maior atrito segundo essa combinação. Os índices calculados pelo pipeline são preservados ao filtrar setores; não são uma nota oficial de qualidade.',
    volume: 'Volume relativo',
    nonResolution: 'Não resolução',
    lowSatisfaction: 'Baixa satisfação',
    delay: 'Demora de resposta',
    limitsTitle: 'Cuidados de leitura',
    limit1: 'Mais reclamações não significam automaticamente pior experiência. Também podem refletir maior base de clientes ou maior adesão ao canal.',
    limit2: 'Resolução alta não garante satisfação alta. Por isso o estudo cruza múltiplas dimensões.',
    limit3: 'O IAD é uma proxy comparativa para investigação e priorização, não uma sentença sobre setores ou empresas.',
    source: 'Fonte dos dados',
    portfolio: 'Ver portfólio',
    footer: '© 2026 Rafael Rocha. Data Analyst | BI, Data Products & AI.',
    total: 'Total',
    resolution: 'Resolução',
    satisfaction: 'Satisfação',
    responseTime: 'Tempo de resposta',
    iad: 'IAD',
    rank: 'Posição no ranking',
    generalAverage: 'Média geral',
    days: 'dias',
    records: 'registros',
    noFilter: 'Sem filtro ativo'
  },
  en: {
    navOverview: 'Overview',
    navExplore: 'Explore data',
    navReadings: 'Executive readings',
    navMethod: 'Methodology',
    badge: 'Public data from Consumidor.gov.br',
    title: 'What is the cost of a poor digital experience?',
    subtitle: 'A public analysis of friction, resolution and satisfaction in Brazilian consumer relations.',
    heroText: 'The answer is not in a single metric. The cost appears when volume, delays, low resolution and low satisfaction start telling the same story.',
    byline: 'Project by Rafael Rocha · Data Analyst | BI, Data Products & AI',
    heroPrimary: 'Explore data',
    heroSecondary: 'View methodology',
    overviewKicker: 'Study thesis',
    overviewTitle: 'Digital promised scale. The data shows where effort still exists.',
    overviewText: 'This study analyzed complaints finalized between January and April 2026. The question is not who has more complaints. A better question is where digital experience is accumulating enough friction to become operational cost, loss of trust and rework.',
    answerTitle: 'So, what is the cost?',
    answerText: 'In this cut, the cost appears in 1.38 million records, an average resolution rate of 37.3%, an average score of 2.37 and an average response time of 6.3 days. It is not a bill in money. It is a reading of friction. When experience fails, someone pays with time, effort and trust.',
    trace1Title: 'Volume shows pressure',
    trace1Text: 'More complaints do not automatically mean worse experience, but they show where exposure to friction is higher.',
    trace2Title: 'Resolution shows effectiveness',
    trace2Text: 'Low resolution, even with high response, may indicate that the conversation is not solving the cause.',
    trace3Title: 'Satisfaction shows perception',
    trace3Text: 'Experience does not end when the case closes. It ends when the customer feels the effort was worth it.',
    trace4Title: 'Time shows trust',
    trace4Text: 'In digital channels, silence is also a message. Response time is not just SLA, it is perceived priority.',
    kpiComplaints: 'Complaints analyzed',
    kpiResolution: 'Resolution rate',
    kpiSatisfaction: 'Average score',
    kpiResponse: 'Average response time',
    kpiResponded: 'Response rate',
    kpiShare: 'Share of total',
    highestSectorIad: 'Highest DFI among sectors',
    sectorIad: 'Sector DFI',
    individualIads: 'Selected sectors’ DFI',
    individualIadNote: 'Individual indices; no combined DFI.',
    sectors: 'Sectors analyzed',
    exploreTitle: 'Explore data',
    exploreText: 'Use the filter to investigate specific sectors or create a combined selection. Volumes, rates and averages reflect the selection; DFI remains individual for each sector.',
    filterLabel: 'Sector cut',
    filterButton: 'Select sectors',
    filterSearch: 'Search sector...',
    filterClear: 'Clear filter',
    filterAll: 'All analyzed sectors',
    filterOne: '1 selected sector',
    filterMany: 'selected sectors',
    summaryAll: 'Overall Jan-Apr/2026 base',
    summaryOne: 'Filtered cut for one sector',
    summaryMany: 'Combined cut of selected sectors',
    summaryTitle: 'Cut summary',
    summaryTextAll: 'With no active filter, the panel shows the overall behavior of the analyzed base.',
    summaryTextOne: 'With one sector selected, the panel becomes a benchmark against the overall average.',
    summaryTextMany: 'Volumes, rates and averages are aggregated for the selection. DFI is shown per sector, without an average or combined index.',
    rankingTitleAll: 'Friction ranking by sector',
    rankingTitleSelected: 'Selected cut comparison',
    rankingSubtitleAll: 'Click a bar to focus a sector. DFI combines volume, non-resolution, low satisfaction and response delay.',
    rankingSubtitleSelected: 'When a filter is active, the ranking only shows the selected cut. With a single sector, the view becomes a benchmark against the overall average.',
    quadrantTitle: 'Experience quadrant',
    quadrantSubtitle: 'Each bubble represents a sector. Click a bubble to add or remove the sector from the cut.',
    monthlyTitle: 'Monthly evolution',
    monthlySubtitle: 'The cut uses finalization date. Complaints opened before 2026 may appear if finalized from January to April.',
    problemsTitle: 'Main problem groups',
    problemsSubtitle: 'Distribution of the most frequent topics in the selected cut.',
    channelsTitle: 'How the consumer purchased or contracted',
    channelsSubtitle: 'Declared channels in the complaint, useful to observe digital presence in the origin of friction.',
    signalsTitle: 'Signals to watch',
    readingsTitle: 'Executive readings',
    readingsText: 'Questions leadership teams should ask before calling a digital experience efficient.',
    readingsNoteTitle: 'How to read this section',
    readingsNote: 'Here, data becomes business questions. The goal is to move beyond rankings and look at signals that help leadership, product and operations make better decisions.',
    selectedQuestion: 'Selected question',
    methodTitle: 'Methodology',
    methodIntro: 'The data was aggregated from the four official monthly files from Consumidor.gov.br from January to April 2026. The main cut uses finalization date, not opening date.',
    iadTitle: 'How the DFI was calculated',
    iadText: 'The Digital Friction Index is an original exploratory index from 0 to 100. Higher values indicate more friction according to this combination. Pipeline indices are preserved when filtering sectors; they are not official quality scores.',
    volume: 'Relative volume',
    nonResolution: 'Non-resolution',
    lowSatisfaction: 'Low satisfaction',
    delay: 'Response delay',
    limitsTitle: 'Reading cautions',
    limit1: 'More complaints do not automatically mean worse experience. They may also reflect a larger customer base or higher adoption of the channel.',
    limit2: 'High resolution does not guarantee high satisfaction. That is why the study crosses multiple dimensions.',
    limit3: 'The DFI is a comparative proxy for investigation and prioritization, not a verdict about sectors or companies.',
    source: 'Data source',
    portfolio: 'View portfolio',
    footer: '© 2026 Rafael Rocha. Data Analyst | BI, Data Products & AI.',
    total: 'Total',
    resolution: 'Resolution',
    satisfaction: 'Satisfaction',
    responseTime: 'Response time',
    iad: 'DFI',
    rank: 'Ranking position',
    generalAverage: 'Overall average',
    days: 'days',
    records: 'records',
    noFilter: 'No active filter'
  }
};

function normalize(input: string) {
  return input.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function safeDiv(a: number, b: number) {
  return b > 0 ? a / b : null;
}

function useFormat(lang: Lang) {
  return useMemo(() => {
    const locale = lang === 'pt' ? 'pt-BR' : 'en-US';
    return {
      number: (value?: number | null) => value === null || value === undefined ? '-' : new Intl.NumberFormat(locale).format(value),
      compact: (value?: number | null) => value === null || value === undefined ? '-' : new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(value),
      percent: (value?: number | null) => value === null || value === undefined ? '-' : `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value * 100)}%`,
      decimal: (value?: number | null, digits = 1) => value === null || value === undefined || Number.isNaN(value) ? '-' : new Intl.NumberFormat(locale, { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value)
    };
  }, [lang]);
}

function aggregateRows(rows: Array<Partial<MetricRow>>): MetricRow {
  const total = rows.reduce((acc, row) => acc + Number(row.total ?? 0), 0);
  const evaluated = rows.reduce((acc, row) => acc + Number(row.evaluated ?? 0), 0);
  const resolved = rows.reduce((acc, row) => acc + Number(row.resolved ?? 0), 0);
  const responded = rows.reduce((acc, row) => acc + Number(row.responded ?? 0), 0);
  const scoreSum = rows.reduce((acc, row) => acc + Number(row.scoreSum ?? ((row.avgSatisfaction ?? 0) * (row.evaluated ?? 0))), 0);
  const scoreCount = rows.reduce((acc, row) => acc + Number(row.scoreCount ?? row.evaluated ?? 0), 0);
  const responseSum = rows.reduce((acc, row) => acc + Number(row.responseSum ?? ((row.avgResponseTime ?? 0) * (row.responded ?? 0))), 0);
  const responseCount = rows.reduce((acc, row) => acc + Number(row.responseCount ?? row.responded ?? 0), 0);
  return {
    name: 'aggregate',
    total,
    evaluated,
    resolved,
    responded,
    scoreSum,
    scoreCount,
    responseSum,
    responseCount,
    resolutionRate: safeDiv(resolved, evaluated),
    respondedRate: safeDiv(responded, total),
    avgSatisfaction: safeDiv(scoreSum, scoreCount),
    avgResponseTime: safeDiv(responseSum, responseCount),
    share: safeDiv(total, data.kpis.totalComplaints)
  };
}

function aggregateByMonth(rows: MonthlyRow[], months: string[]) {
  return months.map((month) => {
    const monthRows = rows.filter((row) => row.month === month);
    return { month, ...aggregateRows(monthRows) };
  });
}

function aggregateByName(rows: SegmentMetricRow[]) {
  const groups = new Map<string, SegmentMetricRow[]>();
  rows.forEach((row) => {
    if (!groups.has(row.name)) groups.set(row.name, []);
    groups.get(row.name)!.push(row);
  });
  return Array.from(groups.entries())
    .map(([name, groupRows]) => ({ ...aggregateRows(groupRows), name }))
    .sort((a, b) => b.total - a.total);
}

function getScopeLabel(lang: Lang, selectedSegments: string[]) {
  if (selectedSegments.length === 0) return lang === 'pt' ? 'Todos os setores' : 'All sectors';
  if (selectedSegments.length === 1) return selectedSegments[0];
  return lang === 'pt' ? `${selectedSegments.length} setores selecionados` : `${selectedSegments.length} selected sectors`;
}

function App() {
  const [lang, setLang] = useState<Lang>('pt');
  const [view, setView] = useState<View>('overview');
  const [navOpen, setNavOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sectorSearch, setSectorSearch] = useState('');
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);
  const [activeReading, setActiveReading] = useState(0);
  const c = copy[lang];
  const fmt = useFormat(lang);

  const allSectorNames = useMemo(() => Object.keys(data.segments).sort((a, b) => a.localeCompare(b)), []);
  const months = useMemo(() => data.monthly.map((item) => item.month), []);
  const hasFilter = selectedSegments.length > 0;
  const selectedRows = useMemo(() => selectedSegments.map((name) => data.segments[name]).filter(Boolean), [selectedSegments]);

  const scopeMetric = useMemo(() => {
    const allResolved = Math.round(data.kpis.evaluatedComplaints * data.kpis.resolutionRate);
    const allResponded = Math.round(data.kpis.totalComplaints * data.kpis.respondedRate);
    return hasFilter ? aggregateRows(selectedRows) : {
      name: 'all',
      total: data.kpis.totalComplaints,
      evaluated: data.kpis.evaluatedComplaints,
      resolved: allResolved,
      responded: allResponded,
      resolutionRate: data.kpis.resolutionRate,
      respondedRate: data.kpis.respondedRate,
      avgSatisfaction: data.kpis.avgSatisfaction,
      avgResponseTime: data.kpis.avgResponseTime,
      share: 1
    } as MetricRow;
  }, [hasFilter, selectedRows]);

  const monthlyRows = useMemo(() => {
    if (!hasFilter) return data.monthly;
    return aggregateByMonth(data.monthlyBySegment.filter((row) => selectedSegments.includes(row.segment ?? '')), months);
  }, [hasFilter, selectedSegments, months]);

  const problemRows = useMemo(() => {
    if (!hasFilter) return data.problems;
    return aggregateByName(data.problemsBySegment.filter((row) => selectedSegments.includes(row.segment ?? '')));
  }, [hasFilter, selectedSegments]);

  const channelRows = useMemo(() => {
    if (!hasFilter) return data.channels;
    return aggregateByName(data.channelsBySegment.filter((row) => selectedSegments.includes(row.segment ?? '')));
  }, [hasFilter, selectedSegments]);

  const rankingRows = useMemo(() => {
    if (!hasFilter) return data.rankingIad.slice(0, 12);
    return [...selectedRows].sort((a, b) => Number(b.iad ?? 0) - Number(a.iad ?? 0));
  }, [hasFilter, selectedRows]);

  const iadRows = hasFilter ? rankingRows : [data.segments[data.insights.highestFriction.segment]];

  const filteredOptions = useMemo(() => {
    const q = normalize(sectorSearch.trim());
    if (!q) return allSectorNames;
    return allSectorNames.filter((name) => normalize(name).includes(q));
  }, [allSectorNames, sectorSearch]);

  const scopeLabel = getScopeLabel(lang, selectedSegments);
  const readings = getGuidedReadings({ lang, fmt, c, selectedSegments, scopeLabel, scopeMetric, problemRows, rankingRows });

  function changeView(next: View) {
    setView(next);
    setNavOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function toggleSegment(name: string) {
    setSelectedSegments((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]);
  }

  function setSingleSegment(name: string) {
    setSelectedSegments((current) => current.length === 1 && current[0] === name ? [] : [name]);
  }

  const globalKpis = [
    { label: c.kpiComplaints, value: fmt.number(data.kpis.totalComplaints), hint: data.kpis.periodLabel },
    { label: c.kpiResolution, value: fmt.percent(data.kpis.resolutionRate), hint: lang === 'pt' ? 'sobre reclamações avaliadas' : 'among evaluated complaints' },
    { label: c.kpiSatisfaction, value: fmt.decimal(data.kpis.avgSatisfaction, 2), hint: lang === 'pt' ? 'escala 1 a 5' : '1 to 5 scale' },
    { label: c.kpiResponse, value: `${fmt.decimal(data.kpis.avgResponseTime, 1)} ${c.days}`, hint: c.responseTime }
  ];

  const exploreKpis = [
    { label: c.kpiComplaints, value: fmt.number(scopeMetric.total), hint: hasFilter ? scopeLabel : c.summaryAll },
    { label: c.kpiResolution, value: fmt.percent(scopeMetric.resolutionRate), hint: lang === 'pt' ? 'sobre reclamações avaliadas' : 'among evaluated complaints' },
    { label: c.kpiSatisfaction, value: fmt.decimal(scopeMetric.avgSatisfaction, 2), hint: lang === 'pt' ? 'escala 1 a 5' : '1 to 5 scale' },
    { label: c.kpiResponse, value: `${fmt.decimal(scopeMetric.avgResponseTime, 1)} ${c.days}`, hint: c.responseTime },
    { label: c.kpiResponded, value: fmt.percent(scopeMetric.respondedRate), hint: lang === 'pt' ? 'reclamações respondidas' : 'answered complaints' },
    { label: c.kpiShare, value: fmt.percent(scopeMetric.share), hint: lang === 'pt' ? 'do total analisado' : 'of analyzed total' }
  ];

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-main">
          <button className="brand" onClick={() => changeView('overview')}>Digital Friction Lab</button>
          <div className="topbar-actions">
            <div className="language-switch" aria-label="language selector">
              <button className={lang === 'pt' ? 'active' : ''} onClick={() => setLang('pt')}>PT-BR</button>
              <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
            </div>
            <button className={`menu-toggle ${navOpen ? 'open' : ''}`} aria-label="Menu" aria-expanded={navOpen} onClick={() => setNavOpen((open) => !open)}>
              <span /><span /><span />
            </button>
          </div>
        </div>
        <nav className={navOpen ? 'open' : ''}>
          <button className={view === 'overview' ? 'active' : ''} onClick={() => changeView('overview')}>{c.navOverview}</button>
          <button className={view === 'explore' ? 'active' : ''} onClick={() => changeView('explore')}>{c.navExplore}</button>
          <button className={view === 'readings' ? 'active' : ''} onClick={() => changeView('readings')}>{c.navReadings}</button>
          <button className={view === 'methodology' ? 'active' : ''} onClick={() => changeView('methodology')}>{c.navMethod}</button>
        </nav>
      </header>

      <main>
        {view === 'overview' && (
          <ViewShell key="overview">
            <section className="hero section-grid">
              <div className="hero-copy">
                <span className="pill">{c.badge}</span>
                <h1>{c.title}</h1>
                <p className="subtitle">{c.subtitle}</p>
                <p className="muted wide">{c.heroText}</p>
                <div className="hero-actions">
                  <button className="primary-button" onClick={() => changeView('explore')}>{c.heroPrimary}</button>
                  <button className="secondary-button" onClick={() => changeView('methodology')}>{c.heroSecondary}</button>
                </div>
                <p className="signature">{c.byline}</p>
              </div>
              <div className="hero-panel glass-card">
                <span className="panel-label">{c.highestSectorIad}</span>
                <strong>{fmt.decimal(data.insights.highestFriction.iad, 1)}</strong>
                <p>{data.insights.highestFriction.segment}</p>
                <div className="mini-grid">
                  <span>{c.total}<b>{fmt.compact(data.insights.highestFriction.total)}</b></span>
                  <span>{c.resolution}<b>{fmt.percent(data.insights.highestFriction.resolutionRate)}</b></span>
                  <span>{c.satisfaction}<b>{fmt.decimal(data.insights.highestFriction.avgSatisfaction, 2)}</b></span>
                </div>
              </div>
            </section>

            <section className="story-section">
              <div className="section-heading story-heading">
                <span className="eyebrow">{c.overviewKicker}</span>
                <h2>{c.overviewTitle}</h2>
                <p>{c.overviewText}</p>
              </div>
              <div className="answer-card">
                <span>{c.answerTitle}</span>
                <p>{c.answerText}</p>
              </div>
              <div className="kpi-grid overview-kpis">
                {globalKpis.map((card) => <KpiCard key={card.label} {...card} />)}
              </div>
              <div className="trace-grid">
                <TraceCard number="01" title={c.trace1Title} text={c.trace1Text} />
                <TraceCard number="02" title={c.trace2Title} text={c.trace2Text} />
                <TraceCard number="03" title={c.trace3Title} text={c.trace3Text} />
                <TraceCard number="04" title={c.trace4Title} text={c.trace4Text} />
              </div>
            </section>
          </ViewShell>
        )}

        {view === 'explore' && (
          <ViewShell key="explore">
            <section className="page-intro section-grid compact-grid">
              <div>
                <span className="eyebrow">Dashboard</span>
                <h1 className="page-title">{c.exploreTitle}</h1>
                <p>{c.exploreText}</p>
              </div>
              <div className="filter-card">
                <span className="filter-label">{c.filterLabel}</span>
                <div className="filter-summary">
                  <strong>{selectedSegments.length === 0 ? c.filterAll : selectedSegments.length === 1 ? c.filterOne : `${selectedSegments.length} ${c.filterMany}`}</strong>
                  <div className="filter-actions">
                    {hasFilter && <button className="ghost-button" onClick={() => setSelectedSegments([])}>{c.filterClear}</button>}
                    <button className="filter-toggle" onClick={() => setFilterOpen((open) => !open)}>{c.filterButton}</button>
                  </div>
                </div>
                {selectedSegments.length > 0 && (
                  <div className="selected-chips">
                    {selectedSegments.map((name) => <button key={name} onClick={() => toggleSegment(name)}>{name}<span>×</span></button>)}
                  </div>
                )}
                {filterOpen && (
                  <div className="sector-picker">
                    <input value={sectorSearch} onChange={(event) => setSectorSearch(event.target.value)} placeholder={c.filterSearch} />
                    <div className="sector-options">
                      {filteredOptions.map((name) => (
                        <label className="sector-option" key={name}>
                          <input type="checkbox" checked={selectedSegments.includes(name)} onChange={() => toggleSegment(name)} />
                          <span>{name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="section-block">
              <div className="summary-card">
                <div>
                  <span className="eyebrow">{c.summaryTitle}</span>
                  <h2>{scopeLabel}</h2>
                  <p>{selectedSegments.length === 0 ? c.summaryTextAll : selectedSegments.length === 1 ? c.summaryTextOne : c.summaryTextMany}</p>
                </div>
                <div className={`summary-iad ${selectedSegments.length > 1 ? 'iad-multiple' : ''}`}>
                  <span>{!hasFilter ? c.highestSectorIad : selectedSegments.length === 1 ? c.sectorIad : c.individualIads}</span>
                  <div className="iad-values">
                    {iadRows.map((row) => (
                      <div className="iad-item" key={row.name}>
                        <strong>{fmt.decimal(row.iad, 1)}</strong>
                        <small>{row.name}</small>
                      </div>
                    ))}
                  </div>
                  {selectedSegments.length > 1 && <p className="iad-note">{c.individualIadNote}</p>}
                </div>
              </div>
              <div className="kpi-grid">
                {exploreKpis.map((card) => <KpiCard key={card.label} {...card} />)}
              </div>
            </section>

            <section className="section-block">
              <div className="chart-grid two">
                <ChartCard title={hasFilter ? c.rankingTitleSelected : c.rankingTitleAll} subtitle={hasFilter ? c.rankingSubtitleSelected : c.rankingSubtitleAll}>
                  {selectedSegments.length === 1 ? (
                    <SectorBenchmark row={selectedRows[0]} scopeMetric={scopeMetric} fmt={fmt} c={c} lang={lang} />
                  ) : (
                    <RankingBars rows={rankingRows} selected={selectedSegments} formatValue={(value) => fmt.decimal(value, 1)} onPick={setSingleSegment} lang={lang} />
                  )}
                </ChartCard>
                <ChartCard title={c.quadrantTitle} subtitle={c.quadrantSubtitle}>
                  <QuadrantPlot rows={data.quadrant} selected={selectedSegments} onPick={toggleSegment} lang={lang} fmt={fmt} />
                </ChartCard>
              </div>
              <div className="chart-grid two lower-grid">
                <ChartCard title={c.monthlyTitle} subtitle={c.monthlySubtitle}>
                  <MonthlyLine rows={monthlyRows} formatValue={(value) => fmt.compact(value)} lang={lang} />
                </ChartCard>
                <ChartCard title={c.problemsTitle} subtitle={c.problemsSubtitle}>
                  <ProblemBars rows={problemRows.slice(0, 8)} formatValue={(value) => fmt.compact(value)} lang={lang} />
                </ChartCard>
              </div>
              <ChartCard title={c.channelsTitle} subtitle={c.channelsSubtitle}>
                <ChannelBars rows={channelRows.slice(0, 6)} total={scopeMetric.total} fmt={fmt} lang={lang} />
              </ChartCard>
            </section>

            <section className="section-block">
              <div className="section-heading compact">
                <span className="eyebrow">{c.signalsTitle}</span>
              </div>
              <div className="insight-grid">
                <Insight title={lang === 'pt' ? 'Maior atrito' : 'Highest friction'} value={rankingRows[0]?.name ?? data.insights.highestFriction.segment} detail={`${c.iad}: ${fmt.decimal(rankingRows[0]?.iad ?? data.insights.highestFriction.iad, 1)}`} />
                <Insight title={lang === 'pt' ? 'Volume do recorte' : 'Selected volume'} value={fmt.number(scopeMetric.total)} detail={`${fmt.percent(scopeMetric.share)} ${lang === 'pt' ? 'do total analisado' : 'of analyzed total'}`} />
                <Insight title={lang === 'pt' ? 'Problema mais frequente' : 'Most frequent problem'} value={problemRows[0]?.name ?? data.insights.topProblem.name} detail={`${fmt.number(problemRows[0]?.total ?? data.insights.topProblem.total)} ${c.records}`} />
                <Insight title={lang === 'pt' ? 'Tempo médio' : 'Average response'} value={`${fmt.decimal(scopeMetric.avgResponseTime, 1)} ${c.days}`} detail={lang === 'pt' ? 'sinal operacional do recorte' : 'operational signal of the cut'} />
              </div>
            </section>
          </ViewShell>
        )}

        {view === 'readings' && (
          <ViewShell key="readings">
            <section className="page-intro readings-page">
              <span className="eyebrow">{c.readingsTitle}</span>
              <h1 className="page-title">{c.readingsText}</h1>
              <div className="honesty-note">
                <strong>{c.readingsNoteTitle}</strong>
                <p>{c.readingsNote}</p>
              </div>
            </section>
            <section className="reading-list">
              {readings.map((item, index) => (
                <article className={`reading-item ${activeReading === index ? 'active' : ''}`} key={item.question}>
                  <button className="reading-question" onClick={() => setActiveReading(index)} aria-expanded={activeReading === index}>
                    <span>{item.tag}</span>
                    <strong>{item.question}</strong>
                    <i>{activeReading === index ? '−' : '+'}</i>
                  </button>
                  {activeReading === index && (
                    <div className="reading-answer">
                      <span>{c.selectedQuestion}</span>
                      <h2>{item.question}</h2>
                      <p>{item.answer}</p>
                      <em>{item.punchline}</em>
                    </div>
                  )}
                </article>
              ))}
            </section>
          </ViewShell>
        )}

        {view === 'methodology' && (
          <ViewShell key="methodology">
            <section className="page-intro section-grid compact-grid">
              <div>
                <span className="eyebrow">{c.methodTitle}</span>
                <h1 className="page-title">{c.methodTitle}</h1>
                <p>{c.methodIntro}</p>
              </div>
              <div className="method-card source-card">
                <span>{c.source}</span>
                <a href={data.metadata.sourceUrl} target="_blank" rel="noreferrer">Consumidor.gov.br</a>
                <small>{data.kpis.periodLabel} · {data.kpis.basis}</small>
              </div>
            </section>
            <section className="section-block method-layout">
              <div className="method-card large">
                <h2>{c.iadTitle}</h2>
                <p>{c.iadText}</p>
                <div className="formula-grid">
                  <Weight label={c.volume} value={30} />
                  <Weight label={c.nonResolution} value={30} />
                  <Weight label={c.lowSatisfaction} value={25} />
                  <Weight label={c.delay} value={15} />
                </div>
              </div>
              <div className="method-card large">
                <h2>{c.limitsTitle}</h2>
                <ul>
                  <li>{c.limit1}</li>
                  <li>{c.limit2}</li>
                  <li>{c.limit3}</li>
                </ul>
              </div>
            </section>
            <section className="about-section">
              <div>
                <span className="eyebrow">Rafael Rocha</span>
                <h2>{lang === 'pt' ? 'Sobre o projeto' : 'About the project'}</h2>
                <p>{lang === 'pt' ? 'Criei este estudo para mostrar como dados públicos podem virar inteligência acionável, combinando BI, produto de dados, metodologia e narrativa executiva.' : 'I created this study to show how public data can become actionable intelligence by combining BI, data product thinking, methodology and executive storytelling.'}</p>
              </div>
              <a className="primary-button" href="https://rafaeloliveirarocha.github.io/" target="_blank" rel="noreferrer">{c.portfolio}</a>
            </section>
          </ViewShell>
        )}
      </main>
      <footer><span>{c.footer}</span></footer>
    </div>
  );
}

function ViewShell({ children }: { children: React.ReactNode }) {
  return <div className="view-shell">{children}</div>;
}

function KpiCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <article className="kpi-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </article>
  );
}

function TraceCard({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <article className="trace-card">
      <span>{number}</span>
      <strong>{title}</strong>
      <p>{text}</p>
    </article>
  );
}

function Weight({ label, value }: { label: string; value: number }) {
  return (
    <div className="weight-card">
      <span>{label}</span>
      <strong>{value}%</strong>
      <div className="bar-track"><i style={{ width: `${value}%` }} /></div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <article className="chart-card">
      <div className="chart-title">
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
      {children}
    </article>
  );
}

function Insight({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <article className="insight-card">
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function Tooltip({ tooltip }: { tooltip: TooltipState }) {
  if (!tooltip) return null;
  return (
    <div className="floating-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
      <strong>{tooltip.title}</strong>
      {tooltip.lines.map((line) => <span key={line}>{line}</span>)}
    </div>
  );
}

function RankingBars({ rows, formatValue, selected, onPick, lang }: { rows: MetricRow[]; formatValue: (value: number) => string; selected: string[]; onPick: (name: string) => void; lang: Lang }) {
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const max = Math.max(...rows.map((row) => Number(row.iad ?? 0)), 1);
  return (
    <div className="ranking-bars chart-interactive" onMouseLeave={() => setTooltip(null)}>
      <Tooltip tooltip={tooltip} />
      {rows.map((row, index) => {
        const value = Number(row.iad ?? 0);
        const width = Math.max(4, (value / max) * 100);
        return (
          <button
            className={`ranking-row ${selected.includes(row.name) ? 'selected' : ''}`}
            key={row.name}
            onClick={() => onPick(row.name)}
            onMouseMove={(event) => setTooltip({
              x: event.clientX + 14,
              y: event.clientY + 14,
              title: row.name,
              lines: [
                `${lang === 'pt' ? 'IAD' : 'DFI'}: ${formatValue(value)}`,
                `${lang === 'pt' ? 'Total' : 'Total'}: ${new Intl.NumberFormat(lang === 'pt' ? 'pt-BR' : 'en-US').format(row.total)}`,
                `${lang === 'pt' ? 'Posição' : 'Rank'}: #${row.rank ?? index + 1}`
              ]
            })}
          >
            <div className="ranking-meta">
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{row.name}</strong>
              <b>{formatValue(value)}</b>
            </div>
            <div className="bar-track ranking-track"><i style={{ width: `${width}%` }} /></div>
          </button>
        );
      })}
    </div>
  );
}

function ProblemBars({ rows, formatValue, lang }: { rows: MetricRow[]; formatValue: (value: number) => string; lang: Lang }) {
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const max = Math.max(...rows.map((row) => Number(row.total ?? 0)), 1);
  return (
    <div className="problem-bars chart-interactive" onMouseLeave={() => setTooltip(null)}>
      <Tooltip tooltip={tooltip} />
      {rows.map((row, index) => {
        const value = Number(row.total ?? 0);
        return (
          <div
            className="problem-row"
            key={row.name}
            onMouseMove={(event) => setTooltip({
              x: event.clientX + 14,
              y: event.clientY + 14,
              title: row.name,
              lines: [
                `${lang === 'pt' ? 'Registros' : 'Records'}: ${new Intl.NumberFormat(lang === 'pt' ? 'pt-BR' : 'en-US').format(value)}`,
                `${lang === 'pt' ? 'Resolução' : 'Resolution'}: ${row.resolutionRate === null || row.resolutionRate === undefined ? '-' : new Intl.NumberFormat(lang === 'pt' ? 'pt-BR' : 'en-US', { maximumFractionDigits: 1 }).format(row.resolutionRate * 100) + '%'}`
              ]
            })}
          >
            <div className="problem-meta">
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{row.name}</strong>
              <b>{formatValue(value)}</b>
            </div>
            <div className="bar-track problem-track"><i style={{ width: `${Math.max(4, (value / max) * 100)}%` }} /></div>
          </div>
        );
      })}
    </div>
  );
}

function MonthlyLine({ rows, formatValue, lang }: { rows: Array<{ month: string; total: number }>; formatValue: (value: number) => string; lang: Lang }) {
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const width = 640;
  const height = 320;
  const pad = { top: 24, right: 28, bottom: 44, left: 66 };
  const values = rows.map((row) => Number(row.total ?? 0));
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const spread = Math.max(maxValue - minValue, 1);
  const x = (index: number) => pad.left + (index * (width - pad.left - pad.right)) / Math.max(rows.length - 1, 1);
  const y = (value: number) => pad.top + (1 - ((value - minValue) / spread)) * (height - pad.top - pad.bottom);
  const points = rows.map((row, index) => `${x(index)},${y(row.total)}`).join(' ');
  const grid = [0, 0.25, 0.5, 0.75, 1].map((ratio) => pad.top + ratio * (height - pad.top - pad.bottom));
  return (
    <div className="svg-chart-wrap line-wrap" onMouseLeave={() => setTooltip(null)}>
      <Tooltip tooltip={tooltip} />
      <svg className="svg-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Monthly evolution">
        {grid.map((gy) => <line key={gy} x1={pad.left} x2={width - pad.right} y1={gy} y2={gy} className="chart-grid-line" />)}
        <polyline points={points} className="line-path" />
        {rows.map((row, index) => (
          <g key={row.month} onMouseMove={(event) => setTooltip({
            x: event.clientX + 14,
            y: event.clientY + 14,
            title: row.month,
            lines: [`${lang === 'pt' ? 'Reclamações' : 'Complaints'}: ${formatValue(row.total)}`]
          })}>
            <circle cx={x(index)} cy={y(row.total)} r={8} className="line-hit" />
            <circle cx={x(index)} cy={y(row.total)} r={5} className="line-dot" />
            <text x={x(index)} y={height - 14} textAnchor="middle" className="axis-label">{row.month}</text>
          </g>
        ))}
        <text x={pad.left} y={pad.top + 4} className="axis-value">{formatValue(maxValue)}</text>
        <text x={pad.left} y={height - pad.bottom} className="axis-value">{formatValue(minValue)}</text>
      </svg>
    </div>
  );
}

function QuadrantPlot({ rows, selected, onPick, lang, fmt }: { rows: MetricRow[]; selected: string[]; onPick: (name: string) => void; lang: Lang; fmt: ReturnType<typeof useFormat> }) {
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const width = 640;
  const height = 420;
  const pad = { top: 26, right: 28, bottom: 48, left: 58 };
  const totals = rows.map((row) => Number(row.total ?? 0));
  const maxTotal = Math.max(...totals, 1);
  const x = (value?: number | null) => pad.left + Number(value ?? 0) * (width - pad.left - pad.right);
  const y = (value?: number | null) => pad.top + (1 - ((Number(value ?? 1) - 1) / 4)) * (height - pad.top - pad.bottom);
  const r = (value?: number | null) => 6 + Math.sqrt(Number(value ?? 0) / maxTotal) * 17;
  const xTicks = [0, 0.25, 0.5, 0.75, 1];
  const yTicks = [1, 2, 3, 4, 5];
  const hasSelection = selected.length > 0;
  return (
    <div className="svg-chart-wrap quadrant-wrap" onMouseLeave={() => setTooltip(null)}>
      <Tooltip tooltip={tooltip} />
      <svg className="svg-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Experience quadrant">
        {xTicks.map((tick) => (
          <g key={`x-${tick}`}>
            <line x1={x(tick)} x2={x(tick)} y1={pad.top} y2={height - pad.bottom} className="chart-grid-line" />
            <text x={x(tick)} y={height - 16} textAnchor="middle" className="axis-label">{Math.round(tick * 100)}%</text>
          </g>
        ))}
        {yTicks.map((tick) => (
          <g key={`y-${tick}`}>
            <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} className="chart-grid-line" />
            <text x={pad.left - 10} y={y(tick) + 4} textAnchor="end" className="axis-label">{tick}</text>
          </g>
        ))}
        <text x={(width + pad.left - pad.right) / 2} y={height - 2} textAnchor="middle" className="axis-title">{lang === 'pt' ? 'Taxa de resolução' : 'Resolution rate'}</text>
        <text x="14" y={(height - pad.bottom + pad.top) / 2} textAnchor="middle" className="axis-title rotate">{lang === 'pt' ? 'Satisfação' : 'Satisfaction'}</text>
        {rows.map((row) => {
          const highlighted = selected.includes(row.name);
          const color = highlighted ? '#facc15' : row.iad && row.iad > 70 ? '#fb923c' : '#22d3ee';
          return (
            <circle
              key={row.name}
              cx={x(row.resolutionRate)}
              cy={y(row.avgSatisfaction)}
              r={r(row.total)}
              fill={color}
              opacity={highlighted ? 0.95 : hasSelection ? 0.25 : 0.72}
              stroke={highlighted ? '#fef3c7' : 'rgba(255,255,255,.25)'}
              strokeWidth={highlighted ? 3 : 1}
              className="clickable-dot"
              onClick={() => onPick(row.name)}
              onMouseMove={(event) => setTooltip({
                x: event.clientX + 14,
                y: event.clientY + 14,
                title: row.name,
                lines: [
                  `${lang === 'pt' ? 'Resolução' : 'Resolution'}: ${fmt.percent(row.resolutionRate)}`,
                  `${lang === 'pt' ? 'Satisfação' : 'Satisfaction'}: ${fmt.decimal(row.avgSatisfaction, 2)}`,
                  `${lang === 'pt' ? 'Total' : 'Total'}: ${fmt.number(row.total)}`,
                  `${lang === 'pt' ? 'IAD' : 'DFI'}: ${fmt.decimal(row.iad, 1)}`
                ]
              })}
            />
          );
        })}
      </svg>
    </div>
  );
}

function ChannelBars({ rows, total, fmt, lang }: { rows: MetricRow[]; total: number; fmt: ReturnType<typeof useFormat>; lang: Lang }) {
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  return (
    <div className="channel-list chart-interactive" onMouseLeave={() => setTooltip(null)}>
      <Tooltip tooltip={tooltip} />
      {rows.map((item) => {
        const share = total > 0 ? item.total / total : 0;
        return (
          <div
            className="channel-row"
            key={item.name}
            onMouseMove={(event) => setTooltip({
              x: event.clientX + 14,
              y: event.clientY + 14,
              title: item.name,
              lines: [
                `${lang === 'pt' ? 'Registros' : 'Records'}: ${fmt.number(item.total)}`,
                `${lang === 'pt' ? 'Participação' : 'Share'}: ${fmt.percent(share)}`
              ]
            })}
          >
            <div>
              <strong>{item.name}</strong>
              <span>{fmt.number(item.total)} {lang === 'pt' ? 'reclamações' : 'complaints'}</span>
            </div>
            <div className="bar-track"><i style={{ width: `${Math.max(5, share * 100)}%` }} /></div>
            <b>{fmt.percent(share)}</b>
          </div>
        );
      })}
    </div>
  );
}

function SectorBenchmark({ row, scopeMetric, fmt, c, lang }: { row: MetricRow; scopeMetric: MetricRow; fmt: ReturnType<typeof useFormat>; c: typeof copy.pt; lang: Lang }) {
  const resolutionDelta = Number(row.resolutionRate ?? 0) - Number(data.kpis.resolutionRate ?? 0);
  const satisfactionDelta = Number(row.avgSatisfaction ?? 0) - Number(data.kpis.avgSatisfaction ?? 0);
  const responseDelta = Number(row.avgResponseTime ?? 0) - Number(data.kpis.avgResponseTime ?? 0);
  const responseSignal = responseDelta <= 0 ? (lang === 'pt' ? 'melhor que a média' : 'better than average') : (lang === 'pt' ? 'pior que a média' : 'worse than average');
  return (
    <div className="benchmark-grid">
      <div className="benchmark-main">
        <span>{lang === 'pt' ? 'Setor selecionado' : 'Selected sector'}</span>
        <strong>{row.name}</strong>
        <small>{c.rank}: #{row.rank}</small>
      </div>
      <div className="benchmark-card"><span>{c.iad}</span><strong>{fmt.decimal(row.iad, 1)}</strong><small>{fmt.percent(scopeMetric.share)} {lang === 'pt' ? 'do total' : 'of total'}</small></div>
      <div className="benchmark-card"><span>{c.resolution}</span><strong>{fmt.percent(row.resolutionRate)}</strong><small>{resolutionDelta >= 0 ? '+' : ''}{fmt.decimal(resolutionDelta * 100, 1)} p.p. vs {c.generalAverage}</small></div>
      <div className="benchmark-card"><span>{c.satisfaction}</span><strong>{fmt.decimal(row.avgSatisfaction, 2)}</strong><small>{satisfactionDelta >= 0 ? '+' : ''}{fmt.decimal(satisfactionDelta, 2)} vs {c.generalAverage}</small></div>
      <div className="benchmark-card"><span>{c.responseTime}</span><strong>{fmt.decimal(row.avgResponseTime, 1)} {c.days}</strong><small>{fmt.decimal(Math.abs(responseDelta), 1)} {c.days} {responseSignal}</small></div>
    </div>
  );
}

function getGuidedReadings({ lang, fmt, c, selectedSegments, scopeLabel, scopeMetric, problemRows, rankingRows }: {
  lang: Lang;
  fmt: ReturnType<typeof useFormat>;
  c: typeof copy.pt;
  selectedSegments: string[];
  scopeLabel: string;
  scopeMetric: MetricRow;
  problemRows: MetricRow[];
  rankingRows: MetricRow[];
}) {
  const topFriction = rankingRows[0];
  const topProblem = problemRows[0];
  const scopeIntro = selectedSegments.length === 0
    ? (lang === 'pt' ? 'Na base geral' : 'In the overall base')
    : (lang === 'pt' ? `No recorte ${scopeLabel}` : `In the ${scopeLabel} cut`);

  if (lang === 'pt') {
    return [
      {
        tag: 'Estratégia',
        question: 'Uma experiência digital ruim custa só uma reclamação?',
        answer: `${scopeIntro}, foram analisadas ${fmt.number(scopeMetric.total)} reclamações. A reclamação é o registro visível do atrito, mas antes dela costuma existir tentativa de autoatendimento, espera, repetição de informação e perda de confiança. O dado público não mede todo o custo, mas mostra onde ele começa a aparecer.`,
        punchline: 'A reclamação é a fumaça. O incêndio operacional pode ter começado bem antes.'
      },
      {
        tag: 'Risco de leitura',
        question: 'Mais reclamações significam necessariamente pior experiência?',
        answer: 'Não necessariamente. Volume alto pode refletir base maior de clientes, maior adesão ao canal público ou maior uso digital. Por isso o projeto cruza volume com resolução, satisfação e tempo de resposta, em vez de transformar quantidade em julgamento automático.',
        punchline: 'O ponto não é apontar vilão. É identificar onde existe mais pressão operacional.'
      },
      {
        tag: 'CX',
        question: 'Resolver muito significa atender bem?',
        answer: `${scopeIntro}, a taxa de resolução é ${fmt.percent(scopeMetric.resolutionRate)} e a nota média é ${fmt.decimal(scopeMetric.avgSatisfaction, 2)}. Uma operação pode resolver casos e ainda assim deixar uma experiência desgastante se o caminho até a solução for longo, confuso ou repetitivo.`,
        punchline: 'Resolver depois de cansar o cliente é melhor do que não resolver, mas ainda não é uma boa experiência.'
      },
      {
        tag: 'Operações',
        question: 'Tempo de resposta é métrica de atendimento ou de confiança?',
        answer: `${scopeIntro}, o tempo médio de resposta é ${fmt.decimal(scopeMetric.avgResponseTime, 1)} dias. Esse número não fala só de eficiência. Ele comunica prioridade. Quando o cliente espera demais, a percepção pode ser de abandono, mesmo que a resposta chegue depois.`,
        punchline: 'No digital, silêncio também é mensagem.'
      },
      {
        tag: 'Automação',
        question: 'Onde a automação pode ajudar e onde pode só empurrar problema?',
        answer: 'A base pública não diz se cada jornada usou bot, FAQ, humano ou fluxo automatizado. Mesmo assim, combinações de alto volume, baixa resolução e baixa satisfação podem indicar que a jornada digital está distribuindo o atrito em mais etapas, e não necessariamente resolvendo a causa.',
        punchline: 'Automação boa reduz esforço. Automação ruim só troca a fila de lugar.'
      },
      {
        tag: 'COO',
        question: 'O que um COO deveria olhar primeiro nesse dashboard?',
        answer: `${topFriction ? `O primeiro sinal é ${topFriction.name}, com IAD ${fmt.decimal(topFriction.iad, 1)}. ` : ''}Eu olharia para combinações, não para ranking isolado. Volume alto, baixa resolução, nota baixa e resposta lenta juntos sugerem que o problema pode estar em processo, atendimento, produto ou comunicação.`,
        punchline: 'O dado fica mais útil quando deixa de ser ranking e vira fila de priorização.'
      },
      {
        tag: 'Atendimento',
        question: 'O que um Head de Atendimento pode tirar daqui?',
        answer: 'Satisfação não depende só de encerrar casos. Depende de reduzir esforço. Se o cliente precisa repetir informação, esperar demais ou procurar outro canal, parte do custo operacional já foi transferida para ele.',
        punchline: 'Atendimento eficiente não é só encerrar ticket. É evitar que o cliente precise virar gerente do próprio problema.'
      },
      {
        tag: 'Produto',
        question: 'O que um Head de Produto deveria observar?',
        answer: `${topProblem ? `O principal grupo de problema no recorte é ${topProblem.name}, com ${fmt.number(topProblem.total)} registros. ` : ''}Reclamação recorrente pode ser sintoma de produto, comunicação ou regra de negócio, não apenas de atendimento. O canal pode estar absorvendo uma falha que nasceu antes da conversa com o cliente.`,
        punchline: 'Quando o mesmo problema volta muitas vezes, o atendimento vira termômetro de produto.'
      },
      {
        tag: 'Metodologia',
        question: 'O Índice de Atrito Digital mede a verdade absoluta?',
        answer: 'Não. O IAD é uma proxy analítica. Ele combina volume, não resolução, satisfação e tempo de resposta para comparar sinais de atrito. Ele não substitui diagnóstico interno, base de clientes, receita, mix de canais ou dados proprietários.',
        punchline: 'O IAD serve para priorizar perguntas, não para encerrar a discussão.'
      },
      {
        tag: 'Pergunta-chave',
        question: 'Qual é a pergunta mais importante que os dados levantam?',
        answer: 'A pergunta não é apenas quem tem mais reclamações. A pergunta melhor é onde o digital está prometendo escala, mas ainda entregando esforço para o cliente.',
        punchline: 'Escala sem experiência vira só atrito em volume maior.'
      }
    ];
  }

  return [
    {
      tag: 'Strategy',
      question: 'Does a poor digital experience cost only one complaint?',
      answer: `${scopeIntro}, ${fmt.number(scopeMetric.total)} complaints were analyzed. A complaint is the visible record of friction, but before it there is often self-service effort, waiting time, repeated information and loss of trust. Public data does not measure the full cost, but it shows where that cost starts to appear.`,
      punchline: 'The complaint is the smoke. The operational fire may have started earlier.'
    },
    {
      tag: 'Reading risk',
      question: 'Do more complaints necessarily mean worse experience?',
      answer: 'Not necessarily. High volume may reflect a larger customer base, higher adoption of the public channel or broader digital usage. That is why the project combines volume with resolution, satisfaction and response time instead of turning quantity into automatic judgment.',
      punchline: 'The point is not to name a villain. It is to identify where operational pressure is higher.'
    },
    {
      tag: 'CX',
      question: 'Does solving many cases mean serving customers well?',
      answer: `${scopeIntro}, resolution rate is ${fmt.percent(scopeMetric.resolutionRate)} and the average score is ${fmt.decimal(scopeMetric.avgSatisfaction, 2)}. An operation may solve cases and still create a poor experience if the path to resolution is long, confusing or repetitive.`,
      punchline: 'Solving after exhausting the customer is better than not solving, but it is still not a good experience.'
    },
    {
      tag: 'Operations',
      question: 'Is response time a service metric or a trust metric?',
      answer: `${scopeIntro}, average response time is ${fmt.decimal(scopeMetric.avgResponseTime, 1)} days. This number is not only about efficiency. It communicates priority. When customers wait too long, the perceived message may be abandonment, even if the answer arrives later.`,
      punchline: 'In digital channels, silence is also a message.'
    },
    {
      tag: 'Automation',
      question: 'Where can automation help, and where can it just move the problem?',
      answer: 'The public dataset does not say whether each journey used a bot, FAQ, human support or automated flow. Even so, combinations of high volume, low resolution and low satisfaction may indicate that the digital journey is distributing friction across more steps instead of solving the root cause.',
      punchline: 'Good automation reduces effort. Bad automation just moves the queue.'
    },
    {
      tag: 'COO',
      question: 'What should a COO look at first in this dashboard?',
      answer: `${topFriction ? `The first signal is ${topFriction.name}, with DFI ${fmt.decimal(topFriction.iad, 1)}. ` : ''}I would look at combinations, not isolated rankings. High volume, low resolution, low score and slow response together suggest the issue may sit in process, service, product or communication.`,
      punchline: 'Data becomes more useful when it stops being a ranking and becomes a prioritization queue.'
    },
    {
      tag: 'Service',
      question: 'What can a Head of Customer Service learn from this?',
      answer: 'Satisfaction is not only about closing cases. It is about reducing effort. If customers need to repeat information, wait too long or seek another channel, part of the operational cost has already been transferred to them.',
      punchline: 'Efficient service is not just closing tickets. It is preventing customers from becoming managers of their own problem.'
    },
    {
      tag: 'Product',
      question: 'What should a Head of Product observe?',
      answer: `${topProblem ? `The main problem group in the selected cut is ${topProblem.name}, with ${fmt.number(topProblem.total)} records. ` : ''}Recurring complaints can be a symptom of product, communication or business rules, not only customer service. The channel may be absorbing a failure that began before the conversation with the customer.`,
      punchline: 'When the same problem returns many times, customer service becomes a product thermometer.'
    },
    {
      tag: 'Methodology',
      question: 'Does the Digital Friction Index measure absolute truth?',
      answer: 'No. The DFI is an analytical proxy. It combines volume, non-resolution, satisfaction and response time to compare friction signals. It does not replace internal diagnostics, customer base size, revenue, channel mix or proprietary operational data.',
      punchline: 'The DFI helps prioritize questions, not close the discussion.'
    },
    {
      tag: 'Key question',
      question: 'What is the most important question raised by the data?',
      answer: 'The question is not only who has more complaints. A better question is where digital channels are promising scale while still delivering effort to the customer.',
      punchline: 'Scale without experience is just friction at a higher volume.'
    }
  ];
}

export default App;
