# Facial and hair diversity: research for owner review

Research date: 2026-10-24. Current status: **implementation continuation authorised on 2026-10-24; first executable slices in progress**. See the [implementation record](implementation-progress.md) for delivered behaviour, evidence and remaining work.

The owner subsequently requested, “continue implemenation of the face anatomy chnages in design, code and so on.” This authorises continuing the design and application implementation. The earlier personal-approval hold below describes the research handoff before that request; it is no longer a reason to hold routine implementation. It does not constitute visual acceptance of a finished head or resolution of the research gaps.

Re-audited on 2026-10-24 at the owner's request. The [audit and lifelike-human acceptance contract](audit-and-realism.md) records source checks, corrections, remaining uncertainty and the revised delivery priority: prove one convincing adult head in the actual renderer before expanding the feature library. Scientific plausibility, individual likeness and population coverage are separate acceptance questions.

This review addresses hair, face, eyes, nose, eyebrows, eyelids, lips, mouth, teeth, ears, beard, mustache, and related visible detail for GrowthTrack's adult human editor. It examines global genetics and appearance research, with a separate India/Tamil Nadu review. The research pass itself changed no application code, model, database, or existing approval record; the later implementation continuation is recorded separately.

The defensible implementation direction is an anatomically structured, individually editable human model. Geography and community identity help audit representation; they do not determine a person's face. The supporting research distinguishes genetic ancestry, language, ethnicity, nationality and community membership [S01].

**The request to research every tribe, region and every detail is not complete.** This is a documented scoping review, not an exhaustive systematic review or a population census. Published datasets cover selected people and traits, often with substantial sampling restrictions. A list of communities is not evidence that their appearance has been studied. Missing evidence is recorded explicitly in the [coverage ledger](coverage.md). No claim of universal coverage or scientifically validated community presets is made.

Read alongside the [concrete implementation proposal](implementation-proposal.md) and [current implementation record](implementation-progress.md). The first continuation concentrates on the reusable feature registry, supported shape controls and oral fallback. Population research, calibrated measurements and the reference-matched complete head remain separate open requirements; unsupported features are not presented as implemented merely because they appear in a matrix.

## Research method and limits

Searches covered primary research and official dataset documentation on population genomics, facial GWAS, hair geometry/pigmentation, eyes/lids, nasal shape, ears, teeth, South Asian population history, Tamil Nadu communities and facial measurements. Sources were sought through publisher sites, PubMed/PMC, FaceBase, GenomeIndia, government records and the Global Indigenous Data Alliance. Representative search terms included `facial morphology GWAS Tanzanian`, `hair beard eyebrow genetics`, `tooth crown dimensions EDAR`, `Tamil Nadu facial anthropometry`, and `Toda Kota Irula genetics`.

The source register below distinguishes abstracts, extracted article sections, project documentation and indexed excerpts. It does not imply that every supplement or underlying dataset was downloaded or independently reanalysed. Peer-reviewed studies, preprints, old anthropometry and administrative inventories have different evidentiary roles. Social posts, unsourced phenotype charts and search-result images were not used as trait evidence.

For any future numerical use, record the sample size for the actual analysis, recruitment location, self-described population, age range, measurement definitions, covariates, uncertainty, data access terms and replication. A total project sample size is not automatically the sample size of each facial trait analysis. Shared cohorts across papers must not be counted as independent replication.

The re-audit checks whether sources support the report's statements. It does not independently reproduce their statistics or establish that each published conclusion is correct. In particular, S10/S16/S20 reuse CANDELA participants, and S13/S14 include overlapping cohort resources. Their combined sample counts cannot be treated as independent coverage. Research predating current terminology is retained only for its specific observations and methods.

## What genetics supports

Human variation reflects inheritance, migration and gene flow, drift, selection, development and individual life history. Population labels are useful only when their meaning and sampling are explicit. Large reference resources illustrate both breadth and gaps: 1000 Genomes phase 3 sampled 2,504 people in 26 populations; HGDP sequenced 929 people in 54 populations; SGDP sampled 300 people in 142 populations [S02–S04]. These are genomic resources, not complete paired 3D face-and-hair libraries.

GenomeAsia's pilot included 1,739 people from 219 population groups, with about 80% of samples from Asia. Its 64 countries refer to the overall source sample, including comparison samples outside Asia [S05]. These numbers must not become a claim that hundreds of representative facial templates are available.

A 2025 European facial study analysed 946 landmark-derived traits in 11,662 participants. Its associated variants explained **up to 7.9% of variation per trait** in that study; this is neither a global accuracy estimate nor a percentage of a whole face that can be reconstructed [S13]. A separate multi-ancestry analysis included East Asian and European cohorts, which does not establish validity for every other ancestry [S14]. Tanzanian facial research demonstrates that cross-population transfer can be partial, and its child/adolescent cohort cannot directly calibrate adult faces [S15].

The September 2026 developmental atlas links facial variation with cell states and regulatory mechanisms during embryonic development [S22]. It strengthens the biological basis for studying facial regions, but supplies no ready-to-use mapping from a community name to adult mesh sliders.

**Design consequence:** genetics informs what can vary and why validation must be broad. It does not supply a deterministic avatar generator. Keep genetic analysis out of the proposed runtime. Let the person choose or measure visible features, without requiring DNA, caste, ethnicity or tribal membership.

## Findings by feature

The proposed controls in this table are engineering decisions informed by the evidence, not numerical distributions copied from a study.

| Feature | Research finding and boundary | Proposed representation |
| --- | --- | --- |
| Scalp hair | A geometric study measured hair from 2,449 people in 22 countries and classified shape without using ethnic labels [S09]. Genetic studies distinguish shape, colour, greying and loss [S10]. | Separate curvature, curl radius/pitch, strand diameter, density, length, growth direction, clumping, frizz, hairline, parting and style. Record grooming separately from fibre properties. |
| Hair pigmentation | Pigmentation mechanisms are not identical across populations. The Solomon Islands TYRP1 study is a specific example of blond hair arising outside the familiar European genetic context [S11]. | Independent scalp, brow, lash, beard and mustache colours; natural colour, dye and greying as separate layers. Do not lock hair colour to skin colour. |
| Face/head | Facial shape is multidimensional and partly heritable; landmark studies measure selected aspects rather than all appearance [S13–S16, S22]. | Cranial and forehead shape, facial height/width/depth, temples, cheekbones, cheek fullness, jaw angle/width, chin projection/height, and editable asymmetry. Separate identity from expression. |
| Eyes | A large eye-colour GWAS found many associated regions, with a much larger European discovery sample than Asian replication sample [S12]. | Iris colour/pattern, limbal ring, pupil, sclera, globe placement and gaze. Eye size must not silently rescale every eyelid feature. Left/right differences remain possible. |
| Eyelids | A Han Chinese study of 697 people found limited predictive performance for crease presence; this does not describe all eyelid shapes or all East Asian populations [S18]. | Independent crease visibility/height, hooding, upper/lower lid contour, medial fold, opening width/height and corner tilt; maintain lid-to-globe contact through blinking and gaze. |
| Eyebrows | Hair GWAS associations include eyebrow thickness and connected-brow variation, distinct from scalp hair [S10]. | Separate density, width, arch, start/end position, spacing, direction, length, colour and left/right editing. Brow ridge depth is a different shape control. |
| Eyelashes | The brows/lashes are distinct rendered structures; the reviewed evidence does not establish universal community-specific lash distributions. | Upper/lower rows, length, density, curvature and direction; roots follow the lid, including full closure. Cosmetic treatments are optional styling. |
| Nose | S17's nares-width association concerns temperature and absolute humidity; sensitivity analysis depends on including the northern European sample. It does not explain all nasal form. | Root position, bridge width/height/profile, length, tip projection/rotation/fullness, alar width, nostril form and columella; do not infer these from current climate. |
| Lips | Latin American research includes lip-related traits and genetic associations [S16]. Its sample does not justify assigning one lip shape to a whole population. | Separate upper/lower vermilion height, projection, Cupid's bow, philtrum, corner position, width, colour and surface detail. Preserve contact at rest. |
| Mouth | External profile landmarks do not establish an individual's internal oral anatomy. | Opening width, corner motion, lip seal, jaw articulation, gums, tongue, palate and cavity; expressions and speech must deform a fitted oral assembly. |
| Teeth | The reviewed dental GWAS examined crown dimensions and implicated multiple loci, including EDAR and PITX2-related findings [S21]. | Distinct tooth forms, crown dimensions, arch, spacing, alignment, wear and colour. Replace the current repeated rounded tooth primitives with authored dental anatomy. |
| Ears | Earlobe attachment has polygenic evidence; additional studies measure many ear dimensions [S19–S20]. | Length/width, rotation/protrusion, lobe size/attachment, helix, antihelix, concha and tragus; support asymmetry and optional modifications. |
| Beard | Genetic associations and small mechanistic follicle studies support treating facial hair separately from scalp hair [S10, S38]. Neither predicts an individual's growth from identity. | Independent cheek/chin/jaw/neck/sideburn masks, patchiness, density, diameter, curl, length, direction, colour and greying. |
| Mustache | The reviewed evidence does not provide a globally validated, mustache-specific genotype-to-shape model. Style is an individual grooming choice. | Separate upper-lip groom with width, height, centre gap, density, length, curl, direction, tips, colour and optional beard connections. |
| Related detail | Pigmentation studies show variation within sampled populations as well as between them [S08, S28]. | Freckles, moles, scars, pores, peach fuzz, wrinkles, lip/ear colour variation and optional piercings. Appearance features remain editable without diagnosis. |

### Useful gene examples, with their actual meaning

These are research annotations, **not proposed UI inputs or biological rules**. A named locus may contain a causal variant, tag nearby variation, or have a functional interpretation that remains incomplete.

| Trait area | Examples in reviewed research | Interpretation limit |
| --- | --- | --- |
| Hair shape and facial hair | PRSS53, EDAR; scalp and beard signals can involve different variants [S10] | One gene name does not specify one hairstyle or beard. |
| Brows and greying | FOXL2-region eyebrow association; IRF4-region greying association [S10] | No mandatory coupling of brow density, colour and age. |
| Eye pigmentation | HERC2/OCA2 and many other regions [S12] | A simple brown-dominant/blue-recessive model is inadequate. |
| Skin pigmentation | SLC24A5, MFSD12, DDB1/TMEM138, OCA2/HERC2 in particular cohorts [S08, S28] | Effect sizes and allele frequencies are sample dependent; none is an ethnicity switch. |
| Face and teeth | Multiple developmental/regulatory regions; PITX2 and EDAR-related dental findings [S13, S21–S22] | Association is not a clinically or visually validated morph target. |

## India and Tamil Nadu

India must be treated as internally diverse. Older ANI/ASI models and later ancient-DNA studies describe inferred population history; they are not two living races or two face templates. Endogamy and founder effects can affect genetic structure without making members of a community visually uniform. Older studies also excluded or underrepresented groups whose histories did not fit the principal model [S23–S25].

Clustering plots also need a model check: inferred ancestry proportions can change with sampling, drift and assumptions. A methodological study demonstrates how apparently plausible mixture histories can be misleading [S43]. Consequently, the proposed editor must not turn an ancestry percentage into the same percentage blend of two face meshes.

The GenomeIndia consortium's 2025 project account describes a 10,000-genome effort across 83 populations [S27]. The specific **March 2026 preprint version reviewed** reports 9,768 analysed whole genomes from 83 populations [S26]. These are different reporting stages. The preprint is useful current context, but it is not being presented here as a peer-reviewed face study, a census of every Indian community, or a source of licensed head meshes.

South Asian pigmentation research reported substantial within-cohort variation. Its major 1,228-person cohort was from Andhra Pradesh; the separate multi-state cohort included Tamil Nadu [S28]. Calling the former a Tamil Nadu measurement dataset would be incorrect.

These are phenotype recruitment counts: S28 genotyped 242 people from cohort A and 277 of cohort B's 446 people. The sampling and assay denominators must stay separate. Inner-arm melanin measurements are also not calibrated facial RGB textures.

A separate Indian study tested 22 candidate variants in 299 people from nine locations and reported associations with measured pigmentation [S42]. This adds trait-specific evidence, without establishing the distribution of other facial features or a state-wide reference population.

A March 2026 study directly examined visible features in 521 North Indian adults aged 18–50, using photographs and categorical observations. It covers scalp/facial hair, brows, ears, eyes/lids, nose, lips and dimples in six named samples [S41]. This is useful evidence that several requested traits have been studied together in India. The abstract describes phenotype associations, not a validated DNA-to-face prediction model; its categories are not ready-made 3D controls. Full methods, subgroup counts, sampling bias and reuse rights need review before numerical or image reuse. The coverage ledger records the exact groups rather than treating these participants as all North Indians.

For Tamil Nadu specifically:

- The 2003 Nilgiris study examined eight insertion/deletion markers in 250 people from five named populations. It was not a face, eye, beard or hair-shape study [S29].
- A 2016 Tamil Nadu/Kerala study reports seven Alu markers across twelve groups. Its stated total of 574 conflicts with Figure 1 subgroup counts summing to 591; the inspected correction does not resolve this. Retain as qualified genetic context only [S30].
- A 1981 paper reports head/face measurements in Toda, Kota, Kurumba and Irula samples collected in 1978/1980. It used supraorbitale rather than nasion for some heights. Its historical racial interpretations are not adopted, and its measurements cannot be silently pooled with modern landmark definitions [S31].
- A 2020 hospital convenience sample included 200 adults aged 18–25, of whom 132 reported Tamil Nadu origin. It is not a statewide survey. Numerical reporting issues and rejected racial-essentialist framing are recorded in the audit [S32].

The [coverage ledger](coverage.md) includes separate Tamil Nadu community entries and regional research gaps. Administrative recognition, language, citizenship and genetic sampling labels are recorded separately. In particular, a paper's spelling or use of “tribal” is not enough to resolve current legal status or equate similarly named groups.

## Existing project findings

This includes source inspection and reinspection of the existing `artifacts/human-r2/human-r2-oblique.png` source render. It is not a new live-browser or visual certification. The full-body image cannot establish face close-up or motion quality. Earlier automated checks remain historical evidence.

| Inspected area | What is already present | Gap relevant to this request |
| --- | --- | --- |
| `src/config/appearanceDetail.json` | Iris colour/pupil controls; hair density/grey controls; bald and short marked available | Additional listed hairstyles are marked unavailable; config labels do not prove an authored groom exists. |
| `src/components/physique/LikenessControls.jsx` | Neutral/broad/soft starting faces and local manual reference image | These are artistic presets, not calibrated regional or personal reconstructions. |
| `src/components/morphEngine/morphMath.js` | Face channels including bridge/tip, lip fullness, eye size, jaw, chin, ears; blink/smile/jaw opening | Combined controls are too coarse for the feature separation proposed above. |
| `src/lib/physiqueProfile.js` | Persistence mappings for several appearance fields, including facial hair | A stored field is not proof of a distinct visible, supported rendering behavior. |
| `src/components/morphEngine/featureMaterials.js` | Seeded card density/greying; brows/lashes material setup | Default brow/lash colour is derived from scalp hair; independent controls need an explicit path. |
| `src/components/morphEngine/browSurfaceBinding.js` | Existing skin-triangle binding | Reuse and extend this ownership model when new head shapes are authored. |
| `src/components/morphEngine/faceGeometry.js` | Mouth correction; two 12-primitive dental arches, gums, tongue and cavity attached to posed lip anchors | Repeated ellipsoids and gap-driven lower-arch movement need replacement with differentiated teeth and a fitted jaw rig. |
| `src/components/morphEngine/surfaceParts.js` | Cornea/tearline material and update paths | Their presence does not establish calibrated eye optics. |
| `src/components/body3d/physicalSkinMaterial.js` | Opaque physical material; restrained sheen/clearcoat; transmission disabled | No implemented subsurface diffusion. Existing AO/UV2 comment is stale against installed Three.js 0.184.0; investigate the actual texture channels and baked shading. |
| `src/config/appearanceDetail.json` | `humanRealismPercent` and an exposure-following pupil option | A material-strength value is not measured realism. Camera exposure is not incident light at the eye; retain an explicit artistic/proxy distinction. |
| [R2 human asset record](../17-human-asset-family.md) | New scalp groom and core/hero assets; existing facial assembly retained | The record itself leaves face/eye/dental and close-up groom acceptance open. |

## What is ready, and what remains open

Ready for owner review: the feature decomposition, evidence limitations, regional coverage structure, source-backed findings, project gap analysis and staged implementation proposal.

Still open: every-community coverage; representative modern 3D data for many regions; contemporary Tamil Nadu community-level face/hair distributions; dataset/asset reuse permissions; calibrated numerical shape ranges; an approved reference set; and all new implementation and visual acceptance work. “Not verified in this review” means exactly that, not that a community has no research or no distinctive cultural practices.

No ethnicity classifier, DNA-to-face service, trait ranking, or claim about intelligence, character or worth is part of the proposal. This is a human appearance editor.

## Source register

All sources below were consulted on 2026-10-24. “Sections” means the extracted sections relevant to this report, not an audit of the complete paper and every supplement. Abstract-only entries are not eligible for importing numerical calibration constants without further methods review. Access to a publication does not automatically license participant images or meshes.

| ID | Primary or official source | Material inspected and use |
| --- | --- | --- |
| S01 | [NHGRI: Use of Population Descriptors in Genomics](https://www.genome.gov/about-genomics/policy-issues/population-descriptors-in-genomics) | Official explanatory page; descriptor distinctions and within-group variation. |
| S02 | [1000 Genomes: A global reference for human genetic variation (2015)](https://www.nature.com/articles/nature15393) | Article sections and project summary; genomic coverage, not facial coverage. |
| S03 | [Bergström et al.: 929 diverse genomes (2020)](https://pmc.ncbi.nlm.nih.gov/articles/PMC7115999/) | Indexed article excerpts/abstract; HGDP scope. |
| S04 | [Mallick et al.: Simons Genome Diversity Project (2016)](https://pmc.ncbi.nlm.nih.gov/articles/PMC5161557/) | Abstract/introduction; broad but shallow per-population sampling. |
| S05 | [GenomeAsia100K Consortium (2019)](https://www.nature.com/articles/s41586-019-1793-z) | Abstract, sample description, data availability; Asian coverage and access limits. |
| S06 | [Almarri et al.: The genomic history of the Middle East (2021)](https://www.sciencedirect.com/science/article/pii/S0092867421008394) | Abstract and dataset description; eight sampled populations, not all MENA communities. |
| S07 | [Malaspinas et al.: A genomic history of Aboriginal Australia (2016)](https://www.nature.com/articles/nature18299) | Abstract/sample description; Pama–Nyungan speakers and Papuan sample, not all Australian peoples. |
| S08 | [Crawford et al.: Pigmentation loci in African populations (2017)](https://pmc.ncbi.nlm.nih.gov/articles/PMC5759959/) | Methods/results excerpts; measured pigmentation and cohort-specific associations. |
| S09 | [Loussouarn et al.: Worldwide diversity of hair curliness (2007)](https://pubmed.ncbi.nlm.nih.gov/17919196/) | Abstract; objective hair geometry, industry research affiliation. |
| S10 | [Adhikari et al.: Scalp and facial hair GWAS (2016)](https://www.nature.com/articles/ncomms10815) | Abstract and candidate-gene sections; multiple independently measured hair traits. |
| S11 | [Kenny et al.: Solomon Islands blond hair and TYRP1 (2012)](https://pubmed.ncbi.nlm.nih.gov/22556244/) | Abstract; population-specific pigmentation mechanism. |
| S12 | [Simcoe et al.: Eye-colour GWAS (2021)](https://pmc.ncbi.nlm.nih.gov/articles/PMC7946369/) | Abstract and sample/methods excerpts; polygenic trait and sampling imbalance. |
| S13 | [Combined GWAS of European facial traits (2025)](https://pubmed.ncbi.nlm.nih.gov/40670343/) | Abstract and publisher excerpts; explained variation and cross-ancestry replication. |
| S14 | [Du et al.: Multi-ancestry facial GWAS (2024 online; 2025 issue)](https://pubmed.ncbi.nlm.nih.gov/39002897/) | Abstract; East Asian/European sampling boundary. |
| S15 | [Liu et al.: East African facial genome scans (2021)](https://pmc.ncbi.nlm.nih.gov/articles/PMC8375984/) | Abstract/results excerpts; Tanzanian children and partial cross-population overlap. |
| S16 | [Bonfante et al.: Latin American facial GWAS (2021)](https://pmc.ncbi.nlm.nih.gov/articles/PMC7864580/) | Abstract and phenotyping sections; profile landmarks and lip/midface findings. |
| S17 | [Zaidi et al.: Nose shape and climate (2017)](https://journals.plos.org/plosgenetics/article?id=10.1371/journal.pgen.1006616) | Abstract, sensitivity analysis and access terms. [2018 correction](https://journals.plos.org/plosgenetics/article?id=10.1371/journal.pgen.1007207) checked: author-name spelling only. |
| S18 | [Wang et al.: Eyelid traits in a Han Chinese sample (2021)](https://pubmed.ncbi.nlm.nih.gov/33969445/) | Abstract; modest cohort-specific prediction, not a global model. |
| S19 | [Shaffer et al.: Polygenic earlobe attachment (2017)](https://pmc.ncbi.nlm.nih.gov/articles/PMC5812923/) | Indexed article excerpts; attachment is not a single Mendelian switch. |
| S20 | [Li et al.: 136 quantitative ear traits (2023)](https://journals.plos.org/plosgenetics/article?id=10.1371/journal.pgen.1010786) | Abstract/indexed sections; multi-dimensional ear morphology. |
| S21 | [PITX2/HS3ST3A1 and tooth dimensions (2025 issue)](https://www.sciencedirect.com/science/article/pii/S0960982224015689) | Publisher highlights and indexed PMC methods/results excerpts; crown dimensions. Direct PMC open encountered a challenge, so no full-text audit claimed. |
| S22 | [Erickson et al.: Atlas underlying facial diversity (2026)](https://www.nature.com/articles/s41588-026-02748-y) | Abstract and introductory sections; developmental mechanisms. |
| S23 | [Reich et al.: Reconstructing Indian population history (2009)](https://pmc.ncbi.nlm.nih.gov/articles/PMC2842210/) | Article excerpts; historical mixture model and its assumptions. |
| S24 | [Moorjani et al.: Population mixture in India (2013)](https://pmc.ncbi.nlm.nih.gov/articles/PMC3769933/) | Abstract/methods/results excerpts; endogamy and sampling exclusions. |
| S25 | [Narasimhan et al.: South and Central Asian population formation (2019)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6822619/) | Abstract and article excerpts; ancient-DNA history, not modern face templates. |
| S26 | [GenomeIndia: An Atlas of Indian Genetic Diversity, v1 (2026)](https://www.medrxiv.org/content/10.64898/2026.03.20.26348801v1) | **Preprint**, 9,768 analysed genomes/83 populations; indexed [full-text methods](https://www.medrxiv.org/content/10.64898/2026.03.20.26348801v1.full) rechecked. Direct retrieval returned 403. |
| S27 | [GenomeIndia: consortium publication account](https://genomeindia.in/naturegentic.php) | Official project page; 2025 project description and link to 2026 manuscript. |
| S28 | [Basu Mallick et al.: SLC24A5 in South Asia (2013)](https://pmc.ncbi.nlm.nih.gov/articles/PMC3820762/) | Abstract, cohort description and results; distinguish Andhra Pradesh from multi-state samples. |
| S29 | [Vishwanathan et al.: Southern Indian insertion/deletion markers (2003)](https://pubmed.ncbi.nlm.nih.gov/15018036/) | Abstract; five Nilgiris populations, no face measurements. |
| S30 | [Chinniah et al.: Alu polymorphisms in South India (2016)](https://pmc.ncbi.nlm.nih.gov/articles/PMC4912101/) | Methods/Figure 1 and [correction](https://pmc.ncbi.nlm.nih.gov/articles/PMC4999302/) inspected; total mismatch unresolved; no appearance associations. |
| S31 | [Abe: Nilgiris somatometric comparison (1981)](https://www.jstage.jst.go.jp/article/ase1911/89/1/89_1_71/_article/-char/en) | Detailed abstract; historical measurements, incompatible landmarks and rejected racial interpretation. |
| S32 | [Radha and Srinivasan: South Indian facial anthropometry (2020)](https://www.ojhas.org/issue74/2020-2-11.html) | Methods and Tables 1–5 rechecked; convenience sample and reporting inconsistencies; no numerical calibration. |
| S33 | [Census India: Tamil Nadu district-wise ST appendix, 2011](https://censusindia.gov.in/nada/index.php/catalog/43032) | Official catalogue/indexed rows; historical administrative inventory, not facial data. |
| S34 | [Tamil Nadu G.O. 21, 30 March 2023](https://www.bcc.tn.gov.in/ords/r/wstnbcc/107/files/static/v351/G.O.%28Ms%29%20No.21%2C%20dt.30.3.2023-12.pdf) | Indexed official text; addition of Narikoravan, Kurivikkaran as entry 37. |
| S35 | [Ministry of Tribal Affairs: state-wise list, 2024](https://tribal.nic.in/downloads/statistics/LatestListScheduledTribes2024.pdf) | Indexed official extract; direct PDF retrieval failed. Inventory cross-checked with S33/S34 and [2023 list](https://tribal.nic.in/downloads/Statistics/NotifiedSTslistsason040823.pdf). Not a legal eligibility determination. |
| S36 | [Global Indigenous Data Alliance: CARE principles](https://www.gida-global.org/careprinciples) | Official principles; community authority and purpose-aware data reuse. |
| S37 | [FaceBase: 3D Facial Norms technical notes](https://www.facebase.org/resources/human/facial_norms/notes/) | Official recruitment/exclusion documentation; useful methodology with limited population scope. |
| S38 | [Thornton et al.: Beard/scalp follicle metabolism (1993)](https://pubmed.ncbi.nlm.nih.gov/8287580/) | Abstract/methods; small cell-culture experiment, mechanistic support only. |
| S39 | [Disney: Practical hair/fur model (2016)](https://media.disneyanimation.com/uploads/production/publication_asset/152/asset/eurographics2016Fur_Smaller.pdf) | Indexed paper abstract; rendering reference, not a measured browser performance target. |
| S40 | [Khronos: glTF registry](https://registry.khronos.org/glTF/) and [render fidelity reference](https://github.khronos.org/glTF-Render-Fidelity/) | Official specifications/reference tools; export capabilities require actual application verification. |
| S41 | [Kataria et al.: Visible characteristics among North Indians (2026)](https://pubmed.ncbi.nlm.nih.gov/41879854/) | Abstract and consent declaration; six samples, 521 adults; direct phenotype observations, no validated DNA prediction established by the inspected material. |
| S42 | [Sarkar and Nandineni: Skin-colour variants in Indian populations (2017 online; 2018 issue)](https://pubmed.ncbi.nlm.nih.gov/28984396/) | Indexed abstract; 299 participants across nine locations; candidate-variant study, not a facial atlas. Direct page extraction was incomplete. |
| S43 | [Lawson et al.: Interpreting STRUCTURE and ADMIXTURE plots (2018)](https://www.nature.com/articles/s41467-018-05257-7) | Indexed methods/results excerpts; simulations and real-data examples of misleading ancestry interpretation. |
| S44 | [Weyrich et al.: Measured skin reflectance (2006)](https://cgl.ethz.ch/Downloads/Publications/Papers/2006/Wey06/Wey06.pdf) | Abstract and model description; 149 subjects; separates surface reflectance, albedo and subsurface scattering. Not a global pigmentation atlas. |
| S45 | [Bérard et al.: High-Quality Capture of Eyes (2014)](https://studios.disneyresearch.com/2014/11/19/high-quality-capture-of-eyes/) | Author publication page and abstract; separate, coupled sclera/cornea/iris reconstruction. |
| S46 | [USC ICT / Image Metrics: Digital Emily](https://vgl.ict.usc.edu/Research/DigitalEmily/) | Original project account and technical-report abstract; capture, expression rig, reflectance and matched lighting. A production example, not a browser benchmark. |
| S47 | [Farkas et al.: International facial anthropometry (2005)](https://pubmed.ncbi.nlm.nih.gov/16077306/) | Abstract; 1,470 young adults, 14 measurements, small local samples across several regions. Exact subgroup tables not reviewed; no added community coverage claimed. |
| S48 | [Three.js: Color management](https://threejs.org/manual/pages/color-management.html) | Official guide; linear-light computation and correct input/output colour-space handling. |
| S49 | [Three.js: MeshPhysicalMaterial](https://threejs.org/docs/pages/MeshPhysicalMaterial.html) | Official material documentation, cross-checked against installed 0.184.0 source; transmission controls do not establish skin diffusion. |
| S50 | [Jimenez et al.: Separable Subsurface Scattering (2015)](https://www.iryoku.com/separable-sss/) | Author project abstract and implementation reference; candidate real-time approximation, with no imported performance claim. |
| S51 | [Ministry of Tribal Affairs: list dated 26 September 2025](https://tribal.nic.in/downloads/statistics/ListScheduledTribes26092025.pdf) | Newer indexed Tamil Nadu extract located; direct retrieval failed. Does not certify the entire current inventory; unresolved entries remain explicit. |

## Review decision

Proposed approval scope: the adult feature editor and asset work in the linked proposal, with the coverage gaps visibly retained. This would not approve claims of comprehensive population coverage or DNA-based likeness. If every community must have direct evidence before any implementation, that prerequisite remains unmet and requires a much larger, continuing research programme.

Owner decision: **pending**. No approval has been inferred from earlier, different model work.
