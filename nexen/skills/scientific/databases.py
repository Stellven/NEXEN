"""
Scientific database query skills.
"""

from nexen.skills.base import Skill, LLMSkill, SkillResult, SkillParameter, SkillCategory
from nexen.skills.registry import register_skill


@register_skill
class UniProtSkill(LLMSkill):
    """Query UniProt protein database."""
    
    name = "uniprot_query"
    display_name = "UniProt Query"
    description = "Query UniProt for protein sequences, annotations, and functional information"
    category = SkillCategory.DATABASES
    parameters = [
        SkillParameter(name="query", description="Protein name, gene, or UniProt ID", required=True),
        SkillParameter(name="organism", description="Organism filter (e.g., 'human', 'mouse')", required=False),
        SkillParameter(name="include_sequence", description="Include amino acid sequence", type="boolean", required=False, default=False),
    ]
    
    async def execute(self, params: dict, context=None) -> SkillResult:
        valid, error = self.validate_params(params)
        if not valid:
            return SkillResult(success=False, error=error)
        
        query = params["query"]
        organism = params.get("organism", "")
        include_seq = params.get("include_sequence", False)
        
        prompt = f"""Query UniProt database for: "{query}"
{f"Organism: {organism}" if organism else ""}

Provide:
1. UniProt ID and Entry Name
2. Protein name and gene name
3. Function description
4. Subcellular location
5. Key domains and features
6. Post-translational modifications
7. Involvement in diseases (if any)
8. Key protein-protein interactions
{"9. Amino acid sequence (FASTA format)" if include_seq else ""}

Be comprehensive and include relevant citations."""

        try:
            result = await self.call_llm(prompt, self.get_system_prompt())
            return SkillResult(success=True, data=result, metadata={"query": query, "source": "uniprot"})
        except Exception as e:
            return SkillResult(success=False, error=str(e))


@register_skill
class PDBSkill(LLMSkill):
    """Query Protein Data Bank for structures."""
    
    name = "pdb_query"
    display_name = "PDB Query"
    description = "Query Protein Data Bank for 3D protein structures"
    category = SkillCategory.DATABASES
    parameters = [
        SkillParameter(name="query", description="Protein name, PDB ID, or keyword", required=True),
        SkillParameter(name="resolution", description="Max resolution in Angstroms", type="number", required=False),
        SkillParameter(name="method", description="Experimental method", required=False, 
                      enum=["X-ray", "cryo-EM", "NMR", "all"]),
    ]
    
    async def execute(self, params: dict, context=None) -> SkillResult:
        valid, error = self.validate_params(params)
        if not valid:
            return SkillResult(success=False, error=error)
        
        query = params["query"]
        resolution = params.get("resolution")
        method = params.get("method", "all")
        
        prompt = f"""Query PDB for structures related to: "{query}"
{f"Max resolution: {resolution} Å" if resolution else ""}
{f"Method: {method}" if method != "all" else ""}

For relevant structures, provide:
1. PDB ID
2. Title and description
3. Resolution and experimental method
4. Authors and publication
5. Chains and ligands
6. Biological assembly information
7. Link to structure viewer

Prioritize high-resolution, recent structures."""

        try:
            result = await self.call_llm(prompt, self.get_system_prompt())
            return SkillResult(success=True, data=result, metadata={"query": query, "source": "pdb"})
        except Exception as e:
            return SkillResult(success=False, error=str(e))


@register_skill
class ChEMBLSkill(LLMSkill):
    """Query ChEMBL for bioactive molecules."""
    
    name = "chembl_query"
    display_name = "ChEMBL Query"
    description = "Query ChEMBL for bioactive molecules, drug-like compounds, and bioactivity data"
    category = SkillCategory.DATABASES
    parameters = [
        SkillParameter(name="query", description="Compound name, target, or ChEMBL ID", required=True),
        SkillParameter(name="search_type", description="Search type", required=False, default="compound",
                      enum=["compound", "target", "assay", "activity"]),
    ]
    
    async def execute(self, params: dict, context=None) -> SkillResult:
        valid, error = self.validate_params(params)
        if not valid:
            return SkillResult(success=False, error=error)
        
        query = params["query"]
        search_type = params.get("search_type", "compound")
        
        prompt = f"""Query ChEMBL database for {search_type}: "{query}"

Provide relevant information:

For compounds:
- ChEMBL ID, SMILES, molecular formula
- Molecular weight, LogP, polar surface area
- Drug-likeness (Lipinski's rules)
- Known targets and bioactivity
- Clinical/development status

For targets:
- Target type and organism
- Associated compounds and their activities (IC50, EC50, Ki)
- Druggability assessment

For assays:
- Assay type and description
- Associated compounds and results

Format with clear structure and include activity values with units."""

        try:
            result = await self.call_llm(prompt, self.get_system_prompt())
            return SkillResult(success=True, data=result, metadata={"query": query, "source": "chembl"})
        except Exception as e:
            return SkillResult(success=False, error=str(e))


@register_skill
class AlphaFoldDBSkill(LLMSkill):
    """Query AlphaFold Protein Structure Database."""
    
    name = "alphafold_query"
    display_name = "AlphaFold DB Query"
    description = "Query AlphaFold Database for predicted protein structures"
    category = SkillCategory.DATABASES
    parameters = [
        SkillParameter(name="query", description="UniProt ID or protein name", required=True),
        SkillParameter(name="organism", description="Organism filter", required=False),
    ]
    
    async def execute(self, params: dict, context=None) -> SkillResult:
        valid, error = self.validate_params(params)
        if not valid:
            return SkillResult(success=False, error=error)
        
        query = params["query"]
        organism = params.get("organism", "")
        
        prompt = f"""Query AlphaFold Database for: "{query}"
{f"Organism: {organism}" if organism else ""}

Provide:
1. UniProt ID and protein name
2. Predicted structure availability
3. Per-residue confidence (pLDDT) overview
4. High-confidence regions (pLDDT > 90)
5. Low-confidence/disordered regions
6. Predicted aligned error (PAE) interpretation
7. Comparison with experimental structures (if available)
8. Download links (PDB, mmCIF formats)

Discuss structural insights and confidence interpretation."""

        try:
            result = await self.call_llm(prompt, self.get_system_prompt())
            return SkillResult(success=True, data=result, metadata={"query": query, "source": "alphafold"})
        except Exception as e:
            return SkillResult(success=False, error=str(e))


@register_skill
class DrugBankSkill(LLMSkill):
    """Query DrugBank for drug information."""
    
    name = "drugbank_query"
    display_name = "DrugBank Query"
    description = "Query DrugBank for drug information, interactions, and pharmacology"
    category = SkillCategory.DATABASES
    parameters = [
        SkillParameter(name="drug", description="Drug name or DrugBank ID", required=True),
        SkillParameter(name="include_interactions", description="Include drug interactions", type="boolean", required=False, default=True),
    ]
    
    async def execute(self, params: dict, context=None) -> SkillResult:
        valid, error = self.validate_params(params)
        if not valid:
            return SkillResult(success=False, error=error)
        
        drug = params["drug"]
        include_interactions = params.get("include_interactions", True)
        
        prompt = f"""Query DrugBank for: "{drug}"

Provide comprehensive drug information:
1. Generic name and brand names
2. DrugBank ID and external IDs
3. Drug category and classification
4. Mechanism of action
5. Pharmacodynamics
6. ADME properties (Absorption, Distribution, Metabolism, Excretion)
7. Targets (enzymes, transporters, carriers)
8. Approved indications
9. Side effects and toxicity
{"10. Drug-drug interactions (major ones)" if include_interactions else ""}

Include relevant structure information (SMILES, molecular weight)."""

        try:
            result = await self.call_llm(prompt, self.get_system_prompt())
            return SkillResult(success=True, data=result, metadata={"drug": drug, "source": "drugbank"})
        except Exception as e:
            return SkillResult(success=False, error=str(e))
