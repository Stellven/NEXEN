"""
Data analysis and visualization skills.
"""

from nexen.skills.base import Skill, LLMSkill, SkillResult, SkillParameter, SkillCategory
from nexen.skills.registry import register_skill


@register_skill
class StatisticalAnalysisSkill(LLMSkill):
    """Perform statistical analysis on data."""
    
    name = "statistical_analysis"
    display_name = "Statistical Analysis"
    description = "Design and interpret statistical analyses for scientific data"
    category = SkillCategory.DATA_ANALYSIS
    parameters = [
        SkillParameter(name="data_description", description="Description of the data and variables", required=True),
        SkillParameter(name="research_question", description="Research question or hypothesis", required=True),
        SkillParameter(name="analysis_type", description="Type of analysis", required=False,
                      enum=["descriptive", "inferential", "regression", "survival", "mixed-effects"]),
    ]
    
    async def execute(self, params: dict, context=None) -> SkillResult:
        valid, error = self.validate_params(params)
        if not valid:
            return SkillResult(success=False, error=error)
        
        data_desc = params["data_description"]
        question = params["research_question"]
        analysis_type = params.get("analysis_type", "inferential")
        
        prompt = f"""Design a {analysis_type} statistical analysis:

Data: {data_desc}
Research Question: {question}

Provide:
1. **Recommended Statistical Tests**: With justification
2. **Assumptions to Check**: And how to verify them
3. **Sample Size Considerations**: Power analysis if relevant
4. **Analysis Protocol**: Step-by-step procedure
5. **Python/R Code**: Implementation example
6. **Interpretation Guide**: How to interpret results
7. **Reporting Template**: How to report in a paper (APA style)

Include effect size calculations and confidence intervals."""

        try:
            result = await self.call_llm(prompt, self.get_system_prompt())
            return SkillResult(success=True, data=result, metadata={"analysis_type": analysis_type})
        except Exception as e:
            return SkillResult(success=False, error=str(e))


@register_skill
class ExploratoryDataAnalysisSkill(LLMSkill):
    """Perform exploratory data analysis."""
    
    name = "eda"
    display_name = "Exploratory Data Analysis"
    description = "Generate EDA workflow for scientific datasets"
    category = SkillCategory.DATA_ANALYSIS
    parameters = [
        SkillParameter(name="data_description", description="Description of the dataset", required=True),
        SkillParameter(name="variables", description="Key variables to analyze", required=False),
        SkillParameter(name="format", description="Output format", required=False, default="python",
                      enum=["python", "R", "narrative"]),
    ]
    
    async def execute(self, params: dict, context=None) -> SkillResult:
        valid, error = self.validate_params(params)
        if not valid:
            return SkillResult(success=False, error=error)
        
        data_desc = params["data_description"]
        variables = params.get("variables", "")
        output_format = params.get("format", "python")
        
        prompt = f"""Create an EDA workflow for:

Dataset: {data_desc}
{f"Focus variables: {variables}" if variables else ""}

Generate a comprehensive EDA plan including:
1. **Data Overview**: Shape, types, missing values
2. **Univariate Analysis**: Distributions for each variable
3. **Bivariate Analysis**: Correlations and relationships
4. **Outlier Detection**: Methods and visualization
5. **Feature Engineering Ideas**: Based on patterns
6. **Visualization Suite**: Key plots to create

{"Provide Python code using pandas, matplotlib, seaborn." if output_format == "python" else ""}
{"Provide R code using tidyverse, ggplot2." if output_format == "R" else ""}
{"Provide narrative analysis approach." if output_format == "narrative" else ""}"""

        try:
            result = await self.call_llm(prompt, self.get_system_prompt())
            return SkillResult(success=True, data=result, metadata={"format": output_format})
        except Exception as e:
            return SkillResult(success=False, error=str(e))


@register_skill
class VisualizationSkill(LLMSkill):
    """Generate scientific visualization code."""
    
    name = "visualization"
    display_name = "Scientific Visualization"
    description = "Generate publication-quality visualization code for scientific data"
    category = SkillCategory.VISUALIZATION
    parameters = [
        SkillParameter(name="data_description", description="Description of data to visualize", required=True),
        SkillParameter(name="plot_type", description="Type of visualization", required=True,
                      enum=["scatter", "line", "bar", "heatmap", "volcano", "manhattan", "survival", "network", "custom"]),
        SkillParameter(name="library", description="Visualization library", required=False, default="matplotlib",
                      enum=["matplotlib", "seaborn", "plotly", "ggplot2"]),
    ]
    
    async def execute(self, params: dict, context=None) -> SkillResult:
        valid, error = self.validate_params(params)
        if not valid:
            return SkillResult(success=False, error=error)
        
        data_desc = params["data_description"]
        plot_type = params["plot_type"]
        library = params.get("library", "matplotlib")
        
        prompt = f"""Generate {plot_type} visualization code:

Data: {data_desc}
Library: {library}

Provide:
1. **Complete Code**: Production-ready, with comments
2. **Customization Options**: Colors, fonts, sizes
3. **Publication Quality**: High DPI, proper labels
4. **Multiple Panels**: If appropriate (subplots)
5. **Statistical Annotations**: p-values, significance markers
6. **Export Options**: PDF, SVG, PNG

Follow journal guidelines for scientific figures."""

        try:
            result = await self.call_llm(prompt, self.get_system_prompt())
            return SkillResult(success=True, data=result, metadata={"plot_type": plot_type, "library": library})
        except Exception as e:
            return SkillResult(success=False, error=str(e))
