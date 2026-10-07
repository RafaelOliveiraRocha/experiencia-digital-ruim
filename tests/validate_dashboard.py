"""Regressão real da interface; execute com o servidor local e Playwright instalado."""
import argparse
import json
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / 'src/data/dashboardData.json').read_text())
EDUCATION = 'Estabelecimentos de Ensino'
SECOND = 'Empresas de Recuperação de Crédito'


def formatted(page, value, kind='decimal', digits=1, lang='pt'):
    return page.evaluate('''({value, kind, digits, lang}) => {
      const locale = lang === 'pt' ? 'pt-BR' : 'en-US';
      const options = kind === 'number' ? {} : kind === 'percent'
        ? {maximumFractionDigits: 1}
        : {minimumFractionDigits: digits, maximumFractionDigits: digits};
      return new Intl.NumberFormat(locale, options).format(
        kind === 'percent' ? value * 100 : value) + (kind === 'percent' ? '%' : '');
    }''', dict(value=value, kind=kind, digits=digits, lang=lang))


def navigate(page, name):
    menu = page.get_by_role('button', name='Menu', exact=True)
    if menu.is_visible() and menu.get_attribute('aria-expanded') == 'false':
        menu.click()
    page.locator('nav').get_by_role('button', name=name, exact=True).click()


def select(page, names):
    # O seletor é mantido aberto durante a regressão dos 39 setores.
    if not page.locator('.sector-picker').count():
        page.locator('.filter-toggle').click()
    page.locator('.sector-picker input[type="text"], .sector-picker input:not([type])').fill('')
    clear = page.locator('.filter-actions .ghost-button')
    if clear.count():
        clear.click()
    for name in names:
        page.get_by_role('checkbox', name=name, exact=True).check()


def assert_indices(page, names, lang='pt'):
    expected = {name: formatted(page, DATA['segments'][name]['iad'], lang=lang) for name in names}
    expect(page.locator('.summary-iad .iad-item')).to_have_count(len(names))
    actual = {item.locator('small').inner_text(): item.locator('strong').inner_text()
              for item in page.locator('.summary-iad .iad-item').all()}
    assert actual == expected, (actual, expected)
    return expected


def assert_layout(page):
    # Mede o topo real, sem depender de window.scrollY (a rolagem pode ser do body).
    expect(page.locator('main h1')).to_be_visible()
    page.locator('.topbar').scroll_into_view_if_needed()
    header = page.locator('.topbar').bounding_box()
    title = page.locator('main h1').bounding_box()
    assert header and title and title['y'] >= header['y'] + header['height'], (header, title)
    assert title['y'] >= 0
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    return dict(header=header, title=title, viewport=page.viewport_size)


def assert_aggregation(page, names):
    rows = [DATA['segments'][name] for name in names]
    sums = {key: sum(row[key] for row in rows) for key in
            ['total', 'evaluated', 'resolved', 'responded', 'scoreSum', 'scoreCount',
             'responseSum', 'responseCount']}
    expected = [formatted(page, sums['total'], 'number'),
                formatted(page, sums['resolved'] / sums['evaluated'], 'percent'),
                formatted(page, sums['scoreSum'] / sums['scoreCount'], digits=2),
                formatted(page, sums['responseSum'] / sums['responseCount']) + ' dias',
                formatted(page, sums['responded'] / sums['total'], 'percent'),
                formatted(page, sums['total'] / DATA['kpis']['totalComplaints'], 'percent')]
    expect(page.locator('.kpi-card strong')).to_have_text(expected)
    expect(page.locator('svg[aria-label="Monthly evolution"] .line-dot')).to_have_count(4)
    expect(page.locator('.summary-iad .iad-note')).to_contain_text('não há IAD combinado')
    expect(page.locator('.benchmark-grid')).to_have_count(0)
    return dict(numerators=sums, displayed=expected)


def save_capture(page, path):
    destination = Path(path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(destination), full_page=True, animations='disabled')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='http://localhost:3000/experiencia-digital-ruim/')
    parser.add_argument('--browser-executable')
    parser.add_argument('--no-sandbox', action='store_true')
    parser.add_argument('--capture')
    parser.add_argument('--mobile-capture')
    parser.add_argument('--report')
    args = parser.parse_args()
    report = {}
    errors = []
    with sync_playwright() as playwright:
        launch = dict(headless=True, args=['--disable-dev-shm-usage'])
        if args.browser_executable:
            launch['executable_path'] = args.browser_executable
        if args.no_sandbox:
            launch['args'].append('--no-sandbox')
        browser = playwright.chromium.launch(**launch)
        desktop = browser.new_context(viewport=dict(width=1440, height=1100))
        page = desktop.new_page()
        page.set_default_timeout(8000)
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(args.url, wait_until='domcontentloaded')
        report['desktop_overview_layout'] = assert_layout(page)
        expect(page.locator('.hero-panel .panel-label')).to_have_text('Maior IAD entre setores')
        navigate(page, 'Explorar dados')
        report['desktop_dashboard_layout'] = assert_layout(page)
        expect(page.locator('.summary-iad > span')).to_have_text('Maior IAD entre setores')
        highest = DATA['insights']['highestFriction']['segment']
        assert DATA['segments'][highest]['iad'] == 78.2
        assert_indices(page, [highest])
        # Todos os 39 aparecem no ranking quando selecionados, inclusive fora do top 20.
        names = list(DATA['segments'])
        select(page, names)
        expected = assert_indices(page, names)
        expect(page.locator('.ranking-row')).to_have_count(39)
        ranking = {row.locator('.ranking-meta strong').inner_text():
                   row.locator('.ranking-meta b').inner_text()
                   for row in page.locator('.ranking-row').all()}
        assert ranking == expected
        report['all_selectable_sectors'] = assert_aggregation(page, names)
        expect(page.locator('.kpi-card strong').first).to_have_text('1.379.792')
        for index, name in enumerate(names, 1):
            select(page, [name])
            assert_indices(page, [name])
            expect(page.locator('.benchmark-card').first.locator('strong')).to_have_text(expected[name])
            if index % 10 == 0 or index == len(names):
                print(f'IAD resumo/ranking/benchmark: {index}/39 setores conferidos', flush=True)
        report['sector_indices_checked'] = len(names)
        select(page, [EDUCATION])
        expect(page.locator('.summary-iad .iad-item strong')).to_have_text('70,4')
        select(page, [EDUCATION, SECOND])
        assert_indices(page, [EDUCATION, SECOND])
        report['multiple_selection'] = assert_aggregation(page, [EDUCATION, SECOND])
        search = page.locator('.sector-picker input:not([type])')
        search.fill('ensino')
        expect(page.get_by_role('checkbox')).to_have_count(1)
        expect(page.get_by_role('checkbox', name=EDUCATION, exact=True)).to_be_checked()
        page.locator('.filter-actions .ghost-button').click()
        expect(page.locator('.kpi-card strong').first).to_have_text('1.380.388')
        assert_indices(page, [highest])
        # Ranking e quadrante continuam permitindo selecionar setores.
        page.locator('.ranking-row').first.click()
        assert_indices(page, [highest])
        page.locator('.filter-actions .ghost-button').click()
        circle = page.locator('svg[aria-label="Experience quadrant"] circle').first
        circle.click(force=True)
        expect(page.locator('.summary-iad > span')).to_have_text('IAD do setor')
        select(page, [EDUCATION])
        page.get_by_role('button', name='EN', exact=True).click()
        expect(page.locator('h1')).to_have_text('Explore data')
        expect(page.locator('.summary-iad > span')).to_have_text('Sector DFI')
        assert_indices(page, [EDUCATION], 'en')
        expect(page.locator('.benchmark-card').first.locator('strong')).to_have_text('70.4')
        select(page, [EDUCATION, SECOND])
        assert_indices(page, [EDUCATION, SECOND], 'en')
        expect(page.locator('.iad-note')).to_have_text('Individual indices; no combined DFI.')
        page.locator('.filter-actions .ghost-button').click()
        expect(page.locator('.summary-iad > span')).to_have_text('Highest DFI among sectors')
        assert_indices(page, [highest], 'en')
        navigate(page, 'Executive readings')
        expect(page.locator('.reading-question')).to_have_count(10)
        page.locator('.reading-question').nth(1).click()
        expect(page.locator('.reading-question').nth(1)).to_have_attribute('aria-expanded', 'true')
        navigate(page, 'Methodology')
        expect(page.locator('.formula-grid .weight-card strong')).to_have_text(['30%', '30%', '25%', '15%'])
        page.get_by_role('button', name='PT-BR', exact=True).click()
        navigate(page, 'Visão geral')
        expect(page.locator('h1')).to_contain_text('experiência digital ruim')
        report['search_clear_languages_navigation'] = 'passed'
        # Página nova para registrar o topo, evitando a rolagem acumulada dos testes.
        capture_page = desktop.new_page()
        capture_page.on('pageerror', lambda error: errors.append(str(error)))
        capture_page.goto(args.url, wait_until='domcontentloaded')
        navigate(capture_page, 'Explorar dados')
        select(capture_page, [EDUCATION])
        capture_page.locator('.filter-toggle').click()
        report['desktop_capture_layout'] = assert_layout(capture_page)
        assert_indices(capture_page, [EDUCATION])
        if args.capture:
            save_capture(capture_page, args.capture)
        for width in [390, 320]:
            mobile = browser.new_context(viewport=dict(width=width, height=844), is_mobile=True,
                                         device_scale_factor=1)
            mobile_page = mobile.new_page()
            mobile_page.on('pageerror', lambda error: errors.append(str(error)))
            mobile_page.goto(args.url, wait_until='domcontentloaded')
            report[f'mobile_{width}_overview_layout'] = assert_layout(mobile_page)
            navigate(mobile_page, 'Explorar dados')
            select(mobile_page, [EDUCATION, SECOND])
            assert_indices(mobile_page, [EDUCATION, SECOND])
            assert_aggregation(mobile_page, [EDUCATION, SECOND])
            mobile_page.locator('.filter-toggle').click()
            report[f'mobile_{width}_dashboard_layout'] = assert_layout(mobile_page)
            if width == 390 and args.mobile_capture:
                save_capture(mobile_page, args.mobile_capture)
            mobile_page.get_by_role('button', name='EN', exact=True).click()
            navigate(mobile_page, 'Methodology')
            expect(mobile_page.locator('h1')).to_have_text('Methodology')
            mobile_page.get_by_role('button', name='PT-BR', exact=True).click()
            navigate(mobile_page, 'Explorar dados')
            mobile_page.locator('.filter-actions .ghost-button').click()
            assert_indices(mobile_page, [highest])
            mobile.close()
        assert not errors, errors
        report['javascript_errors'] = errors
        browser.close()
    if args.report:
        Path(args.report).write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n')
    print('PASS: 39 setores, agregações, filtros, idiomas, navegação e desktop/mobile.', flush=True)


if __name__ == '__main__':
    main()
