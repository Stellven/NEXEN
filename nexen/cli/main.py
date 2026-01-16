"""
NEXEN CLI - Command Line Interface

Provides an interactive terminal interface for the NEXEN research assistant.
"""

import asyncio
from typing import Optional

import typer
from rich.console import Console
from rich.panel import Panel
from rich.markdown import Markdown
from rich.table import Table

app = typer.Typer(
    name="nexen",
    help="NEXEN - Next-generation EXpert ENgine: Multi-Agent AI Research Assistant",
    add_completion=False,
)
console = Console()


@app.command()
def version():
    """Show NEXEN version."""
    from nexen import __version__

    console.print(f"[bold blue]NEXEN[/bold blue] version {__version__}")


@app.command()
def init(
    topic: str = typer.Argument(..., help="Research topic for this session"),
    session_id: Optional[str] = typer.Option(None, "--session", "-s", help="Custom session ID"),
):
    """Initialize a new research session."""
    from nexen.memory.file_store import FileStore

    store = FileStore(session_id)
    manifest = store.initialize_session(topic)

    console.print(Panel(
        f"[bold green]Session initialized![/bold green]\n\n"
        f"Session ID: [cyan]{manifest.session_id}[/cyan]\n"
        f"Topic: [yellow]{topic}[/yellow]\n"
        f"Workspace: {store.session_path}",
        title="🚀 NEXEN",
    ))


@app.command()
def ask(
    question: str = typer.Argument(..., help="Question to ask the coordinator"),
    session_id: Optional[str] = typer.Option(None, "--session", "-s"),
):
    """Ask a quick question to the Meta-Coordinator."""
    from nexen.core.coordinator import MetaCoordinator

    async def _ask():
        coordinator = MetaCoordinator(session_id)
        response = await coordinator.quick_ask(question)
        console.print(Panel(Markdown(response), title="💡 Response"))

    asyncio.run(_ask())


@app.command()
def research(
    task: str = typer.Argument(..., help="Research task to execute"),
    session_id: Optional[str] = typer.Option(None, "--session", "-s"),
    max_agents: int = typer.Option(5, "--max-agents", "-n"),
):
    """Execute a multi-agent research task."""
    from nexen.core.coordinator import MetaCoordinator

    console.print(f"[bold]Starting research task...[/bold]")
    console.print(f"Task: {task}")
    console.print(f"Max agents: {max_agents}")

    async def _research():
        coordinator = MetaCoordinator(session_id)
        result = await coordinator.coordinate(task, max_agents=max_agents)

        # Show results
        console.print("\n[bold green]Research Complete![/bold green]\n")

        # Subtask summary
        table = Table(title="Subtasks")
        table.add_column("ID")
        table.add_column("Agent")
        table.add_column("Status")
        table.add_column("Tokens")

        for st in result.subtasks:
            status_color = "green" if st.status == "completed" else "red"
            tokens = st.output.tokens_used if st.output else 0
            table.add_row(
                st.task_id,
                st.assigned_agent,
                f"[{status_color}]{st.status}[/{status_color}]",
                str(tokens),
            )

        console.print(table)

        # Final synthesis
        console.print(Panel(
            Markdown(result.final_synthesis),
            title="📊 Research Synthesis",
        ))

        console.print(f"\n[dim]Total tokens: {result.total_tokens}[/dim]")
        console.print(f"[dim]Duration: {result.total_duration_ms}ms[/dim]")

    asyncio.run(_research())


@app.command()
def survey(
    topic: str = typer.Argument(..., help="Topic to survey"),
    session_id: Optional[str] = typer.Option(None, "--session", "-s"),
):
    """Generate a quick literature survey on a topic."""
    from nexen.agents.information.explorer import ExplorerAgent

    console.print(f"[bold]Surveying: {topic}[/bold]")

    async def _survey():
        explorer = ExplorerAgent(session_id)
        output = await explorer.search_papers(topic, max_results=15)

        console.print(Panel(
            Markdown(output.result),
            title=f"📚 Survey: {topic}",
        ))

    asyncio.run(_survey())


@app.command()
def who(
    person: str = typer.Argument(..., help="Person to research"),
    session_id: Optional[str] = typer.Option(None, "--session", "-s"),
):
    """Build a profile for a researcher."""
    from nexen.agents.reasoning.genealogist import GenealogistAgent

    console.print(f"[bold]Researching: {person}[/bold]")

    async def _who():
        genealogist = GenealogistAgent(session_id)
        output = await genealogist.build_profile(person)

        console.print(Panel(
            Markdown(output.result),
            title=f"👤 Profile: {person}",
        ))

    asyncio.run(_who())


@app.command()
def evolution(
    tech: str = typer.Argument(..., help="Technology to analyze"),
    session_id: Optional[str] = typer.Option(None, "--session", "-s"),
):
    """Analyze the evolution of a technology."""
    from nexen.agents.reasoning.historian import HistorianAgent

    console.print(f"[bold]Analyzing evolution: {tech}[/bold]")

    async def _evolution():
        historian = HistorianAgent(session_id)
        output = await historian.analyze_evolution(tech)

        console.print(Panel(
            Markdown(output.result),
            title=f"🏛️ Evolution: {tech}",
        ))

    asyncio.run(_evolution())


@app.command()
def agents():
    """List all available agents."""
    from nexen.config.agents import AGENT_CONFIGS, AgentCluster

    table = Table(title="NEXEN Agents")
    table.add_column("ID", style="cyan")
    table.add_column("Name")
    table.add_column("Cluster")
    table.add_column("Model")

    for agent_id, config in AGENT_CONFIGS.items():
        cluster_colors = {
            AgentCluster.COORDINATION: "yellow",
            AgentCluster.REASONING: "blue",
            AgentCluster.INFORMATION: "green",
            AgentCluster.PRODUCTION: "magenta",
        }
        color = cluster_colors.get(config.cluster, "white")

        table.add_row(
            agent_id,
            config.display_name_cn,
            f"[{color}]{config.cluster.value}[/{color}]",
            config.role_model,
        )

    console.print(table)


@app.command()
def models():
    """List available models and their status."""
    from nexen.core.model_router import ModelRouter

    router = ModelRouter()
    available = router.list_available_models()

    from nexen.config.models import MODELS

    table = Table(title="Model Status")
    table.add_column("Model ID", style="cyan")
    table.add_column("Provider")
    table.add_column("Status")
    table.add_column("Cost Tier")

    for model_id, config in MODELS.items():
        status = "✅ Available" if model_id in available else "❌ No API Key"
        status_color = "green" if model_id in available else "red"
        cost = "💰" * config.cost_tier

        table.add_row(
            model_id,
            config.provider,
            f"[{status_color}]{status}[/{status_color}]",
            cost,
        )

    console.print(table)


@app.command()
def interactive(
    session_id: Optional[str] = typer.Option(None, "--session", "-s"),
):
    """Start an interactive research session."""
    console.print(Panel(
        "[bold]Welcome to NEXEN Interactive Mode![/bold]\n\n"
        "Commands:\n"
        "  /survey <topic>  - Literature survey\n"
        "  /who <person>    - Researcher profile\n"
        "  /evolution <tech> - Technology evolution\n"
        "  /ask <question>  - Quick question\n"
        "  /quit            - Exit\n\n"
        "Or just type a research task to coordinate multiple agents.",
        title="🧠 NEXEN",
    ))

    from nexen.core.coordinator import MetaCoordinator
    from nexen.agents.information.explorer import ExplorerAgent
    from nexen.agents.reasoning.genealogist import GenealogistAgent
    from nexen.agents.reasoning.historian import HistorianAgent

    coordinator = MetaCoordinator(session_id)

    while True:
        try:
            prompt = console.input("\n[bold cyan]nexen>[/bold cyan] ").strip()

            if not prompt:
                continue

            if prompt == "/quit" or prompt == "exit":
                console.print("[dim]Goodbye![/dim]")
                break

            if prompt.startswith("/survey "):
                topic = prompt[8:].strip()
                asyncio.run(_run_agent(ExplorerAgent, "search_papers", topic, session_id))

            elif prompt.startswith("/who "):
                person = prompt[5:].strip()
                asyncio.run(_run_agent(GenealogistAgent, "build_profile", person, session_id))

            elif prompt.startswith("/evolution "):
                tech = prompt[11:].strip()
                asyncio.run(_run_agent(HistorianAgent, "analyze_evolution", tech, session_id))

            elif prompt.startswith("/ask "):
                question = prompt[5:].strip()
                asyncio.run(_quick_ask(coordinator, question))

            else:
                # Treat as a research task
                asyncio.run(_run_research(coordinator, prompt))

        except KeyboardInterrupt:
            console.print("\n[dim]Use /quit to exit[/dim]")
        except Exception as e:
            console.print(f"[red]Error: {e}[/red]")


async def _run_agent(agent_class, method_name, arg, session_id):
    """Run an agent method."""
    agent = agent_class(session_id)
    method = getattr(agent, method_name)
    output = await method(arg)
    console.print(Panel(Markdown(output.result), title="Response"))


async def _quick_ask(coordinator, question):
    """Quick ask the coordinator."""
    response = await coordinator.quick_ask(question)
    console.print(Panel(Markdown(response), title="Response"))


async def _run_research(coordinator, task):
    """Run a research task."""
    console.print("[dim]Coordinating research...[/dim]")
    result = await coordinator.coordinate(task, max_agents=3)
    console.print(Panel(Markdown(result.final_synthesis), title="Research Result"))


if __name__ == "__main__":
    app()
