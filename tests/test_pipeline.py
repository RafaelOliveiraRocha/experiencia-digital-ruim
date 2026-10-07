"""Regressão das funções originais, sem executar ingestão ou escrever saídas."""
import ast
import json
from pathlib import Path
import unittest

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ast.parse((ROOT / 'scripts/build_dataset.py').read_text())
FUNCTIONS = [node for node in SOURCE.body if isinstance(node, ast.FunctionDef)
             and node.name in {'finalize_metrics', 'add_iad'}]
GLOBAL_ASSIGNMENTS = [node for node in SOURCE.body if isinstance(node, ast.Assign)
                      and any(isinstance(target, ast.Name) and target.id in
                              {'global_resolution', 'global_score', 'global_resp'}
                              for target in node.targets)]
NAMESPACE = {'np': np, 'pd': pd}
exec(compile(ast.Module(body=FUNCTIONS, type_ignores=[]), 'pipeline-functions', 'exec'), NAMESPACE)


def global_values(overall):
    namespace = {'overall': overall}
    exec(compile(ast.Module(body=GLOBAL_ASSIGNMENTS, type_ignores=[]),
                 'pipeline-global-values', 'exec'), namespace)
    return tuple(namespace[key] for key in ('global_resolution', 'global_score', 'global_resp'))


class PipelineRegression(unittest.TestCase):
    def test_global_fallbacks_and_real_denominators(self):
        self.assertEqual(global_values(dict(resolved=0, evaluated=0, score_sum=0,
                                           score_count=0, response_sum=0, response_count=0)),
                         (0.5, 3, 5))
        self.assertEqual(global_values(dict(resolved=1, evaluated=4, score_sum=8,
                                           score_count=4, response_sum=14, response_count=2)),
                         (0.25, 2, 7))

    def test_missing_metrics_receive_global_values(self):
        raw = pd.DataFrame([
            dict(total=300, evaluated=0, resolved=0, responded=0, score_sum=0,
                 score_count=0, response_sum=0, response_count=0),
            dict(total=600, evaluated=4, resolved=1, responded=600, score_sum=4,
                 score_count=4, response_sum=80, response_count=4),
        ])
        metrics = NAMESPACE['finalize_metrics'](raw)
        self.assertTrue(pd.isna(metrics.loc[0, 'resolutionRate']))
        result = NAMESPACE['add_iad'](metrics, 900, 0.5, 3, 5)
        self.assertEqual(result['iad'].tolist(), [27.5, 92.5])
        for field, expected in [('resolutionRateFilled', 0.5),
                                ('avgSatisfactionFilled', 3), ('avgResponseTimeFilled', 5)]:
            self.assertEqual(result.loc[0, field], expected)
        # A imputação serve aos componentes: a métrica original continua ausente.
        self.assertTrue(pd.isna(result.loc[0, 'resolutionRate']))
        result = NAMESPACE['add_iad'](metrics, 900, 0.25, 2, 7)
        self.assertEqual(result.loc[0, 'iad'], 41.2)
        self.assertEqual(result.loc[0, 'avgResponseTimeFilled'], 7)

    def test_delay_uses_p95_before_min_max(self):
        metrics = pd.DataFrame(dict(total=[300] * 3, resolutionRate=[1] * 3,
                                    avgSatisfaction=[5] * 3, avgResponseTime=[0, 10, 100]))
        result = NAMESPACE['add_iad'](metrics, 900, 0.5, 3, 5)
        self.assertAlmostEqual(result.loc[1, 'delayScore'], 10 / 91)
        self.assertEqual(result['iad'].tolist(), [0, 1.6, 15])
        self.assertEqual(result['volumeScore'].tolist(), [0, 0, 0])
        metrics['avgResponseTime'] = 5
        self.assertEqual(NAMESPACE['add_iad'](metrics, 900, 0.5, 3, 5)['delayScore'].tolist(),
                         [0, 0, 0])

    def test_all_historical_sector_indices(self):
        data = json.loads((ROOT / 'src/data/dashboardData.json').read_text())
        fields = {'scoreSum': 'score_sum', 'scoreCount': 'score_count',
                  'responseSum': 'response_sum', 'responseCount': 'response_count'}
        rows = [{fields.get(key, key): value for key, value in row.items()}
                for row in data['segments'].values()]
        metrics = NAMESPACE['finalize_metrics'](pd.DataFrame(rows))
        kpis = data['kpis']
        result = NAMESPACE['add_iad'](metrics, kpis['totalComplaints'], kpis['resolutionRate'],
                                      kpis['avgSatisfaction'], kpis['avgResponseTime'])
        self.assertEqual(len(result), 39)
        self.assertTrue((result['total'] >= 300).all())
        for _, row in result.iterrows():
            with self.subTest(sector=row['name']):
                self.assertEqual(row['iad'], data['segments'][row['name']]['iad'])
        self.assertEqual(data['segments']['Estabelecimentos de Ensino']['iad'], 70.4)


if __name__ == '__main__':
    unittest.main()
