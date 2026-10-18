"""Compare every actual exported cell with the application's sheet model."""
import json
import os
from pathlib import Path
import re
import xml.etree.ElementTree as ET
import zipfile

directory = Path(os.environ.get('REMEDIATION_TEST_OUTPUT', 'outputs/goldendb-cn-options-20261018'))
expected = json.loads((directory / 'sheets.json').read_text())
ns = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
checked = 0
differences = []
with zipfile.ZipFile(directory / 'planning.xlsx') as archive:
    assert archive.testzip() is None
    for name in archive.namelist():
        if name.endswith(('.xml', '.rels')):
            ET.fromstring(archive.read(name))
    for index, sheet in enumerate(expected, 1):
        root = ET.fromstring(archive.read(f'xl/worksheets/sheet{index}.xml'))
        actual = {}
        for cell in root.findall('.//m:sheetData/m:row/m:c', ns):
            assert cell.find('m:f', ns) is None
            assert cell.attrib.get('t') != 'e'
            if cell.attrib.get('t') == 'inlineStr':
                value = ''.join(e.text or '' for e in cell.findall('.//m:t', ns))
                value = re.sub(r'_x([0-9a-fA-F]{4})_', lambda m: chr(int(m[1], 16)), value)
            else:
                node = cell.find('m:v', ns)
                value = float(node.text) if node is not None else ''
            actual[cell.attrib['r']] = value
        for row_index, row in enumerate(sheet['rows'], 1):
            for column, value in enumerate(row, 1):
                letters = ''
                while column:
                    column, rem = divmod(column - 1, 26)
                    letters = chr(65 + rem) + letters
                address = letters + str(row_index)
                checked += 1
                if actual.get(address, '') != (value if value is not None else ''):
                    differences.append([sheet['name'], address, value, actual.get(address)])
report = {'checkedCells': checked, 'differences': differences, 'pass': not differences}
(directory / 'excel-validation.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
print(json.dumps(report, ensure_ascii=False))
raise SystemExit(0 if not differences else 1)
