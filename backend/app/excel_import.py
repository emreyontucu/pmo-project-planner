import datetime
import re
from typing import Dict, List, Optional, Set, Tuple

import pandas as pd

from .calendar_service import calendar_service
from .constants import TASK_PRIORITIES, TASK_STATUSES

# Turkish -> ASCII normalization so header matching survives casing/typo variance
# (İ handled explicitly because str.lower() turns it into "i̇", not "i")
_TR_MAP = str.maketrans({
    "ç": "c", "Ç": "c",
    "ğ": "g", "Ğ": "g",
    "ı": "i", "I": "i", "İ": "i",
    "ö": "o", "Ö": "o",
    "ş": "s", "Ş": "s",
    "ü": "u", "Ü": "u",
})

_PRIORITY_LOOKUP = {p.translate(_TR_MAP).lower(): p for p in TASK_PRIORITIES}
_STATUS_LOOKUP = {s.translate(_TR_MAP).lower(): s for s in TASK_STATUSES}


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", s.translate(_TR_MAP).lower()).strip()


# The only Excel shape the system accepts: a single "Görev Takip" sheet (aliases below),
# optionally alongside a pure lookup/reference sheet (e.g. a "Proje Aşaması" dropdown
# source tab) which is never mistaken for the task sheet. There is no project-info sheet —
# a project is always created manually first; Excel only ever supplies its task list via
# POST /projects/{id}/import.
TASK_SHEET_ALIASES = {"gorevler", "tasks", "task", "gorev", "gorev listesi", "gorev takip", "gorev takibi"}

# Matches the company's "Görev Takip" template: Proje Aşaması, Görev Adı, Sorumlu,
# Öncelik, Durum, Planlanan Başlangıç, Gerçekleşen Başlangıç, Planlanan Bitiş,
# Gerçekleşen Bitiş, Not. There is no dependency column — dependencies are added
# manually in the UI.
TASK_FIELDS: Dict[str, Set[str]] = {
    "task": {"gorev adi", "gorev", "task"},
    "phase": {"proje asamasi", "proje adimi", "asama", "faz"},
    "sorumlu": {"sorumlu"},
    "priority": {"oncelik", "priority"},
    "status": {"durum", "status"},
    "planned_start": {"planlanan baslangic", "baslangic tarihi"},
    "actual_start": {"gerceklesen baslangic"},
    "planned_end": {"planlanan bitis", "bitis tarihi"},
    "actual_end": {"gerceklesen bitis"},
    "note": {"not", "notlar", "aciklama"},
}


def _clean(value):
    if value is None:
        return None
    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass
    return value


def _to_str(value) -> Optional[str]:
    v = _clean(value)
    if v is None:
        return None
    s = str(v).strip()
    return s or None


def _to_date(value) -> Optional[datetime.date]:
    v = _clean(value)
    if v is None:
        return None
    if isinstance(v, datetime.datetime):
        return v.date()
    if isinstance(v, datetime.date):
        return v
    try:
        # dayfirst=True: cells typed as text in Turkish DD.MM.YYYY form (rather than a real
        # Excel date) are otherwise ambiguous when day<=12, e.g. "01.09.2026" silently
        # misparsing as 9 Jan instead of 1 Sep. Native datetime/date cells never hit this path.
        parsed = pd.to_datetime(v, dayfirst=True)
        if pd.isna(parsed):
            return None
        return parsed.date()
    except Exception:
        return None


def pick_sheet(sheets: Dict[str, pd.DataFrame], aliases: Set[str]) -> Optional[str]:
    for name in sheets:
        if _norm(str(name)) in aliases:
            return name
    return None


def _col_map(df: pd.DataFrame, fields: Dict[str, Set[str]]) -> Dict[str, str]:
    normalized_cols = {_norm(str(c)): c for c in df.columns}
    found: Dict[str, str] = {}
    for field, aliases in fields.items():
        for alias in aliases:
            if alias in normalized_cols:
                found[field] = normalized_cols[alias]
                break
    return found


def find_task_sheet(sheets: Dict[str, pd.DataFrame]) -> Optional[str]:
    """Finds the task sheet by name first, falling back to the first sheet that
    actually has a recognizable 'Görev Adı' column (skips pure lookup/reference
    sheets like a 'Proje Aşaması' dropdown-source tab)."""
    named = pick_sheet(sheets, TASK_SHEET_ALIASES)
    if named is not None:
        return named
    for name, df in sheets.items():
        if "task" in _col_map(df, TASK_FIELDS):
            return name
    return None


def parse_tasks_sheet(df: pd.DataFrame, exclude_bridge_days: bool = False) -> Tuple[List[dict], List[str]]:
    """Parses rows from the 'Görev Takip' template. Tolerant of missing dates; warns
    (doesn't block) on missing note, unrecognized Öncelik/Durum values, or fully empty rows.
    Duration is derived from Planlanan Başlangıç/Bitiş since the template has no Süre column.
    No dependency column exists here — dependencies are added manually via the UI."""
    warnings: List[str] = []
    colmap = _col_map(df, TASK_FIELDS)
    tasks: List[dict] = []

    for idx, row in df.iterrows():
        excel_row_no = int(idx) + 2  # header is row 1, data starts at row 2

        def get(field: str):
            col = colmap.get(field)
            return row[col] if col is not None else None

        name = _to_str(get("task"))
        phase = _to_str(get("phase"))
        sorumlu = _to_str(get("sorumlu"))
        priority_raw = _to_str(get("priority"))
        status_raw = _to_str(get("status"))
        planned_start = _to_date(get("planned_start"))
        actual_start = _to_date(get("actual_start"))
        planned_end = _to_date(get("planned_end"))
        actual_end = _to_date(get("actual_end"))
        note = _to_str(get("note"))

        if not any([name, phase, sorumlu, priority_raw, status_raw, planned_start, planned_end, note]):
            warnings.append(f"Satır {excel_row_no}: tamamen boş, atlandı.")
            continue

        if not name:
            warnings.append(f"Satır {excel_row_no}: Görev Adı boş olduğu için satır atlandı.")
            continue

        if not note:
            warnings.append(f"'{name}' için Not alanı boş.")

        priority = _PRIORITY_LOOKUP.get(_norm(priority_raw)) if priority_raw else None
        if priority_raw and priority is None:
            warnings.append(f"'{name}' için öncelik değeri ('{priority_raw}') tanınmadı, boş bırakıldı.")

        status = _STATUS_LOOKUP.get(_norm(status_raw)) if status_raw else None
        if status_raw and status is None:
            warnings.append(f"'{name}' için durum değeri ('{status_raw}') tanınmadı, 'Başlamadı' olarak ayarlandı.")

        duration = 1
        if planned_start and planned_end:
            duration = calendar_service.get_working_days_count(planned_start, planned_end, exclude_bridge_days) or 1

        tasks.append({
            "name": name,
            "description": note,
            "is_milestone": False,
            "sorumlu": sorumlu,
            "duration": duration,
            "start_date": planned_start,
            "end_date": planned_end,
            "actual_start_date": actual_start,
            "actual_end_date": actual_end,
            "phase": phase,
            "priority": priority,
            "status": status or "Başlamadı",
            "predecessor_names": [],
        })

    return tasks, warnings
