import unittest
import datetime
from app.calendar_service import calendar_service

class TestCalendarService(unittest.TestCase):
    def test_weekend_detection(self):
        # 2026-08-15 is Saturday
        sat = datetime.date(2026, 8, 15)
        # 2026-08-16 is Sunday
        sun = datetime.date(2026, 8, 16)
        # 2026-08-17 is Monday
        mon = datetime.date(2026, 8, 17)
        
        self.assertTrue(calendar_service.is_weekend(sat))
        self.assertTrue(calendar_service.is_weekend(sun))
        self.assertFalse(calendar_service.is_weekend(mon))

    def test_public_holiday_detection(self):
        # 2026-01-01 is New Year's Day (Yılbaşı)
        new_year = datetime.date(2026, 1, 1)
        # 2026-01-02 is a regular work day (except if bridge)
        regular_day = datetime.date(2026, 1, 2)
        
        self.assertTrue(calendar_service.is_public_holiday(new_year))
        self.assertFalse(calendar_service.is_public_holiday(regular_day))
        self.assertEqual(calendar_service.get_holiday_name(new_year), "Yılbaşı")

    def test_bridge_day_detection(self):
        # In 2026, Jan 1 (Yılbaşı) is Thursday.
        # Jan 2 (Friday) is sandwiched between Jan 1 (Holiday) and Jan 3 (Saturday).
        # Therefore, Jan 2 should be a bridge day.
        jan_1 = datetime.date(2026, 1, 1) # Thursday - Holiday
        jan_2 = datetime.date(2026, 1, 2) # Friday - Workday
        jan_3 = datetime.date(2026, 1, 3) # Saturday - Weekend
        
        self.assertTrue(calendar_service.is_public_holiday(jan_1))
        self.assertTrue(calendar_service.is_weekend(jan_3))
        self.assertTrue(calendar_service.is_bridge_day(jan_2))
        
        # Jan 5 (Monday) is not a bridge day
        jan_5 = datetime.date(2026, 1, 5)
        self.assertFalse(calendar_service.is_bridge_day(jan_5))

    def test_working_days_arithmetic(self):
        # 2026-01-01 (Thu - Holiday), 2026-01-02 (Fri - Bridge Day), 2026-01-03/04 (Weekend)
        # Start on Wednesday 2025-12-31, duration 2 days.
        # If exclude_bridge_days = False:
        # Day 1: 2025-12-31 (Wed)
        # Day 2: 2026-01-02 (Fri) [Thursday is Holiday]
        # So end date should be 2026-01-02.
        start = datetime.date(2025, 12, 31)
        end = calendar_service.add_working_days(start, 2, exclude_bridge_days=False)
        self.assertEqual(end, datetime.date(2026, 1, 2))
        
        # If exclude_bridge_days = True:
        # Day 1: 2025-12-31 (Wed)
        # Day 2: 2026-01-05 (Mon) [Thursday is Holiday, Friday is Bridge, Sat/Sun are Weekend]
        # So end date should be 2026-01-05.
        end_exclude = calendar_service.add_working_days(start, 2, exclude_bridge_days=True)
        self.assertEqual(end_exclude, datetime.date(2026, 1, 5))

    def test_working_days_count(self):
        # 2025-12-31 (Wed) to 2026-01-05 (Mon)
        # Workdays:
        # 2025-12-31: Yes
        # 2026-01-01: No (Holiday)
        # 2026-01-02: Yes (Bridge) / No (if excluded)
        # 2026-01-03: No (Weekend)
        # 2026-01-04: No (Weekend)
        # 2026-01-05: Yes
        start = datetime.date(2025, 12, 31)
        end = datetime.date(2026, 1, 5)
        
        self.assertEqual(calendar_service.get_working_days_count(start, end, False), 3)
        self.assertEqual(calendar_service.get_working_days_count(start, end, True), 2)

    def test_start_date_validation(self):
        # Weekend date: Saturday 2026-08-15
        weekend_date = datetime.date(2026, 8, 15)
        res_wknd = calendar_service.validate_start_date(weekend_date)
        self.assertFalse(res_wknd["valid"])
        self.assertEqual(res_wknd["error"], "Başlangıç tarihi bir iş günü olmalıdır.")
        self.assertIsNone(res_wknd["warning"])
        
        with self.assertRaises(ValueError):
            calendar_service.enforce_working_day(weekend_date)
            
        # Holiday date: Jan 1, 2026
        holiday_date = datetime.date(2026, 1, 1)
        res_hol = calendar_service.validate_start_date(holiday_date)
        self.assertFalse(res_hol["valid"])
        self.assertTrue("Başlangıç tarihi bir iş günü olmalıdır" in res_hol["error"])
        
        with self.assertRaises(ValueError):
            calendar_service.enforce_working_day(holiday_date)
            
        # Bridge date: Jan 2, 2026
        bridge_date = datetime.date(2026, 1, 2)
        res_brg = calendar_service.validate_start_date(bridge_date)
        self.assertTrue(res_brg["valid"])
        self.assertIsNone(res_brg["error"])
        self.assertIsNotNone(res_brg["warning"])
        
        # Should not raise ValueError
        calendar_service.enforce_working_day(bridge_date)

if __name__ == '__main__':
    unittest.main()
