import datetime
from typing import List, Dict, Set, Tuple, Optional, Any
from .calendar_service import calendar_service

class SchedulingEngine:
    def build_adjacency_list(
        self, 
        tasks: List, 
        dependencies: List
    ) -> Tuple[Dict[int, List[int]], Dict[int, List[int]], Dict[int, Any]]:
        """
        Builds graph representations.
        Returns:
        - adj_list: maps predecessor_id -> list of successor_ids (forward edges)
        - rev_adj_list: maps task_id -> list of predecessor_ids (backward edges)
        - task_map: maps task_id -> task object
        """
        adj_list: Dict[int, List[int]] = {t.id: [] for t in tasks}  # forward adjacency list
        rev_adj_list: Dict[int, List[int]] = {t.id: [] for t in tasks} # backward adjacency list
        task_map = {t.id: t for t in tasks} #  task id den task objecte ulaşma işi

        for dep in dependencies:
            # Only include dependencies where both tasks exist in the current project context
            if dep.predecessor_id in task_map and dep.task_id in task_map:
                adj_list[dep.predecessor_id].append(dep.task_id)
                rev_adj_list[dep.task_id].append(dep.predecessor_id)

        return adj_list, rev_adj_list, task_map

    def has_cycle(self, tasks: List, dependencies: List) -> bool:
        """
        Detects if there is a cycle in the task dependency graph using 3-state DFS.
        States:
        - 0: Unvisited (WHITE)
        - 1: Visiting (GRAY - in recursion stack)
        - 2: Visited (BLACK - fully explored)
        """
        adj_list, _, _ = self.build_adjacency_list(tasks, dependencies) #  _ bu değeri alıorum ama kullanmıorum demek
        states: Dict[int, int] = {t.id: 0 for t in tasks} # her task başlangıcta beyaz yani 0 olması gerek.

        def dfs_has_cycle(task_id: int) -> bool:
            states[task_id] = 1  # Mark as GRAY (Visiting)

            for successor_id in adj_list.get(task_id, []): #bu taskın ardından gelen taskları kontrol ediyoruz.
                state = states.get(successor_id, 0) #successor durumunu alıyor. 
                if state == 1:
                    return True  # Found a back edge to a node in current recursion path (Cycle!)
                if state == 0:
                    if dfs_has_cycle(successor_id): #recursive şekilde ilerliyor 
                        return True

            states[task_id] = 2  # Mark as BLACK (Visited/Clean)
            return False # cycle yok bu yüzden false yapıyor.

        for task in tasks: # tüm taskları geziyor 
            if states[task.id] == 0: # eğer task beyaz ise 
                if dfs_has_cycle(task.id): #dfs yapıyoruz
                    return True # cycle var

        return False # cycle yok

    def topological_sort(self, tasks: List, dependencies: List) -> List[int]:
        # topological sort ile taskları uygun sekilde sırlaıyoruz dfs ile falan da bakarak. döngü olursa yine hata veriyor.
        """
        Performs topological sort using DFS.
        Raises ValueError if a cycle is detected.
        Returns a list of task IDs in topological order (dependencies first).
        """
        adj_list, _, _ = self.build_adjacency_list(tasks, dependencies)
        states: Dict[int, int] = {t.id: 0 for t in tasks} # durumlar ve sıralama listesi oluşturuluyor
        order: List[int] = []

        def dfs_sort(task_id: int):
            states[task_id] = 1  # Mark as GRAY (Visiting)

            for successor_id in adj_list.get(task_id, []):
                state = states.get(successor_id, 0)
                if state == 1:
                    raise ValueError("Görevler arasında döngüsel bağımlılık tespit edildi.")
                if state == 0:
                    dfs_sort(successor_id)

            states[task_id] = 2  # Mark as BLACK (Visited)
            order.append(task_id)

        for task in tasks:
            if states[task.id] == 0:
                dfs_sort(task.id)

        # The order list has leaf nodes first, so we reverse it to get topological order
        order.reverse() #dfs eklerken en sondan ekliyor o yüzden reverse yapma durumundayuz ki sıralama korunsun
        return order

    def calculate_dates(
        self, 
        project_start_date: datetime.date, 
        tasks: List, 
        dependencies: List, 
        exclude_bridge_days: bool = False
    ) -> List:
        """
        Calculates and updates start_date and end_date for all tasks in topological order.
        If a task is a milestone, its duration is treated as 0 days (end_date = start_date).
        """
        if not tasks:
            return []

        # 1. Sort tasks topologically to ensure predecessors are calculated first
        topo_order = self.topological_sort(tasks, dependencies)
        adj_list, rev_adj_list, task_map = self.build_adjacency_list(tasks, dependencies)

        # 2. Make sure the project start date is a valid working day
        actual_project_start = project_start_date
        while not calendar_service.is_working_day(actual_project_start, exclude_bridge_days):
            actual_project_start += datetime.timedelta(days=1)

        # 3. Calculate dates in topological order
        for task_id in topo_order:
            task = task_map[task_id]
            predecessors = rev_adj_list.get(task_id, [])

            if not predecessors:
                # No predecessors: start on the project start date
                task.start_date = actual_project_start
            else:
                # Has predecessors: must start on the next working day after the latest predecessor ends
                latest_end: Optional[datetime.date] = None
                for pred_id in predecessors:
                    pred_task = task_map[pred_id]
                    if pred_task.end_date is not None:
                        if latest_end is None or pred_task.end_date > latest_end:
                            latest_end = pred_task.end_date

                if latest_end is None:
                    # Fallback if somehow no predecessor has end date computed yet
                    task.start_date = actual_project_start
                else:
                    # Start date is the next working day after the latest predecessor ends
                    day_after = latest_end + datetime.timedelta(days=1)
                    task.start_date = calendar_service.add_working_days(
                        day_after, 
                        1, 
                        exclude_bridge_days
                    )

            # Calculate end date
            if task.is_milestone:
                task.end_date = task.start_date
            else:
                # End date = Start date + (duration - 1) working days
                task.end_date = calendar_service.add_working_days(
                    task.start_date, 
                    task.duration, 
                    exclude_bridge_days
                )

        return tasks

# Singleton instance
scheduling_engine = SchedulingEngine()
