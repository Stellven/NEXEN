"""
AI Teams API - Team Management, Members, and Tasks
"""

from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload

from app.db.database import get_db
from app.db.models import User, Team, TeamMember, TeamTask
from app.auth.deps import get_current_active_user

router = APIRouter()


# =============================================================================
# Pydantic Models
# =============================================================================

# Team Models
class TeamCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None


class TeamUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    settings: Optional[dict] = None


class TeamMemberResponse(BaseModel):
    id: str
    user_id: str
    username: str
    email: str
    role: str
    joined_at: datetime

    class Config:
        from_attributes = True


class TeamResponse(BaseModel):
    id: str
    owner_id: str
    name: str
    description: Optional[str]
    avatar_url: Optional[str]
    member_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TeamDetailResponse(TeamResponse):
    members: List[TeamMemberResponse] = []


class TeamListResponse(BaseModel):
    teams: List[TeamResponse]
    total: int


# Member Models
class MemberAdd(BaseModel):
    email: str
    role: str = Field(default="member")  # admin, member


class MemberUpdate(BaseModel):
    role: str  # admin, member


# Task Models
class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    priority: str = Field(default="medium")  # low, medium, high, urgent
    due_date: Optional[datetime] = None
    assignee_id: Optional[str] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    status: Optional[str] = None  # pending, in_progress, completed, cancelled
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    assignee_id: Optional[str] = None


class TaskResponse(BaseModel):
    id: str
    team_id: str
    title: str
    description: Optional[str]
    status: str
    priority: str
    due_date: Optional[datetime]
    completed_at: Optional[datetime]
    assignee_id: Optional[str]
    assignee_name: Optional[str] = None
    created_by_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TaskListResponse(BaseModel):
    tasks: List[TaskResponse]
    total: int


# =============================================================================
# Helper Functions
# =============================================================================

def get_team_or_404(team_id: str, user_id: str, db: Session) -> Team:
    """Get team and verify user is a member."""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Check if user is a member
    membership = db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.user_id == user_id
    ).first()

    if not membership:
        raise HTTPException(status_code=403, detail="You are not a member of this team")

    return team


def check_team_admin(team_id: str, user_id: str, db: Session) -> bool:
    """Check if user is team owner or admin."""
    membership = db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.user_id == user_id
    ).first()

    if not membership:
        return False

    return membership.role in ["owner", "admin"]


# =============================================================================
# Team Endpoints
# =============================================================================

@router.get("/teams", response_model=TeamListResponse)
async def list_teams(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get all teams the user is a member of."""
    # Get team IDs where user is a member
    memberships = db.query(TeamMember).filter(
        TeamMember.user_id == current_user.id
    ).all()

    team_ids = [m.team_id for m in memberships]

    teams = db.query(Team).filter(Team.id.in_(team_ids)).order_by(Team.created_at.desc()).all()

    return TeamListResponse(
        teams=[TeamResponse.model_validate(t) for t in teams],
        total=len(teams)
    )


@router.post("/teams", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
async def create_team(
    request: TeamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new team."""
    # Create team
    team = Team(
        owner_id=current_user.id,
        name=request.name,
        description=request.description,
        member_count=1,
    )
    db.add(team)
    db.flush()

    # Add creator as owner member
    member = TeamMember(
        team_id=team.id,
        user_id=current_user.id,
        role="owner",
    )
    db.add(member)
    db.commit()
    db.refresh(team)

    return TeamResponse.model_validate(team)


@router.get("/teams/{team_id}", response_model=TeamDetailResponse)
async def get_team(
    team_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get team details."""
    team = get_team_or_404(team_id, current_user.id, db)

    # Get members with user info
    members = db.query(TeamMember, User).join(
        User, TeamMember.user_id == User.id
    ).filter(TeamMember.team_id == team_id).all()

    member_responses = [
        TeamMemberResponse(
            id=m.TeamMember.id,
            user_id=m.User.id,
            username=m.User.username,
            email=m.User.email,
            role=m.TeamMember.role,
            joined_at=m.TeamMember.joined_at,
        )
        for m in members
    ]

    return TeamDetailResponse(
        id=team.id,
        owner_id=team.owner_id,
        name=team.name,
        description=team.description,
        avatar_url=team.avatar_url,
        member_count=team.member_count,
        created_at=team.created_at,
        updated_at=team.updated_at,
        members=member_responses,
    )


@router.put("/teams/{team_id}", response_model=TeamResponse)
async def update_team(
    team_id: str,
    request: TeamUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update team details."""
    team = get_team_or_404(team_id, current_user.id, db)

    # Check admin permission
    if not check_team_admin(team_id, current_user.id, db):
        raise HTTPException(status_code=403, detail="Only admins can update team")

    # Update fields
    if request.name is not None:
        team.name = request.name
    if request.description is not None:
        team.description = request.description
    if request.settings is not None:
        team.settings = request.settings

    db.commit()
    db.refresh(team)

    return TeamResponse.model_validate(team)


@router.delete("/teams/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_team(
    team_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a team (owner only)."""
    team = get_team_or_404(team_id, current_user.id, db)

    # Only owner can delete
    if team.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only owner can delete team")

    db.delete(team)
    db.commit()


# =============================================================================
# Member Endpoints
# =============================================================================

@router.get("/teams/{team_id}/members", response_model=List[TeamMemberResponse])
async def list_members(
    team_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get team members."""
    get_team_or_404(team_id, current_user.id, db)

    members = db.query(TeamMember, User).join(
        User, TeamMember.user_id == User.id
    ).filter(TeamMember.team_id == team_id).all()

    return [
        TeamMemberResponse(
            id=m.TeamMember.id,
            user_id=m.User.id,
            username=m.User.username,
            email=m.User.email,
            role=m.TeamMember.role,
            joined_at=m.TeamMember.joined_at,
        )
        for m in members
    ]


@router.post("/teams/{team_id}/members", response_model=TeamMemberResponse, status_code=status.HTTP_201_CREATED)
async def add_member(
    team_id: str,
    request: MemberAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Add a member to the team."""
    team = get_team_or_404(team_id, current_user.id, db)

    # Check admin permission
    if not check_team_admin(team_id, current_user.id, db):
        raise HTTPException(status_code=403, detail="Only admins can add members")

    # Find user by email
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found with this email")

    # Check if already a member
    existing = db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.user_id == user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member")

    # Add member
    member = TeamMember(
        team_id=team_id,
        user_id=user.id,
        role=request.role if request.role != "owner" else "member",
    )
    db.add(member)

    # Update member count
    team.member_count += 1
    db.commit()
    db.refresh(member)

    return TeamMemberResponse(
        id=member.id,
        user_id=user.id,
        username=user.username,
        email=user.email,
        role=member.role,
        joined_at=member.joined_at,
    )


@router.put("/teams/{team_id}/members/{user_id}", response_model=TeamMemberResponse)
async def update_member(
    team_id: str,
    user_id: str,
    request: MemberUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update member role."""
    team = get_team_or_404(team_id, current_user.id, db)

    # Check admin permission
    if not check_team_admin(team_id, current_user.id, db):
        raise HTTPException(status_code=403, detail="Only admins can update members")

    # Can't change owner role
    if user_id == team.owner_id:
        raise HTTPException(status_code=400, detail="Cannot change owner role")

    # Find member
    member = db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.user_id == user_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    # Update role
    if request.role not in ["admin", "member"]:
        raise HTTPException(status_code=400, detail="Invalid role")

    member.role = request.role
    db.commit()
    db.refresh(member)

    user = db.query(User).filter(User.id == user_id).first()

    return TeamMemberResponse(
        id=member.id,
        user_id=user.id,
        username=user.username,
        email=user.email,
        role=member.role,
        joined_at=member.joined_at,
    )


@router.delete("/teams/{team_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    team_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Remove a member from the team."""
    team = get_team_or_404(team_id, current_user.id, db)

    # Can't remove owner
    if user_id == team.owner_id:
        raise HTTPException(status_code=400, detail="Cannot remove team owner")

    # Check permission: admin or self-remove
    is_admin = check_team_admin(team_id, current_user.id, db)
    is_self = user_id == current_user.id

    if not is_admin and not is_self:
        raise HTTPException(status_code=403, detail="No permission to remove this member")

    # Find and delete member
    member = db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.user_id == user_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    db.delete(member)

    # Update member count
    team.member_count -= 1
    db.commit()


# =============================================================================
# Task Endpoints
# =============================================================================

@router.get("/teams/{team_id}/tasks", response_model=TaskListResponse)
async def list_tasks(
    team_id: str,
    status: Optional[str] = None,
    assignee_id: Optional[str] = None,
    priority: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get team tasks with optional filtering."""
    get_team_or_404(team_id, current_user.id, db)

    query = db.query(TeamTask).filter(TeamTask.team_id == team_id)

    if status:
        query = query.filter(TeamTask.status == status)
    if assignee_id:
        query = query.filter(TeamTask.assignee_id == assignee_id)
    if priority:
        query = query.filter(TeamTask.priority == priority)

    tasks = query.order_by(TeamTask.created_at.desc()).all()

    # Get assignee names
    task_responses = []
    for task in tasks:
        assignee_name = None
        if task.assignee_id:
            assignee = db.query(User).filter(User.id == task.assignee_id).first()
            if assignee:
                assignee_name = assignee.username

        task_responses.append(TaskResponse(
            id=task.id,
            team_id=task.team_id,
            title=task.title,
            description=task.description,
            status=task.status,
            priority=task.priority,
            due_date=task.due_date,
            completed_at=task.completed_at,
            assignee_id=task.assignee_id,
            assignee_name=assignee_name,
            created_by_id=task.created_by_id,
            created_at=task.created_at,
            updated_at=task.updated_at,
        ))

    return TaskListResponse(tasks=task_responses, total=len(task_responses))


@router.post("/teams/{team_id}/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    team_id: str,
    request: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new task."""
    get_team_or_404(team_id, current_user.id, db)

    # Validate assignee if provided
    assignee_name = None
    if request.assignee_id:
        assignee_member = db.query(TeamMember).filter(
            TeamMember.team_id == team_id,
            TeamMember.user_id == request.assignee_id
        ).first()
        if not assignee_member:
            raise HTTPException(status_code=400, detail="Assignee must be a team member")
        assignee = db.query(User).filter(User.id == request.assignee_id).first()
        if assignee:
            assignee_name = assignee.username

    task = TeamTask(
        team_id=team_id,
        created_by_id=current_user.id,
        title=request.title,
        description=request.description,
        priority=request.priority,
        due_date=request.due_date,
        assignee_id=request.assignee_id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    return TaskResponse(
        id=task.id,
        team_id=task.team_id,
        title=task.title,
        description=task.description,
        status=task.status,
        priority=task.priority,
        due_date=task.due_date,
        completed_at=task.completed_at,
        assignee_id=task.assignee_id,
        assignee_name=assignee_name,
        created_by_id=task.created_by_id,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


@router.put("/teams/{team_id}/tasks/{task_id}", response_model=TaskResponse)
async def update_task(
    team_id: str,
    task_id: str,
    request: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update a task."""
    get_team_or_404(team_id, current_user.id, db)

    task = db.query(TeamTask).filter(
        TeamTask.id == task_id,
        TeamTask.team_id == team_id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Update fields
    if request.title is not None:
        task.title = request.title
    if request.description is not None:
        task.description = request.description
    if request.priority is not None:
        task.priority = request.priority
    if request.due_date is not None:
        task.due_date = request.due_date
    if request.assignee_id is not None:
        # Validate assignee
        if request.assignee_id:
            assignee_member = db.query(TeamMember).filter(
                TeamMember.team_id == team_id,
                TeamMember.user_id == request.assignee_id
            ).first()
            if not assignee_member:
                raise HTTPException(status_code=400, detail="Assignee must be a team member")
        task.assignee_id = request.assignee_id

    if request.status is not None:
        task.status = request.status
        if request.status == "completed":
            task.completed_at = datetime.utcnow()
        elif task.completed_at:
            task.completed_at = None

    db.commit()
    db.refresh(task)

    # Get assignee name
    assignee_name = None
    if task.assignee_id:
        assignee = db.query(User).filter(User.id == task.assignee_id).first()
        if assignee:
            assignee_name = assignee.username

    return TaskResponse(
        id=task.id,
        team_id=task.team_id,
        title=task.title,
        description=task.description,
        status=task.status,
        priority=task.priority,
        due_date=task.due_date,
        completed_at=task.completed_at,
        assignee_id=task.assignee_id,
        assignee_name=assignee_name,
        created_by_id=task.created_by_id,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


@router.delete("/teams/{team_id}/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    team_id: str,
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a task."""
    get_team_or_404(team_id, current_user.id, db)

    task = db.query(TeamTask).filter(
        TeamTask.id == task_id,
        TeamTask.team_id == team_id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Only creator or admin can delete
    is_admin = check_team_admin(team_id, current_user.id, db)
    is_creator = task.created_by_id == current_user.id

    if not is_admin and not is_creator:
        raise HTTPException(status_code=403, detail="No permission to delete this task")

    db.delete(task)
    db.commit()


# =============================================================================
# My Tasks Endpoint
# =============================================================================

@router.get("/my-tasks", response_model=TaskListResponse)
async def get_my_tasks(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get all tasks assigned to current user across all teams."""
    query = db.query(TeamTask).filter(TeamTask.assignee_id == current_user.id)

    if status:
        query = query.filter(TeamTask.status == status)

    tasks = query.order_by(TeamTask.due_date.asc().nullslast(), TeamTask.created_at.desc()).all()

    task_responses = []
    for task in tasks:
        task_responses.append(TaskResponse(
            id=task.id,
            team_id=task.team_id,
            title=task.title,
            description=task.description,
            status=task.status,
            priority=task.priority,
            due_date=task.due_date,
            completed_at=task.completed_at,
            assignee_id=task.assignee_id,
            assignee_name=current_user.username,
            created_by_id=task.created_by_id,
            created_at=task.created_at,
            updated_at=task.updated_at,
        ))

    return TaskListResponse(tasks=task_responses, total=len(task_responses))
