"""Read-only verification of the special-character workbooks downloaded by the app."""
from pathlib import Path
import json
import zipfile
import openpyxl
import os

directory = Path(os.environ['REMEDIATION_TEST_OUTPUT']) if os.environ.get('REMEDIATION_TEST_OUTPUT') else Path(__file__).resolve().parents[2] / 'outputs/goldendb-remediation-20260906/b2b/evidence'
results = []
for module in ['business', 'reverse']:
    expected = json.loads((directory / f'{module}-sheets.json').read_text())
    source = directory / f'{module}-downloadExcelBtn.xlsx'
    workbook = openpyxl.load_workbook(source, data_only=False)
    differences, formulas, errors = [], [], []
    checked = 0
    for sheet in expected:
        ws = workbook[sheet['name']]
        for row_index, row in enumerate(sheet['rows'], 1):
            for column, value in enumerate(row, 1):
                cell = ws.cell(row_index, column)
                checked += 1
                if (cell.value if cell.value is not None else '') != (value if value is not None else ''):
                    differences.append([ws.title, cell.coordinate, value, cell.value])
        formulas.extend([ws.title, c.coordinate] for row in ws for c in row if c.data_type == 'f')
        errors.extend([ws.title, c.coordinate] for row in ws for c in row if c.data_type == 'e')
    with zipfile.ZipFile(source) as archive:
        zip_error = archive.testzip()
    results.append(dict(module=module, checkedCells=checked, differences=differences,
                        formulaCells=formulas, errorCells=errors, zipError=zip_error,
                        pass_=not differences and not formulas and not errors and zip_error is None))
(directory / 'b2b-excel-validation.json').write_text(json.dumps(results, ensure_ascii=False, indent=2))
print(json.dumps(results, ensure_ascii=False, indent=2))
raise SystemExit(0 if all(result['pass_'] for result in results) else 1)
