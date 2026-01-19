"""
Task scheduler service for managing research task lifecycle.

Handles task planning, claiming, dependency checking, and status updates.
"""

import logging
from datetime import datetime
from typing import List, Optional, Dict, Any

from sqlalchemy.orm import Session

from app.db.models import ResearchTask, TaskPlan, AgentOutput, ResearchSession

logger = logging.getLogger(__name__)


class TaskScheduler:
    """Task scheduling and management service."""

    def __init__(self, db: Session):
        self.db = db

    async def create_task_plan(
        self,
        session_id: str,
        original_task: str,
        plan_data: Dict[str, Any],
    ) -> TaskPlan:
        """
        Create a new task plan from Meta-Coordinator's decomposition.

        Args:
            session_id: Research session ID
            original_task: The original user task/question
            plan_data: Structured plan with subtasks, execution order, etc.

        Returns:
            Created TaskPlan object
        """
        # Check for existing plans and increment version
        existing_plans = self.db.query(TaskPlan).filter(
            TaskPlan.session_id == session_id
        ).count()

        plan = TaskPlan(
            session_id=session_id,
            original_task=original_task,
            plan_data=plan_data,
            version=existing_plans + 1,
            status="draft",
        )
        self.db.add(plan)
        self.db.commit()
        self.db.refresh(plan)

        logger.info(f"Created task plan {plan.id} for session {session_id}")
        return plan

    async def activate_plan(self, plan_id: str) -> TaskPlan:
        """
        Activate a task plan and create corresponding ResearchTask records.

        Args:
            plan_id: The plan ID to activate

        Returns:
            Updated TaskPlan with status='active'
        """
        plan = self.db.query(TaskPlan).filter(TaskPlan.id == plan_id).first()
        if not plan:
            raise ValueError(f"Plan not found: {plan_id}")

        plan.status = "active"
        plan.activated_at = datetime.utcnow()

        # Create ResearchTask records from plan_data
        subtasks = plan.plan_data.get("subtasks", [])
        task_id_map = {}  # Map subtask index to created task ID

        for i, subtask in enumerate(subtasks):
            # Resolve dependencies
            dependencies = []
            for dep_idx in subtask.get("dependencies", []):
                if dep_idx in task_id_map:
                    dependencies.append(task_id_map[dep_idx])

            task = ResearchTask(
                session_id=plan.session_id,
                description=subtask.get("description", ""),
                assigned_agent=subtask.get("agent", "meta_coordinator"),
                priority=subtask.get("priority", "medium"),
                status="pending",
                dependencies=dependencies,
                execution_order=subtask.get("order", i),
                execution_group=subtask.get("group", 0),
                created_by="meta_coordinator",
                timeout_seconds=subtask.get("timeout", 300),
            )
            self.db.add(task)
            self.db.flush()  # Get the ID
            task_id_map[i] = task.id

        self.db.commit()
        self.db.refresh(plan)

        logger.info(f"Activated plan {plan_id} with {len(subtasks)} tasks")
        return plan

    async def claim_task(
        self,
        task_id: str,
        agent_type: str,
    ) -> ResearchTask:
        """
        Agent claims a task for execution.

        Args:
            task_id: The task ID to claim
            agent_type: The agent type claiming the task

        Returns:
            Updated ResearchTask with status='in_progress'
        """
        task = self.db.query(ResearchTask).filter(ResearchTask.id == task_id).first()
        if not task:
            raise ValueError(f"Task not found: {task_id}")

        if task.status != "pending":
            raise ValueError(f"Task {task_id} is not in pending state (current: {task.status})")

        # Verify agent assignment
        if task.assigned_agent != agent_type:
            logger.warning(
                f"Agent {agent_type} claiming task assigned to {task.assigned_agent}"
            )

        task.status = "in_progress"
        task.claimed_at = datetime.utcnow()
        task.claimed_by = agent_type

        self.db.commit()
        self.db.refresh(task)

        logger.info(f"Agent {agent_type} claimed task {task_id}")
        return task

    async def complete_task(
        self,
        task_id: str,
        output: str,
        output_files: List[str],
        key_findings: Optional[List[str]] = None,
    ) -> ResearchTask:
        """
        Mark a task as completed with output.

        Args:
            task_id: The task ID to complete
            output: The task output content
            output_files: List of output file paths (relative to workspace)
            key_findings: Optional list of key findings

        Returns:
            Updated ResearchTask with status='completed'
        """
        task = self.db.query(ResearchTask).filter(ResearchTask.id == task_id).first()
        if not task:
            raise ValueError(f"Task not found: {task_id}")

        task.status = "completed"
        task.output = output
        task.output_files = output_files

        self.db.commit()
        self.db.refresh(task)

        # Update dependent tasks' input_files
        await self._update_dependent_tasks_inputs(task)

        # Unblock any tasks waiting on this one
        await self._unblock_dependent_tasks(task)

        logger.info(f"Completed task {task_id}")
        return task

    async def fail_task(
        self,
        task_id: str,
        error_message: str,
        retry: bool = True,
    ) -> ResearchTask:
        """
        Mark a task as failed.

        Args:
            task_id: The task ID that failed
            error_message: Error description
            retry: Whether to retry the task

        Returns:
            Updated ResearchTask
        """
        task = self.db.query(ResearchTask).filter(ResearchTask.id == task_id).first()
        if not task:
            raise ValueError(f"Task not found: {task_id}")

        task.retry_count += 1

        if retry and task.retry_count < task.max_retries:
            task.status = "pending"
            task.claimed_at = None
            task.claimed_by = None
            task.review_notes = f"Retry {task.retry_count}: {error_message}"
        else:
            task.status = "failed"
            task.review_notes = error_message

        self.db.commit()
        self.db.refresh(task)

        logger.info(f"Task {task_id} failed (retry_count={task.retry_count})")
        return task

    async def get_ready_tasks(
        self,
        session_id: str,
    ) -> List[ResearchTask]:
        """
        Get all tasks that are ready for execution.

        A task is ready if:
        1. It's in 'pending' status
        2. All its dependencies are 'completed'

        Args:
            session_id: The session ID

        Returns:
            List of ready ResearchTask objects
        """
        pending_tasks = self.db.query(ResearchTask).filter(
            ResearchTask.session_id == session_id,
            ResearchTask.status == "pending",
        ).order_by(
            ResearchTask.execution_order
        ).all()

        ready_tasks = []
        for task in pending_tasks:
            if await self.check_dependencies(task):
                ready_tasks.append(task)

        return ready_tasks

    async def check_dependencies(self, task: ResearchTask) -> bool:
        """
        Check if all dependencies for a task are satisfied.

        Args:
            task: The task to check

        Returns:
            True if all dependencies are completed
        """
        if not task.dependencies:
            return True

        for dep_task_id in task.dependencies:
            dep_task = self.db.query(ResearchTask).filter(
                ResearchTask.id == dep_task_id
            ).first()
            if not dep_task or dep_task.status != "completed":
                return False

        return True

    async def get_dependency_outputs(
        self,
        task: ResearchTask,
    ) -> List[Dict[str, Any]]:
        """
        Get output files from all dependency tasks.

        Args:
            task: The task whose dependencies to fetch

        Returns:
            List of output info from completed dependencies
        """
        outputs = []
        if not task.dependencies:
            return outputs

        for dep_task_id in task.dependencies:
            dep_task = self.db.query(ResearchTask).filter(
                ResearchTask.id == dep_task_id
            ).first()
            if dep_task and dep_task.output_files:
                outputs.append({
                    "task_id": dep_task_id,
                    "agent": dep_task.assigned_agent,
                    "output_files": dep_task.output_files,
                    "output": dep_task.output,
                })

        return outputs

    async def get_session_status(
        self,
        session_id: str,
    ) -> Dict[str, Any]:
        """
        Get the overall status of a research session.

        Returns:
            Dict with task counts, agent status, etc.
        """
        tasks = self.db.query(ResearchTask).filter(
            ResearchTask.session_id == session_id
        ).all()

        status_counts = {
            "pending": 0,
            "blocked": 0,
            "in_progress": 0,
            "completed": 0,
            "failed": 0,
        }
        agent_status = {}

        for task in tasks:
            status_counts[task.status] = status_counts.get(task.status, 0) + 1

            if task.assigned_agent not in agent_status:
                agent_status[task.assigned_agent] = {
                    "status": "idle",
                    "current_task": None,
                    "completed_tasks": 0,
                }

            if task.status == "in_progress":
                agent_status[task.assigned_agent]["status"] = "running"
                agent_status[task.assigned_agent]["current_task"] = task.description
            elif task.status == "completed":
                agent_status[task.assigned_agent]["completed_tasks"] += 1

        total = len(tasks)
        progress = (status_counts["completed"] / total * 100) if total > 0 else 0

        return {
            "session_id": session_id,
            "total_tasks": total,
            "status_counts": status_counts,
            "agent_status": agent_status,
            "progress": progress,
            "is_complete": status_counts["completed"] == total and total > 0,
        }

    async def _update_dependent_tasks_inputs(self, completed_task: ResearchTask) -> None:
        """Update input_files for tasks that depend on the completed task."""
        dependent_tasks = self.db.query(ResearchTask).filter(
            ResearchTask.session_id == completed_task.session_id,
        ).all()

        for task in dependent_tasks:
            if task.dependencies and completed_task.id in task.dependencies:
                # Add completed task's output files to this task's input
                current_inputs = task.input_files or []
                if completed_task.output_files:
                    current_inputs.extend(completed_task.output_files)
                task.input_files = current_inputs

        self.db.commit()

    async def _unblock_dependent_tasks(self, completed_task: ResearchTask) -> None:
        """Check if any blocked tasks can now be unblocked."""
        blocked_tasks = self.db.query(ResearchTask).filter(
            ResearchTask.session_id == completed_task.session_id,
            ResearchTask.status == "blocked",
        ).all()

        for task in blocked_tasks:
            if await self.check_dependencies(task):
                task.status = "pending"
                logger.info(f"Unblocked task {task.id}")

        self.db.commit()
