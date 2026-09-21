import datetime
import re
from typing import Dict, List, Optional, Set, Tuple

import pandas as pd

from .calendar_service import calendar_service
from .constants import TASK_PRIORITIES, TASK_STATUSES, PROJECT_PHASES

# Turkish -> ASCII normalization so header matching survives casing/typo variance
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


TASK_SHEET_ALIASES = {"gorevler", "tasks", "task", "gorev", "gorev listesi", "gorev takip", "gorev takibi"}

TASK_FIELDS: Dict[str, Set[str]] = {
    "task": {
        "gorev adi", "gorev", "task", "gorev adı", "gorev_adi", "görev", "görev adı", 
        "görevadı", "gorevadi", "görev_adı", "gorev tanimi", "görev tanımı", "is", "is adi", "iş adı"
    },
    "phase": {
        "proje asamasi", "proje adimi", "asama", "faz", "proje aşaması", "proje_asamasi", 
        "proje_aşama", "proje asama", "aşama", "proje fazi", "proje fazı", "faz adi", "faz adı", "wbs"
    },
    "sorumlu": {
        "sorumlu", "assignee", "owner", "sorumlu kisi", "sorumlusu", "sorumlu kişi", "kaynak", "atanan"
    },
    "priority": {
        "oncelik", "priority", "ozellik", "öncelik", "özellik", "oncelik derecesi", "öncelik derecesi"
    },
    "status": {
        "durum", "status", "gorev durumu", "görev durumu", "durumu", "statü", "statu"
    },
    "planned_start": {
        "planlanan baslangic", "baslangic tarihi", "planlanan baslangic tarihi", 
        "planlanan başlangıç tarihi", "planlanan başlangıç", "plananlanan baslangic tarihi", 
        "plananlanan başlangıç tarihi", "plananlanan baslangic", "plananlanan başlangıç",
        "baslangic", "başlangıç", "planlanan başlama"
    },
    "actual_start": {
        "gerceklesen baslangic", "gerceklesen baslangic tarihi", "gerçekleşen başlangıç tarihi", 
        "gerçekleşen başlangıç", "gerçekleşen başlaganic", "gerceklesen baslaganic", 
        "gerçekleşen başlaganıç", "gerçekleşen başlangiç", "gerceklesen baslangic", "gerceklesen", "gerçekleşen", "fiili baslangic"
    },
    "planned_end": {
        "planlanan bitis", "bitis tarihi", "planlanan bitis tarihi", "planlanan bitiş tarihi", 
        "planlanan bitiş", "planlanan bitişş tarihi", "planlanan bitiss tarihi", 
        "planlanan bitisş tarihi", "planlanan bitişş", "bitis", "bitiş", "planlanan bitirme"
    },
    "actual_end": {
        "gerceklesen bitis", "gerceklesen bitis tarihi", "gerçekleşen bitiş tarihi", 
        "gerçekleşen bitiş", "gerçekleşen bitişş tarihi", "gerceklesen bitiss tarihi", 
        "gerçekleşen bitişş", "gerceklesen bitis", "fiili bitis"
    },
    "note": {
        "not", "notlar", "aciklama", "açıklama", "detay", "yorum"
    },
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
        v_str = str(v).strip()
        # Handle string formats e.g. 07.09.26, 07/09/26, 07.09.2026, 07/09/2026
        m2 = re.match(r"^(\d{1,2})[./\-](\d{1,2})[./\-](\d{2})$", v_str)
        if m2:
            day, month, year_2d = int(m2.group(1)), int(m2.group(2)), int(m2.group(3))
            full_year = 2000 + year_2d if year_2d < 70 else 1900 + year_2d
            return datetime.date(full_year, month, day)

        parsed = pd.to_datetime(v_str, dayfirst=True)
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
    if not sheets:
        return None
    if len(sheets) == 1:
        return list(sheets.keys())[0]

    named = pick_sheet(sheets, TASK_SHEET_ALIASES)
    if named is not None:
        return named

    best_sheet = None
    max_matches = 0
    for name, df in sheets.items():
        colmap = _col_map(df, TASK_FIELDS)
        if "task" in colmap:
            matches = len(colmap)
            if matches > max_matches:
                max_matches = matches
                best_sheet = name
    return best_sheet


def _normalize_phase(phase_str: Optional[str]) -> Optional[str]:
    if not phase_str:
        return None
    phase_clean = phase_str.strip()
    match = re.match(r"^[sS]([1-5])", phase_clean)
    if match:
        code = f"S{match.group(1)}"
        for c, label in PROJECT_PHASES:
            if c == code:
                return f"{c} - {label}"
    return phase_clean


def _phase_sort_key(task: dict) -> Tuple[int, str]:
    phase_str = task.get("phase") or ""
    match = re.match(r"^[sS]([1-5])", phase_str.strip())
    if match:
        return (int(match.group(1)), task.get("name") or "")
    return (99, task.get("name") or "")


def parse_tasks_sheet(df: pd.DataFrame, exclude_bridge_days: bool = False) -> Tuple[List[dict], List[str]]:
    warnings: List[str] = []
    colmap = _col_map(df, TASK_FIELDS)
    tasks: List[dict] = []

    # Filter out template instruction rows if present
    instruction_keywords = {"serbest metin", "acilir liste", "veri turu", "kural / aciklama", "sayi — otomatik", "yuzde (0% - 100%)"}

    for idx, row in df.iterrows():
        excel_row_no = int(idx) + 2  # header is row 1, data starts at row 2

        def get(field: str):
            col = colmap.get(field)
            return row[col] if col is not None else None

        name = _to_str(get("task"))
        phase_raw = _to_str(get("phase"))
        sorumlu = _to_str(get("sorumlu"))
        priority_raw = _to_str(get("priority"))
        status_raw = _to_str(get("status"))
        planned_start = _to_date(get("planned_start"))
        actual_start = _to_date(get("actual_start"))
        planned_end = _to_date(get("planned_end"))
        actual_end = _to_date(get("actual_end"))
        note = _to_str(get("note"))

        if not any([name, phase_raw, sorumlu, priority_raw, status_raw, planned_start, planned_end, actual_start, actual_end, note]):
            continue

        if not name:
            continue

        # Ignore template guide rows
        if _norm(name) in instruction_keywords or (_norm(phase_raw or "") in instruction_keywords):
            continue

        # Normalize phase string
        phase = _normalize_phase(phase_raw)

        priority = _PRIORITY_LOOKUP.get(_norm(priority_raw)) if priority_raw else None
        if priority_raw and priority is None:
            warnings.append(f"'{name}' için öncelik değeri ('{priority_raw}') tanınmadı, boş bırakıldı.")

        status = _STATUS_LOOKUP.get(_norm(status_raw)) if status_raw else None
        if status_raw and status is None:
            warnings.append(f"'{name}' için durum değeri ('{status_raw}') tanınmadı, 'Başlamadı' olarak ayarlandı.")

        # 1. Completed tasks should have an actual end date
        resolved_status = status or "Başlamadı"
        if resolved_status == "Tamamlandı" and not actual_end:
            warnings.append(
                f"Satır {excel_row_no}: '{name}' görevinin durumu 'Tamamlandı' ama 'Gerçekleşen Bitiş' tarihi girilmemiş."
            )

        # 2. Planned/Actual dates landing on a weekend or public holiday are flagged
        for date_val, label in [
            (planned_start, "Planlanan Başlangıç"),
            (actual_start, "Gerçekleşen Başlangıç"),
            (planned_end, "Planlanan Bitiş"),
            (actual_end, "Gerçekleşen Bitiş"),
        ]:
            if date_val:
                if calendar_service.is_weekend(date_val) or calendar_service.is_public_holiday(date_val):
                    holiday_name = calendar_service.get_holiday_name(date_val)
                    warnings.append(
                        f"Satır {excel_row_no}: '{name}' görevinin {label} tarihi ({date_val.strftime('%d.%m.%Y')}) resmî tatile veya hafta sonuna denk geliyor ({holiday_name or 'Hafta Sonu'})."
                    )

        # 3. Warnings: Check for bridge days
        for date_val, label in [
            (planned_start, "Planlanan Başlangıç"),
            (actual_start, "Gerçekleşen Başlangıç"),
            (planned_end, "Planlanan Bitiş"),
            (actual_end, "Gerçekleşen Bitiş"),
        ]:
            if date_val and calendar_service.is_bridge_day(date_val):
                warnings.append(
                    f"Satır {excel_row_no}: '{name}' görevinin {label} tarihi ({date_val.strftime('%d.%m.%Y')}) köprü gününe denk gelmektedir."
                )

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
            "status": resolved_status,
            "predecessor_names": [],
        })

    # Sort tasks by phase hierarchy (S1 -> S2 -> S3 -> S4 -> S5)
    tasks.sort(key=_phase_sort_key)

    return tasks, warnings
