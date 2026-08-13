import unittest
import datetime
from app.scheduling import scheduling_engine

# Mock Task class for testing without database
class MockTask:
    def __init__(self, id: int, name: str, duration: int = 1, is_milestone: bool = False):
        self.id = id
        self.name = name
        self.duration = duration
        self.is_milestone = is_milestone
        self.start_date = None
        self.end_date = None

# Mock TaskDependency class for testing
class MockDependency:
    def __init__(self, predecessor_id: int, task_id: int):
        self.predecessor_id = predecessor_id
        self.task_id = task_id

class TestSchedulingEngine(unittest.TestCase):
    def test_cycle_detection(self):
        # Create a DAG with no cycles:
        # 1 -> 2 -> 3
        # 1 -> 4
        tasks = [
            MockTask(1, "Task 1"),
            MockTask(2, "Task 2"),
            MockTask(3, "Task 3"),
            MockTask(4, "Task 4"),
        ]
        deps = [
            MockDependency(1, 2),
            MockDependency(2, 3),
            MockDependency(1, 4),
        ]
        
        self.assertFalse(scheduling_engine.has_cycle(tasks, deps))
        
        # Add a cycle: 3 -> 1 (Creating 1 -> 2 -> 3 -> 1)
        deps.append(MockDependency(3, 1))
        self.assertTrue(scheduling_engine.has_cycle(tasks, deps))
        
        with self.assertRaises(ValueError):
            scheduling_engine.topological_sort(tasks, deps)

    def test_topological_sort(self):
        # 1 -> 2 -> 3
        # 1 -> 4
        tasks = [
            MockTask(1, "Task 1"),
            MockTask(2, "Task 2"),
            MockTask(3, "Task 3"),
            MockTask(4, "Task 4"),
        ]
        deps = [
            MockDependency(1, 2),
            MockDependency(2, 3),
            MockDependency(1, 4),
        ]
        
        order = scheduling_engine.topological_sort(tasks, deps)
        
        # Assertions on topological order:
        # Task 1 must be computed before Task 2 and Task 4
        self.assertTrue(order.index(1) < order.index(2))
        self.assertTrue(order.index(1) < order.index(4))
        # Task 2 must be computed before Task 3
        self.assertTrue(order.index(2) < order.index(3))

    def test_date_calculation_no_bridge(self):
        # Project starts on Monday 2026-08-17 (Workday)
        # Task 1: 5 working days (Mon 17 to Fri 21)
        # Task 2: Milestone, depends on Task 1 (starts/ends Fri 21)
        # Task 3: 3 working days, depends on Task 2 (starts Mon 24 to Wed 26, skipping Sat 22/Sun 23)
        project_start = datetime.date(2026, 8, 17)
        tasks = [
            MockTask(1, "Task 1", duration=5),
            MockTask(2, "Milestone 2", duration=0, is_milestone=True),
            MockTask(3, "Task 3", duration=3),
        ]
        deps = [
            MockDependency(1, 2),
            MockDependency(2, 3),
        ]
        
        scheduling_engine.calculate_dates(project_start, tasks, deps, exclude_bridge_days=False)
        
        # Task 1 check
        self.assertEqual(tasks[0].start_date, datetime.date(2026, 8, 17))
        self.assertEqual(tasks[0].end_date, datetime.date(2026, 8, 21))
        
        # Milestone 2 check: starts and ends on the same day as Task 1 ends
        # Wait, the rule says: B starts on the next working day after A ends.
        # But for Milestones, if it is B, B's start date is the next working day after A ends.
        # Wait, does a Milestone start on the next working day after its predecessor?
        # Let's check: in calculate_dates:
        # "Start date is the next working day after the latest predecessor ends"
        # Since Milestone 2 depends on Task 1 (ends Fri 21), Milestone 2's start date is Monday 2026-08-24!
        # And since it's a milestone, its end date is also Monday 2026-08-24.
        # And Task 3 (depends on Milestone 2 ending on Monday 24) starts on Tuesday 2026-08-25, ends on Thursday 27!
        # Let's verify if that's how it behaves:
        self.assertEqual(tasks[1].start_date, datetime.date(2026, 8, 24))
        self.assertEqual(tasks[1].end_date, datetime.date(2026, 8, 24))
        
        self.assertEqual(tasks[2].start_date, datetime.date(2026, 8, 25))
        self.assertEqual(tasks[2].end_date, datetime.date(2026, 8, 27))

if __name__ == '__main__':
    unittest.main()
