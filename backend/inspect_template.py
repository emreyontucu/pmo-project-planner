import pandas as pd
from app.excel_import import find_task_sheet, parse_tasks_sheet

excel_path = "/Users/emre/pmo-project-planner/frontend/public/Gorev_Takip_Sablonu.xlsx"
sheets = pd.read_excel(excel_path, sheet_name=None, engine="openpyxl")

print("Sheet names:", list(sheets.keys()))
for name, df in sheets.items():
    print(f"\n--- Sheet: {name} ---")
    print("Columns:", list(df.columns))
    print("Head:\n", df.head(3))

selected_sheet = find_task_sheet(sheets)
print(f"\nSelected task sheet: {selected_sheet}")
if selected_sheet:
    tasks, warnings = parse_tasks_sheet(sheets[selected_sheet])
    print(f"Parsed tasks count: {len(tasks)}")
    print(f"Warnings ({len(warnings)}):", warnings)
    if tasks:
        print("First task:", tasks[0])
