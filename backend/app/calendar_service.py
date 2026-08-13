import datetime
from typing import Dict, Set, List
import holidays
 # “ Cache kullanıyorum çünkü amacım 
 # Bana verilen yılın Türkiye resmî tatillerini getir; 
 # daha önce getirdiysem yeniden oluşturma, hafızada tuttuğum eski sonucu kullan.”

class CalendarService:
    def __init__(self):
        # Cache for holidays per year to avoid repeated instantiations
        self._holidays_cache: Dict[int, holidays.HolidayBase] = {}

    def _get_tr_holidays(self, year: int) -> holidays.HolidayBase:
        if year not in self._holidays_cache:
            self._holidays_cache[year] = holidays.Turkey(years=[year])
        return self._holidays_cache[year]

    def is_weekend(self, date: datetime.date) -> bool:
        # 5 is Saturday, 6 is Sunday
        return date.weekday() in (5, 6)

    def is_public_holiday(self, date: datetime.date) -> bool:
        tr_holidays = self._get_tr_holidays(date.year)
        return date in tr_holidays

    def get_holiday_name(self, date: datetime.date) -> str:
        if self.is_weekend(date):
            return "Hafta Sonu"
        tr_holidays = self._get_tr_holidays(date.year)
        return tr_holidays.get(date, "")

    def is_bridge_day(self, date: datetime.date) -> bool:
        """
        A date is a bridge day if it is a working day (not weekend and not public holiday)
        and lies exactly between a weekend and a public holiday.
        """
        # If it's already a weekend or public holiday, it's not a bridge day
        if self.is_weekend(date) or self.is_public_holiday(date):
            return False

        day_before = date - datetime.timedelta(days=1)
        day_after = date + datetime.timedelta(days=1)

        # Check if one side is weekend and the other side is public holiday
        before_is_weekend = self.is_weekend(day_before)
        before_is_holiday = self.is_public_holiday(day_before)
        after_is_weekend = self.is_weekend(day_after)
        after_is_holiday = self.is_public_holiday(day_after)

        case1 = before_is_weekend and after_is_holiday
        case2 = before_is_holiday and after_is_weekend

        return case1 or case2

    def is_working_day(self, date: datetime.date, exclude_bridge_days: bool = False) -> bool:
        """
        A day is a working day if it is not a weekend, not a public holiday,
        and optionally not a bridge day.
        """
        if self.is_weekend(date) or self.is_public_holiday(date):
            return False
        if exclude_bridge_days and self.is_bridge_day(date):
            return False
        return True

    def add_working_days(self, start_date: datetime.date, days: int, exclude_bridge_days: bool = False) -> datetime.date:
        """
        Adds a given number of working days to start_date.
        If days is 0, returns the start_date itself (or the next working day if it falls on a non-working day).
        If days > 0, returns the end date such that there are exactly 'days' working days from start_date to end_date.
        For example: add_working_days(Monday, 5) -> Friday.
        """
        current_date = start_date
        
        # If starting on a non-working day, roll forward to the first working day
        while not self.is_working_day(current_date, exclude_bridge_days):
            current_date += datetime.timedelta(days=1)
            
        if days <= 1:
            return current_date

        remaining_days = days - 1
        while remaining_days > 0:
            current_date += datetime.timedelta(days=1)
            if self.is_working_day(current_date, exclude_bridge_days): # sadece iş günleri ise sayacı azalt haftasonları veya köprü günlerse sayacı azaltma
                remaining_days -= 1
                
        return current_date

    def get_working_days_count(self, start_date: datetime.date, end_date: datetime.date, exclude_bridge_days: bool = False) -> int:
        """
        Calculates the number of working days between start_date and end_date (inclusive).
        """
        if start_date > end_date:
            return 0
            
        count = 0
        current_date = start_date
        while current_date <= end_date:
            if self.is_working_day(current_date, exclude_bridge_days):
                count += 1
            current_date += datetime.timedelta(days=1)
        return count

    def get_calendar_details(self, start_date: datetime.date, end_date: datetime.date) -> List[Dict]:
        """
        Returns a list of dicts detailing each day in the range [start_date, end_date].
        Used to display the timeline/calendar details in the frontend.
        """
        details = []
        current_date = start_date
        while current_date <= end_date:
            is_wknd = self.is_weekend(current_date)
            is_pub_hol = self.is_public_holiday(current_date)
            is_brg = self.is_bridge_day(current_date)
            
            day_type = "WORK"
            if is_wknd:
                day_type = "WEEKEND"
            elif is_pub_hol:
                day_type = "HOLIDAY"
            elif is_brg:
                day_type = "BRIDGE"
                
            details.append({
                "date": current_date.isoformat(),
                "day_type": day_type,
                "name": self.get_holiday_name(current_date) if (is_pub_hol or is_wknd) else ("Potansiyel Köprü Günü" if is_brg else "İş Günü"),
                "warning": "Bu tarih hafta sonu ile resmi tatil arasında kalan tek iş günü olduğu için şirket tarafından köprü günü olarak değerlendirilebilir." if is_brg else None
            })
            current_date += datetime.timedelta(days=1)
        return details

    def validate_start_date(self, date: datetime.date) -> Dict:
        """
        Validates that a start date is a valid working day.
        Returns a dict indicating validity, error messages, and warnings for bridge days.
        """
        if self.is_weekend(date):
            return {
                "valid": False,
                "error": "Başlangıç tarihi bir iş günü olmalıdır.",
                "warning": None
            }
        if self.is_public_holiday(date):
            holiday_name = self.get_holiday_name(date)
            return {
                "valid": False,
                "error": f"Başlangıç tarihi bir iş günü olmalıdır (Seçilen tarih: {holiday_name}).",
                "warning": None
            }
            
        warning = None
        if self.is_bridge_day(date):
            warning = "Bu tarih hafta sonu ile resmi tatil arasında kalan tek iş günü olduğu için şirket tarafından köprü günü olarak değerlendirilebilir."
            
        return {
            "valid": True,
            "error": None,
            "warning": warning
        }

    def enforce_working_day(self, date: datetime.date) -> None:
        """
        Enforces that the date is a working day, raising ValueError if invalid.
        """
        res = self.validate_start_date(date)
        if not res["valid"]:
            raise ValueError(res["error"])

# Singleton instance Burada Singleton kullanma amacım 
# CalendarService nesnesini uygulama boyunca tek bir kez oluşturup her yerde aynı nesneyi kullanmak.
calendar_service = CalendarService() 
