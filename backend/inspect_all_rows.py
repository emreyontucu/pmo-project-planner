import pandas as pd

excel_path = "/Users/emre/pmo-project-planner/frontend/public/Gorev_Takip_Sablonu.xlsx"
sheets = pd.read_excel(excel_path, sheet_name=None, engine="openpyxl")

for sheet_name, df in sheets.items():
    print(f"================ {sheet_name} ================")
    print("Shape:", df.shape)
    print("Columns:", list(df.columns))
    # print non-empty rows
    non_empty = df.dropna(how='all')
    print("Non-empty row count:", len(non_empty))
    print(non_empty.to_string())
