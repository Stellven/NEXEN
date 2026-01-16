"""
Research methodology and scientific thinking skills.
"""

from nexen.skills.base import Skill, LLMSkill, SkillResult, SkillParameter, SkillCategory
from nexen.skills.registry import register_skill


@register_skill
class HypothesisGenerationSkill(LLMSkill):
    """Generate research hypotheses."""
    
    name = "hypothesis_generation"
    display_name = "Hypothesis Generation"
    description = "Generate testable research hypotheses based on observations or literature"
    category = SkillCategory.METHODOLOGY
    parameters = [
        SkillParameter(name="observation", description="Initial observation or research area", required=True),
        SkillParameter(name="context", description="Relevant background or constraints", required=False),
        SkillParameter(name="num_hypotheses", description="Number of hypotheses to generate", type="number", required=False, default=3),
    ]
    
    async def execute(self, params: dict, context=None) -> SkillResult:
        valid, error = self.validate_params(params)
        if not valid:
            return SkillResult(success=False, error=error)
        
        observation = params["observation"]
        ctx = params.get("context", "")
        num = params.get("num_hypotheses", 3)
        
        prompt = f"""Generate {num} testable research hypotheses:

Observation/Topic: {observation}
{f"Context: {ctx}" if ctx else ""}

For each hypothesis, provide:
1. **Hypothesis Statement**: Clear, specific, falsifiable
2. **Null Hypothesis (H0)**: 
3. **Alternative Hypothesis (H1)**:
4. **Rationale**: Why this hypothesis is plausible
5. **Predictions**: Specific, measurable outcomes
6. **Test Methods**: How to experimentally test it
7. **Potential Implications**: If confirmed/rejected

Rank by novelty and testability."""

        try:
            result = await self.call_llm(prompt, self.get_system_prompt())
            return SkillResult(success=True, data=result, metadata={"num_hypotheses": num})
        except Exception as e:
            return SkillResult(success=False, error=str(e))


@register_skill
class CriticalThinkingSkill(LLMSkill):
    """Apply scientific critical thinking to claims or papers."""
    
    name = "critical_thinking"
    display_name = "Scientific Critical Thinking"
    description = "Critically evaluate scientific claims, methods, or papers"
    category = SkillCategory.METHODOLOGY
    parameters = [
        SkillParameter(name="content", description="Claim, abstract, or paper summary to evaluate", required=True),
        SkillParameter(name="focus", description="Focus area", required=False, default="comprehensive",
                      enum=["methodology", "statistics", "claims", "reproducibility", "comprehensive"]),
    ]
    
    async def execute(self, params: dict, context=None) -> SkillResult:
        valid, error = self.validate_params(params)
        if not valid:
            return SkillResult(success=False, error=error)
        
        content = params["content"]
        focus = params.get("focus", "comprehensive")
        
        prompt = f"""Critically evaluate this scientific content (focus: {focus}):

{content}

Provide critical analysis:
1. **Claim Identification**: What are the main claims?
2. **Evidence Assessment**: Is evidence sufficient?
3. **Methodology Critique**: Strengths and weaknesses
4. **Statistical Validity**: Are analyses appropriate?
5. **Alternative Explanations**: What else could explain results?
6. **Reproducibility Concerns**: Can this be replicated?
7. **Bias Detection**: Potential sources of bias
8. **Missing Information**: What's not addressed?
9. **Overall Assessment**: Confidence level (low/medium/high)
10. **Recommendations**: What additional work is needed?

Be rigorous but constructive."""

        try:
            result = await self.call_llm(prompt, self.get_system_prompt())
            return SkillResult(success=True, data=result, metadata={"focus": focus})
        except Exception as e:
            return SkillResult(success=False, error=str(e))


@register_skill
class ExperimentDesignSkill(LLMSkill):
    """Design scientific experiments."""
    
    name = "experiment_design"
    display_name = "Experiment Design"
    description = "Design rigorous scientific experiments with proper controls"
    category = SkillCategory.METHODOLOGY
    parameters = [
        SkillParameter(name="hypothesis", description="Hypothesis to test", required=True),
        SkillParameter(name="resources", description="Available resources/constraints", required=False),
        SkillParameter(name="field", description="Scientific field", required=False,
                      enum=["biology", "chemistry", "medicine", "neuroscience", "computational", "general"]),
    ]
    
    async def execute(self, params: dict, context=None) -> SkillResult:
        valid, error = self.validate_params(params)
        if not valid:
            return SkillResult(success=False, error=error)
        
        hypothesis = params["hypothesis"]
        resources = params.get("resources", "")
        field = params.get("field", "general")
        
        prompt = f"""Design an experiment to test:

Hypothesis: {hypothesis}
Field: {field}
{f"Resources/Constraints: {resources}" if resources else ""}

Provide complete experimental design:
1. **Objectives**: Primary and secondary
2. **Variables**: 
   - Independent variables
   - Dependent variables
   - Controlled variables
3. **Controls**:
   - Positive controls
   - Negative controls
4. **Sample Size**: With power calculation rationale
5. **Randomization & Blinding**: Strategy
6. **Protocol**: Step-by-step procedure
7. **Data Collection**: What and how to measure
8. **Analysis Plan**: Statistical approach
9. **Expected Results**: Predicted outcomes
10. **Potential Pitfalls**: And mitigation strategies
11. **Timeline**: Estimated duration
12. **Ethical Considerations**: If applicable

Follow best practices for rigorous science."""

        try:
            result = await self.call_llm(prompt, self.get_system_prompt())
            return SkillResult(success=True, data=result, metadata={"field": field})
        except Exception as e:
            return SkillResult(success=False, error=str(e))


@register_skill  
class ScientificWritingSkill(LLMSkill):
    """Assist with scientific writing."""
    
    name = "scientific_writing"
    display_name = "Scientific Writing"
    description = "Help write and improve scientific manuscripts"
    category = SkillCategory.COMMUNICATION
    parameters = [
        SkillParameter(name="content", description="Draft text or topic to write about", required=True),
        SkillParameter(name="section", description="Manuscript section", required=True,
                      enum=["abstract", "introduction", "methods", "results", "discussion", "conclusion", "review"]),
        SkillParameter(name="style", description="Writing style/journal", required=False, default="academic"),
    ]
    
    async def execute(self, params: dict, context=None) -> SkillResult:
        valid, error = self.validate_params(params)
        if not valid:
            return SkillResult(success=False, error=error)
        
        content = params["content"]
        section = params["section"]
        style = params.get("style", "academic")
        
        prompt = f"""Write/improve a {section} section:

Content/Topic: {content}
Style: {style}

Provide:
1. **Polished Text**: Publication-ready prose
2. **Structure Notes**: Organization rationale
3. **Key Elements**: Required components for this section
4. **Transition Suggestions**: Flow connections
5. **Citation Placeholders**: Where references needed
6. **Common Mistakes to Avoid**: For this section type

Follow scientific writing best practices:
- Active voice when appropriate
- Precise language
- Logical flow
- Appropriate hedging for claims"""

        try:
            result = await self.call_llm(prompt, self.get_system_prompt())
            return SkillResult(success=True, data=result, metadata={"section": section, "style": style})
        except Exception as e:
            return SkillResult(success=False, error=str(e))
