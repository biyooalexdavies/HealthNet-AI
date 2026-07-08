# Plan: Medical Knowledge Base Generation for HealthNet AI (NurseAda)

## Objective
Generate a comprehensive, evidence-based medical knowledge base for the HealthNet AI primary care chatbot. The content will serve as retrieval-augmented generation (RAG) source material covering primary care medicine across multiple domains.

## Chatbot Context
- **Name**: NurseAda (HealthNet AI)
- **Role**: Primary care clinical assistant
- **Features**: Symptom checker, herbal guidance, vitals, imaging, vaccination, prescriptions
- **Evidence Hierarchy**: WHO/CDC/NICE guidelines > Systematic reviews > Meta-analyses > RCTs > Textbooks
- **Safety**: Differential diagnoses only, emergency detection, uncertainty acknowledgment

## Content Architecture

### Volume 1: Primary Care Clinical Foundation
- Emergency recognition and red flag symptoms
- History-taking and physical examination frameworks
- Diagnostic reasoning and differential diagnosis methodology
- Evidence-based medicine principles

### Volume 2: Cardiovascular & Respiratory Medicine
- Hypertension, heart failure, coronary artery disease, arrhythmias
- Asthma, COPD, pneumonia, COVID-19, pulmonary embolism
- Chest pain evaluation, dyspnea assessment

### Volume 3: Gastroenterology & Hepatology
- GERD, peptic ulcer disease, IBS, IBD
- Liver disease, hepatitis, gallbladder disorders
- Acute abdomen evaluation

### Volume 4: Endocrinology & Metabolism
- Diabetes mellitus (Type 1 & 2), thyroid disorders
- Adrenal disorders, pituitary disease
- Metabolic syndrome, obesity management

### Volume 5: Neurology & Psychiatry
- Headache, seizures, stroke, dizziness
- Depression, anxiety, PTSD, substance use disorders
- Cognitive impairment, sleep disorders

### Volume 6: Infectious Diseases
- COVID-19, influenza, TB, HIV/AIDS
- STIs, UTIs, skin/soft tissue infections
- Travel medicine, tropical diseases

### Volume 7: Dermatology & Musculoskeletal
- Common skin conditions, eczema, psoriasis, acne
- Arthritis, back pain, osteoporosis
- Sports injuries, sprains/strains

### Volume 8: Pediatrics & Geriatrics
- Well-child care, developmental milestones
- Common pediatric illnesses
- Geriatric syndromes, polypharmacy, frailty

### Volume 9: Women's & Men's Health
- Gynecologic conditions, pregnancy-related care
- Menopause, contraception, breast health
- Prostate health, erectile dysfunction, male infertility

### Volume 10: Preventive Care & Public Health
- Vaccination schedules (CDC/WHO)
- Cancer screening guidelines
- Lifestyle medicine (nutrition, exercise, smoking cessation)
- Travel health, occupational medicine

### Volume 11: Herbal & Integrative Medicine
- Evidence-based herbal medicine
- Drug-herb interactions
- Safety and quality considerations

### Volume 12: Emergency Medicine & Critical Care
- ACLS protocols
- Trauma assessment
- Toxicology, overdose management
- Environmental emergencies

## Execution Strategy

### Stage 1: Deep Research
- Load `deep-research-swarm` skill
- Deploy parallel research agents for each volume
- Gather current clinical guidelines, evidence summaries
- Cross-verify sources (WHO, CDC, NICE, USPSTF, professional societies)

### Stage 2: Content Writing
- Load `report-writing` skill
- Deploy parallel writing agents for each volume
- Follow system prompt's clinical workflow framework
- Include differential diagnosis structures, red flags, evidence citations

### Stage 3: Quality Review & Assembly
- Clinical accuracy review
- Consistency check across volumes
- Format for RAG compatibility (chunked, cited, structured)
- Final assembly and delivery

### Stage 4: DOCX Production
- Load `docx` skill
- Convert final markdown to professional Word document
- Deliver complete knowledge base

## Output
- 12 comprehensive medical volumes in markdown
- Final assembled DOCX file
- Structured for RAG integration
- All content includes evidence citations and uncertainty markers
