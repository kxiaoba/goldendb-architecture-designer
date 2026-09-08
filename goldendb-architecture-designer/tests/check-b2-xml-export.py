"""Read actual app downloads, parse all XML, and decode ST_Xstring once."""
from pathlib import Path
import os
import json
import re
import zipfile
import xml.etree.ElementTree as ET
import openpyxl

root = Path(__file__).resolve().parents[2]
directory = Path(os.environ.get('REMEDIATION_TEST_OUTPUT', str(root / 'outputs/goldendb-remediation-20260906/b2d/evidence/xml')))
ns = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
results = []
for key, filename in [('business', 'business-downloadExcelBtn.xlsx'), ('reverse', 'reverse-downloadExcelBtn.xlsx'), ('boundary', 'goldendb-b2d-character-boundary.xlsx')]:
    expected = json.loads((directory / f'{key}-sheets.json').read_text())
    differences, formulas, invalid_xml = [], [], []
    checked = 0
    with zipfile.ZipFile(directory / filename) as archive:
        zip_error = archive.testzip()
        for entry in archive.namelist():
            if entry.endswith(('.xml', '.rels')):
                try:
                    ET.fromstring(archive.read(entry))
                except ET.ParseError as error:
                    invalid_xml.append([entry, str(error)])
        for index, sheet in enumerate(expected, 1):
            document = ET.fromstring(archive.read(f'xl/worksheets/sheet{index}.xml'))
            values = {}
            for cell in document.findall('.//m:sheetData/m:row/m:c', ns):
                if cell.find('m:f', ns) is not None:
                    formulas.append([sheet['name'], cell.attrib['r']])
                if cell.attrib.get('t') == 'inlineStr':
                    text = ''.join(node.text or '' for node in cell.findall('.//m:t', ns))
                    # Nonrecursive decoding is important: escaped literal _x0041_
                    # must stay literal rather than become A in a second pass.
                    values[cell.attrib['r']] = re.sub(r'_x([0-9a-fA-F]{4})_', lambda match: chr(int(match[1], 16)), text)
                else:
                    node = cell.find('m:v', ns)
                    values[cell.attrib['r']] = float(node.text) if node is not None else ''
            for row_index, row in enumerate(sheet['rows'], 1):
                for column, value in enumerate(row, 1):
                    coordinate = openpyxl.utils.get_column_letter(column) + str(row_index)
                    checked += 1
                    actual = values.get(coordinate, '')
                    if actual != (value if value is not None else ''):
                        differences.append([sheet['name'], coordinate, value, actual])
    # Independent reader also checks workbook structure. Its inline-string API
    # does not decode ST_Xstring, so it is not the semantic equality oracle.
    workbook = openpyxl.load_workbook(directory / filename, data_only=False)
    errors = [[ws.title, cell.coordinate] for ws in workbook for row in ws for cell in row if cell.data_type == 'e']
    results.append(dict(file=filename, checkedCells=checked, differences=differences, formulas=formulas,
                        invalidXml=invalid_xml, errorCells=errors, zipError=zip_error,
                        pass_=not differences and not formulas and not invalid_xml and not errors and zip_error is None))
(directory / 'xml-workbook-validation.json').write_text(json.dumps(results, ensure_ascii=False, indent=2))
print(json.dumps(results, ensure_ascii=False, indent=2))
raise SystemExit(0 if all(item['pass_'] for item in results) else 1)
