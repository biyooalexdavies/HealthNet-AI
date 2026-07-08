import { DiagnosisResult } from '../types';

/**
 * Diagnostic Knowledge Base Structure
 * maps: Disease Name -> { Symptoms -> Weight, adjustmentCount for learning rate decay }
 */
export interface KnowledgeBase {
  [disease: string]: {
    symptoms: { [symptom: string]: number };
    urgency: 'low' | 'medium' | 'high' | 'emergency';
    recommendations: string[];
    herbalAlternatives?: string[];
    adjustmentCount?: number;
  };
}

/**
 * Symptom Alias Map
 * Maps informal/alternative symptom names to their canonical form.
 * This dramatically increases match rate for user-described symptoms.
 */
const SYMPTOM_ALIASES: { [alias: string]: string } = {
  // Fever variants
  "high temperature": "high fever",
  "burning up": "high fever",
  "feverish": "fever",
  "low grade fever": "mild fever",
  "slight fever": "mild fever",
  // Respiratory
  "blocked nose": "runny nose",
  "stuffy nose": "runny nose",
  "nasal congestion": "runny nose",
  "throat pain": "sore throat",
  "scratchy throat": "sore throat",
  "dry cough": "cough",
  "wet cough": "cough",
  "persistent cough": "cough",
  "coughing up blood": "hemoptysis",
  "blood in cough": "hemoptysis",
  // Pain
  "head pain": "headache",
  "migraine": "headache",
  "body aches": "muscle aches",
  "body pain": "muscle aches",
  "joint pain": "arthralgia",
  "joint stiffness": "arthralgia",
  "tummy pain": "abdominal pain",
  "stomach ache": "abdominal pain",
  "stomach pain": "abdominal pain",
  "belly pain": "abdominal pain",
  "lower back pain": "back pain",
  "lumbago": "back pain",
  "pelvic pain": "lower abdominal pain",
  // Gastrointestinal
  "feeling sick": "nausea",
  "queasy": "nausea",
  "throwing up": "vomiting",
  "being sick": "vomiting",
  "loose stools": "diarrhea",
  "watery stool": "diarrhea",
  "constipated": "constipation",
  "bloated": "bloating",
  "stomach bloating": "bloating",
  "acid reflux": "heartburn",
  "indigestion": "heartburn",
  "blood in stool": "rectal bleeding",
  "bloody stool": "rectal bleeding",
  // General
  "tiredness": "fatigue",
  "exhaustion": "fatigue",
  "feeling tired": "fatigue",
  "no energy": "fatigue",
  "shivering": "chills",
  "cold sweats": "sweating",
  "night sweats": "sweating",
  "watery eyes": "itchy eyes",
  "red eyes": "itchy eyes",
  "hard to breathe": "shortness of breath",
  "difficulty breathing": "shortness of breath",
  "breathlessness": "shortness of breath",
  "no appetite": "loss of appetite",
  "not hungry": "loss of appetite",
  "skin rash": "rash",
  "skin irritation": "rash",
  "hives": "urticaria",
  "swollen": "swelling",
  "puffy": "swelling",
  "gained weight": "weight gain",
  "losing weight": "weight loss",
  "lost weight": "weight loss",
  "pins and needles": "numbness",
  "tingling": "numbness",
  // Cardiovascular
  "heart racing": "palpitations",
  "heart pounding": "palpitations",
  "irregular heartbeat": "palpitations",
  "fast heart rate": "tachycardia",
  "slow heart rate": "bradycardia",
  "chest tightness": "chest pain",
  "chest pressure": "chest pain",
  "chest discomfort": "chest pain",
  "leg swelling": "peripheral edema",
  "ankle swelling": "peripheral edema",
  "swollen ankles": "peripheral edema",
  "swollen legs": "peripheral edema",
  // Neurological
  "feeling dizzy": "dizziness",
  "lightheadedness": "dizziness",
  "room spinning": "vertigo",
  "fainted": "syncope",
  "passed out": "syncope",
  "seizure": "seizures",
  "convulsion": "seizures",
  "fits": "seizures",
  "memory loss": "cognitive impairment",
  "forgetfulness": "cognitive impairment",
  "confusion": "altered mental status",
  "can't concentrate": "difficulty concentrating",
  // Psych
  "feeling sad": "depressed mood",
  "feeling low": "depressed mood",
  "feeling down": "depressed mood",
  "feeling anxious": "anxiety",
  "nervousness": "anxiety",
  "panic attack": "anxiety",
  "can't sleep": "insomnia",
  "trouble sleeping": "insomnia",
  "sleep problems": "insomnia",
  // Urinary
  "painful urination": "dysuria",
  "burning urination": "dysuria",
  "peeing a lot": "frequent urination",
  "blood in urine": "hematuria",
  // Skin
  "itchy skin": "pruritus",
  "itching": "pruritus",
  "dry skin": "xerosis",
  "acne": "skin lesions",
  "pimples": "skin lesions",
  // Eye
  "blurry vision": "blurred vision",
  "eye pain": "ocular pain",
  "yellow eyes": "jaundice",
  "yellow skin": "jaundice",
};

/**
 * Expanded common symptoms list for extraction
 */
const COMMON_SYMPTOMS = [
  // Original
  "fever", "high fever", "mild fever", "cough", "headache", "nausea",
  "chills", "sneezing", "runny nose", "sore throat", "fatigue",
  "muscle aches", "sweating", "itchy eyes",
  // Expanded — Respiratory
  "wheezing", "shortness of breath", "hemoptysis", "chest pain",
  // GI
  "vomiting", "diarrhea", "abdominal pain", "heartburn", "bloating",
  "constipation", "rectal bleeding", "loss of appetite",
  // Cardiovascular
  "palpitations", "tachycardia", "peripheral edema", "syncope",
  // Neurological
  "dizziness", "vertigo", "seizures", "numbness", "cognitive impairment",
  "altered mental status",
  // Dermatology
  "rash", "urticaria", "pruritus", "skin lesions",
  // Musculoskeletal
  "arthralgia", "back pain", "lower abdominal pain",
  // General
  "weight loss", "weight gain", "blurred vision",
  "frequent urination", "dry mouth", "swelling",
  "clear nasal discharge", "jaundice",
  // Psych
  "depressed mood", "anxiety", "insomnia", "difficulty concentrating",
  // Urinary
  "dysuria", "hematuria",
  // Endocrine
  "increased thirst", "excessive hunger",
];

// Initial "Seed" Knowledge Base — Expanded from medical data volumes
// In a real app, this would be fetched from Supabase and cached locally
let localKB: KnowledgeBase = {
  // ─── RESPIRATORY ─────────────────────────────────────────────────────
  "Common Cold": {
    symptoms: { "sneezing": 0.8, "runny nose": 0.9, "sore throat": 0.7, "cough": 0.6, "mild fever": 0.3 },
    urgency: "low",
    recommendations: ["Rest", "Hydration", "Vitamin C"],
    herbalAlternatives: ["Ginger tea", "Honey and lemon juice"],
    adjustmentCount: 0
  },
  "Influenza (Flu)": {
    symptoms: { "high fever": 0.9, "muscle aches": 0.8, "fatigue": 0.9, "cough": 0.7, "headache": 0.6 },
    urgency: "medium",
    recommendations: ["Rest", "Antipyretics", "Oseltamivir (Tamiflu) if within 48hrs", "Medical assessment if symptoms worsen"],
    herbalAlternatives: ["Elderberry syrup", "Echinacea tea"],
    adjustmentCount: 0
  },
  "COVID-19": {
    symptoms: { "fever": 0.8, "cough": 0.8, "fatigue": 0.7, "shortness of breath": 0.7, "sore throat": 0.6, "headache": 0.5, "muscle aches": 0.5, "loss of appetite": 0.4 },
    urgency: "medium",
    recommendations: ["Isolate", "Rest and hydration", "Paxlovid if high-risk within 5 days", "Seek emergency care if SpO2 < 94%"],
    herbalAlternatives: ["Honey for cough", "Ginger tea", "Turmeric with black pepper"],
    adjustmentCount: 0
  },
  "Asthma": {
    symptoms: { "wheezing": 0.9, "shortness of breath": 0.8, "cough": 0.7, "chest pain": 0.5 },
    urgency: "medium",
    recommendations: ["Inhaled beta-agonist (albuterol)", "Avoid triggers", "Seek emergency care if peak flow < 50%"],
    herbalAlternatives: ["Breathing exercises", "Caffeine (mild bronchodilation)"],
    adjustmentCount: 0
  },
  "COPD": {
    symptoms: { "shortness of breath": 0.9, "cough": 0.8, "wheezing": 0.7, "fatigue": 0.6, "chest pain": 0.4 },
    urgency: "medium",
    recommendations: ["Inhaled bronchodilators", "Pulmonary rehabilitation", "Smoking cessation", "Supplemental O2 if SpO2 < 88%"],
    herbalAlternatives: ["NAC (N-acetylcysteine)", "Eucalyptus oil inhalation"],
    adjustmentCount: 0
  },
  "Pneumonia": {
    symptoms: { "high fever": 0.8, "cough": 0.9, "shortness of breath": 0.7, "chest pain": 0.6, "fatigue": 0.6, "chills": 0.5 },
    urgency: "high",
    recommendations: ["Antibiotics (amoxicillin for community-acquired)", "Chest X-ray", "Seek medical attention promptly"],
    herbalAlternatives: ["Honey for cough relief", "Warm fluids"],
    adjustmentCount: 0
  },
  "Pulmonary Embolism": {
    symptoms: { "shortness of breath": 0.9, "chest pain": 0.8, "tachycardia": 0.7, "hemoptysis": 0.5, "syncope": 0.4, "peripheral edema": 0.4 },
    urgency: "emergency",
    recommendations: ["EMERGENCY — Call 911 immediately", "Anticoagulation therapy", "CT pulmonary angiography"],
    adjustmentCount: 0
  },
  "Allergic Rhinitis": {
    symptoms: { "sneezing": 0.9, "itchy eyes": 0.8, "runny nose": 0.7, "clear nasal discharge": 0.9 },
    urgency: "low",
    recommendations: ["Avoid triggers", "Antihistamines"],
    herbalAlternatives: ["Nettle leaf tea", "Quercetin-rich foods"],
    adjustmentCount: 0
  },
  // ─── INFECTIOUS DISEASES ─────────────────────────────────────────────
  "Malaria": {
    symptoms: { "chills": 0.9, "high fever": 0.8, "sweating": 0.7, "headache": 0.6, "nausea": 0.5, "muscle aches": 0.4 },
    urgency: "high",
    recommendations: ["Seek medical testing for malaria immediately", "Antimalarial medication as prescribed", "Blood smear or rapid diagnostic test"],
    herbalAlternatives: ["Artemisinin (under medical supervision)"],
    adjustmentCount: 0
  },
  "Typhoid Fever": {
    symptoms: { "high fever": 0.9, "headache": 0.7, "abdominal pain": 0.7, "fatigue": 0.6, "loss of appetite": 0.6, "diarrhea": 0.5, "rash": 0.3 },
    urgency: "high",
    recommendations: ["Blood culture for diagnosis", "Antibiotics (azithromycin or fluoroquinolone)", "Hydration"],
    herbalAlternatives: ["Oral rehydration salts", "Light diet"],
    adjustmentCount: 0
  },
  "Urinary Tract Infection (UTI)": {
    symptoms: { "dysuria": 0.9, "frequent urination": 0.8, "lower abdominal pain": 0.7, "hematuria": 0.5, "fever": 0.4 },
    urgency: "medium",
    recommendations: ["Urinalysis and culture", "Antibiotics (nitrofurantoin or TMP-SMX)", "Increase fluid intake"],
    herbalAlternatives: ["Cranberry extract", "D-mannose", "Increased water intake"],
    adjustmentCount: 0
  },
  "Tuberculosis": {
    symptoms: { "cough": 0.9, "hemoptysis": 0.7, "fever": 0.7, "sweating": 0.7, "weight loss": 0.7, "fatigue": 0.6, "loss of appetite": 0.5 },
    urgency: "high",
    recommendations: ["Chest X-ray", "Sputum smear and culture", "RIPE therapy (Rifampin, Isoniazid, Pyrazinamide, Ethambutol)"],
    adjustmentCount: 0
  },
  "HIV/AIDS": {
    symptoms: { "fever": 0.6, "fatigue": 0.7, "weight loss": 0.7, "sore throat": 0.5, "rash": 0.5, "muscle aches": 0.5, "sweating": 0.5 },
    urgency: "high",
    recommendations: ["HIV testing (4th generation)", "Antiretroviral therapy (ART)", "CD4 count monitoring", "PrEP for high-risk contacts"],
    adjustmentCount: 0
  },
  // ─── CARDIOVASCULAR ──────────────────────────────────────────────────
  "Hypertension": {
    symptoms: { "headache": 0.5, "dizziness": 0.5, "blurred vision": 0.4, "chest pain": 0.3, "shortness of breath": 0.3 },
    urgency: "medium",
    recommendations: ["Blood pressure monitoring", "DASH diet", "Sodium restriction < 2300mg/day", "Exercise ≥ 150 min/week", "Antihypertensive medication if indicated"],
    herbalAlternatives: ["Garlic supplements", "Hibiscus tea", "CoQ10"],
    adjustmentCount: 0
  },
  "Heart Failure": {
    symptoms: { "shortness of breath": 0.9, "peripheral edema": 0.8, "fatigue": 0.8, "cough": 0.5, "weight gain": 0.6, "palpitations": 0.4 },
    urgency: "high",
    recommendations: ["Echocardiography", "Quadruple GDMT therapy", "Sodium and fluid restriction", "Daily weight monitoring"],
    herbalAlternatives: ["Hawthorn berry (under medical supervision)"],
    adjustmentCount: 0
  },
  "Coronary Artery Disease": {
    symptoms: { "chest pain": 0.9, "shortness of breath": 0.6, "fatigue": 0.5, "palpitations": 0.4, "dizziness": 0.3, "sweating": 0.5, "nausea": 0.4 },
    urgency: "high",
    recommendations: ["EMERGENCY if acute — Call 911", "Aspirin 325mg chewed", "12-lead ECG", "High-intensity statin therapy"],
    adjustmentCount: 0
  },
  "Atrial Fibrillation": {
    symptoms: { "palpitations": 0.9, "shortness of breath": 0.6, "dizziness": 0.6, "fatigue": 0.5, "chest pain": 0.4, "syncope": 0.3 },
    urgency: "medium",
    recommendations: ["ECG confirmation", "CHA2DS2-VASc score for stroke risk", "Rate or rhythm control", "Anticoagulation if indicated"],
    adjustmentCount: 0
  },
  "Pericarditis": {
    symptoms: { "chest pain": 0.9, "fever": 0.6, "shortness of breath": 0.4, "fatigue": 0.3 },
    urgency: "medium",
    recommendations: ["ECG (diffuse ST elevation)", "NSAIDs + Colchicine", "Hospital admission if high-risk features"],
    adjustmentCount: 0
  },
  // ─── GASTROINTESTINAL ────────────────────────────────────────────────
  "GERD (Acid Reflux)": {
    symptoms: { "heartburn": 0.9, "chest pain": 0.5, "cough": 0.4, "sore throat": 0.4, "nausea": 0.3, "bloating": 0.3 },
    urgency: "low",
    recommendations: ["Lifestyle modifications (raise head of bed, avoid late meals)", "PPI or H2 blocker therapy", "Avoid trigger foods"],
    herbalAlternatives: ["Ginger tea", "Slippery elm", "Aloe vera juice"],
    adjustmentCount: 0
  },
  "Peptic Ulcer Disease": {
    symptoms: { "abdominal pain": 0.9, "heartburn": 0.6, "nausea": 0.6, "bloating": 0.5, "vomiting": 0.4, "loss of appetite": 0.4, "weight loss": 0.3 },
    urgency: "medium",
    recommendations: ["H. pylori testing", "PPI therapy", "Avoid NSAIDs", "Endoscopy if alarm features"],
    herbalAlternatives: ["Licorice root (DGL)", "Cabbage juice"],
    adjustmentCount: 0
  },
  "Irritable Bowel Syndrome (IBS)": {
    symptoms: { "abdominal pain": 0.9, "bloating": 0.8, "diarrhea": 0.6, "constipation": 0.6 },
    urgency: "low",
    recommendations: ["Low FODMAP diet trial", "Fiber supplementation", "Antispasmodics", "Stress management"],
    herbalAlternatives: ["Peppermint oil capsules", "Chamomile tea", "Psyllium husk"],
    adjustmentCount: 0
  },
  "Appendicitis": {
    symptoms: { "abdominal pain": 0.9, "nausea": 0.7, "vomiting": 0.6, "fever": 0.6, "loss of appetite": 0.7 },
    urgency: "emergency",
    recommendations: ["EMERGENCY — Seek immediate medical attention", "CT abdomen", "Surgical consultation (appendectomy)"],
    adjustmentCount: 0
  },
  "Gallstones (Cholelithiasis)": {
    symptoms: { "abdominal pain": 0.8, "nausea": 0.7, "vomiting": 0.6, "fever": 0.4, "jaundice": 0.4 },
    urgency: "medium",
    recommendations: ["Abdominal ultrasound", "Low-fat diet", "Cholecystectomy if symptomatic"],
    adjustmentCount: 0
  },
  "Gastroenteritis": {
    symptoms: { "diarrhea": 0.9, "vomiting": 0.8, "abdominal pain": 0.7, "nausea": 0.7, "fever": 0.5, "fatigue": 0.4 },
    urgency: "low",
    recommendations: ["Oral rehydration therapy", "Rest", "BRAT diet", "Seek care if bloody diarrhea or dehydration"],
    herbalAlternatives: ["Ginger for nausea", "Chamomile tea", "Probiotics"],
    adjustmentCount: 0
  },
  // ─── ENDOCRINE ───────────────────────────────────────────────────────
  "Type 2 Diabetes": {
    symptoms: { "frequent urination": 0.8, "increased thirst": 0.8, "fatigue": 0.7, "blurred vision": 0.5, "weight loss": 0.5, "numbness": 0.4, "excessive hunger": 0.6 },
    urgency: "medium",
    recommendations: ["HbA1c testing", "Metformin first-line", "SGLT2i/GLP-1 RA if cardiovascular risk", "Lifestyle modifications"],
    herbalAlternatives: ["Cinnamon", "Berberine", "Bitter melon"],
    adjustmentCount: 0
  },
  "Type 1 Diabetes": {
    symptoms: { "frequent urination": 0.9, "increased thirst": 0.9, "weight loss": 0.8, "fatigue": 0.7, "excessive hunger": 0.7, "nausea": 0.4, "blurred vision": 0.4 },
    urgency: "high",
    recommendations: ["Immediate endocrinology referral", "Insulin therapy", "Blood glucose monitoring", "Screen for DKA if new diagnosis"],
    adjustmentCount: 0
  },
  "Hypothyroidism": {
    symptoms: { "fatigue": 0.9, "weight gain": 0.7, "constipation": 0.6, "dry mouth": 0.5, "muscle aches": 0.5, "depressed mood": 0.5, "numbness": 0.3 },
    urgency: "low",
    recommendations: ["TSH and free T4 testing", "Levothyroxine replacement", "Recheck TSH in 6-8 weeks"],
    herbalAlternatives: ["Selenium supplementation", "Ashwagandha (under supervision)"],
    adjustmentCount: 0
  },
  "Hyperthyroidism": {
    symptoms: { "weight loss": 0.8, "palpitations": 0.8, "anxiety": 0.7, "sweating": 0.7, "fatigue": 0.5, "diarrhea": 0.4, "insomnia": 0.5 },
    urgency: "medium",
    recommendations: ["TSH, free T3/T4 testing", "Methimazole or propylthiouracil", "Beta-blocker for symptom control", "Endocrinology referral"],
    herbalAlternatives: ["Lemon balm tea", "Bugleweed (under supervision)"],
    adjustmentCount: 0
  },
  "Diabetic Ketoacidosis (DKA)": {
    symptoms: { "nausea": 0.8, "vomiting": 0.7, "abdominal pain": 0.7, "shortness of breath": 0.6, "fatigue": 0.6, "altered mental status": 0.5, "increased thirst": 0.7, "frequent urination": 0.6 },
    urgency: "emergency",
    recommendations: ["EMERGENCY — Seek immediate medical attention", "IV fluids", "Insulin infusion", "Electrolyte monitoring"],
    adjustmentCount: 0
  },
  // ─── NEUROLOGY ───────────────────────────────────────────────────────
  "Migraine": {
    symptoms: { "headache": 0.9, "nausea": 0.7, "blurred vision": 0.5, "vomiting": 0.4, "dizziness": 0.4, "fatigue": 0.3 },
    urgency: "low",
    recommendations: ["Triptans for acute attacks", "NSAIDs for mild attacks", "Identify and avoid triggers", "Prophylaxis if ≥4 attacks/month"],
    herbalAlternatives: ["Riboflavin (Vitamin B2)", "Magnesium supplementation", "Feverfew", "Butterbur"],
    adjustmentCount: 0
  },
  "Stroke": {
    symptoms: { "numbness": 0.8, "dizziness": 0.7, "headache": 0.6, "blurred vision": 0.7, "altered mental status": 0.7, "syncope": 0.5 },
    urgency: "emergency",
    recommendations: ["EMERGENCY — Call 911 immediately", "BE-FAST assessment", "CT head immediately", "IV tPA within 4.5 hours if ischemic"],
    adjustmentCount: 0
  },
  "Epilepsy / Seizure Disorder": {
    symptoms: { "seizures": 0.9, "altered mental status": 0.7, "dizziness": 0.4, "fatigue": 0.4 },
    urgency: "high",
    recommendations: ["EEG", "Neuroimaging (MRI brain)", "Antiepileptic medication", "Seizure safety precautions"],
    adjustmentCount: 0
  },
  "Vertigo (BPPV)": {
    symptoms: { "vertigo": 0.9, "dizziness": 0.8, "nausea": 0.6, "vomiting": 0.3 },
    urgency: "low",
    recommendations: ["Epley maneuver", "Vestibular rehabilitation", "Meclizine for symptom relief"],
    herbalAlternatives: ["Ginger for nausea", "Ginkgo biloba"],
    adjustmentCount: 0
  },
  // ─── PSYCHIATRY ──────────────────────────────────────────────────────
  "Major Depression": {
    symptoms: { "depressed mood": 0.9, "fatigue": 0.8, "insomnia": 0.7, "loss of appetite": 0.6, "difficulty concentrating": 0.6, "weight loss": 0.4, "anxiety": 0.4 },
    urgency: "medium",
    recommendations: ["PHQ-9 screening", "SSRI therapy (sertraline, escitalopram)", "Cognitive behavioral therapy", "Safety assessment for suicidal ideation"],
    herbalAlternatives: ["St. John's Wort (mild-moderate; check interactions)", "Omega-3 fatty acids", "Exercise"],
    adjustmentCount: 0
  },
  "Generalized Anxiety Disorder": {
    symptoms: { "anxiety": 0.9, "insomnia": 0.7, "muscle aches": 0.5, "fatigue": 0.6, "difficulty concentrating": 0.6, "palpitations": 0.4, "headache": 0.4 },
    urgency: "low",
    recommendations: ["GAD-7 screening", "SSRI/SNRI therapy", "Cognitive behavioral therapy", "Relaxation techniques"],
    herbalAlternatives: ["Lavender (Silexan)", "Passionflower", "Chamomile", "Valerian root"],
    adjustmentCount: 0
  },
  "Insomnia": {
    symptoms: { "insomnia": 0.9, "fatigue": 0.7, "difficulty concentrating": 0.6, "anxiety": 0.4, "depressed mood": 0.3 },
    urgency: "low",
    recommendations: ["Sleep hygiene optimization", "CBT-I (cognitive behavioral therapy for insomnia)", "Melatonin or low-dose trazodone"],
    herbalAlternatives: ["Valerian root", "Chamomile tea", "Lavender aromatherapy", "Magnesium"],
    adjustmentCount: 0
  },
  "PTSD": {
    symptoms: { "anxiety": 0.8, "insomnia": 0.8, "depressed mood": 0.6, "difficulty concentrating": 0.6, "fatigue": 0.5 },
    urgency: "medium",
    recommendations: ["Trauma-focused CBT", "EMDR therapy", "SSRI (sertraline, paroxetine)", "Safety assessment"],
    adjustmentCount: 0
  },
  // ─── DERMATOLOGY ─────────────────────────────────────────────────────
  "Eczema (Atopic Dermatitis)": {
    symptoms: { "rash": 0.9, "pruritus": 0.9, "skin lesions": 0.6 },
    urgency: "low",
    recommendations: ["Emollients (moisturize frequently)", "Topical corticosteroids", "Avoid irritants", "Antihistamines for itch"],
    herbalAlternatives: ["Colloidal oatmeal baths", "Coconut oil", "Evening primrose oil"],
    adjustmentCount: 0
  },
  "Psoriasis": {
    symptoms: { "rash": 0.9, "pruritus": 0.7, "arthralgia": 0.4, "skin lesions": 0.8 },
    urgency: "low",
    recommendations: ["Topical corticosteroids", "Vitamin D analogues", "Phototherapy", "Biologics for moderate-severe"],
    herbalAlternatives: ["Aloe vera gel", "Fish oil (omega-3)", "Turmeric"],
    adjustmentCount: 0
  },
  "Cellulitis": {
    symptoms: { "rash": 0.7, "fever": 0.6, "swelling": 0.8, "skin lesions": 0.7 },
    urgency: "medium",
    recommendations: ["Antibiotics (cephalexin or dicloxacillin)", "Elevation of affected limb", "Mark borders to track progression"],
    adjustmentCount: 0
  },
  "Urticaria (Hives)": {
    symptoms: { "urticaria": 0.9, "pruritus": 0.8, "swelling": 0.5 },
    urgency: "medium",
    recommendations: ["Antihistamines (cetirizine, loratadine)", "Identify and avoid triggers", "Seek emergency care if throat swelling or breathing difficulty"],
    herbalAlternatives: ["Quercetin", "Nettle leaf"],
    adjustmentCount: 0
  },
  // ─── MUSCULOSKELETAL ─────────────────────────────────────────────────
  "Osteoarthritis": {
    symptoms: { "arthralgia": 0.9, "muscle aches": 0.5, "swelling": 0.5, "back pain": 0.4 },
    urgency: "low",
    recommendations: ["Exercise and weight management", "Acetaminophen or NSAIDs", "Physical therapy", "Joint injection if moderate-severe"],
    herbalAlternatives: ["Turmeric/curcumin", "Glucosamine/chondroitin", "Boswellia"],
    adjustmentCount: 0
  },
  "Rheumatoid Arthritis": {
    symptoms: { "arthralgia": 0.9, "swelling": 0.8, "fatigue": 0.6, "muscle aches": 0.5, "fever": 0.3 },
    urgency: "medium",
    recommendations: ["Rheumatology referral", "DMARD therapy (methotrexate)", "NSAIDs for symptom relief", "Lab workup (RF, anti-CCP, ESR, CRP)"],
    herbalAlternatives: ["Fish oil (omega-3)", "Turmeric"],
    adjustmentCount: 0
  },
  "Gout": {
    symptoms: { "arthralgia": 0.9, "swelling": 0.8, "fever": 0.4, "rash": 0.3 },
    urgency: "medium",
    recommendations: ["NSAIDs or colchicine for acute flare", "Urate-lowering therapy (allopurinol)", "Dietary modifications (avoid purine-rich foods)"],
    herbalAlternatives: ["Cherry extract", "Vitamin C"],
    adjustmentCount: 0
  },
  "Low Back Pain": {
    symptoms: { "back pain": 0.9, "muscle aches": 0.6, "numbness": 0.4 },
    urgency: "low",
    recommendations: ["NSAIDs", "Early mobilization", "Physical therapy", "Red flag screening (cauda equina, cancer, infection)"],
    herbalAlternatives: ["Willow bark", "Devil's claw", "Capsaicin cream"],
    adjustmentCount: 0
  },
  // ─── WOMEN'S HEALTH ──────────────────────────────────────────────────
  "Pelvic Inflammatory Disease (PID)": {
    symptoms: { "lower abdominal pain": 0.9, "fever": 0.6, "dysuria": 0.4 },
    urgency: "high",
    recommendations: ["STI testing", "Ceftriaxone + Doxycycline + Metronidazole", "72-hour follow-up mandatory"],
    adjustmentCount: 0
  },
  "PCOS (Polycystic Ovary Syndrome)": {
    symptoms: { "weight gain": 0.7, "skin lesions": 0.5, "fatigue": 0.4, "insomnia": 0.3, "depressed mood": 0.3 },
    urgency: "low",
    recommendations: ["Hormonal evaluation", "Lifestyle modifications", "Metformin or oral contraceptives", "Endocrinology/gynecology referral"],
    herbalAlternatives: ["Spearmint tea", "Inositol", "Cinnamon"],
    adjustmentCount: 0
  },
  // ─── PEDIATRIC ───────────────────────────────────────────────────────
  "Croup": {
    symptoms: { "cough": 0.9, "fever": 0.6, "sore throat": 0.5, "shortness of breath": 0.5 },
    urgency: "medium",
    recommendations: ["Cool mist humidifier", "Dexamethasone single dose", "Nebulized epinephrine if severe", "Seek ER if stridor at rest"],
    adjustmentCount: 0
  },
  "RSV Bronchiolitis": {
    symptoms: { "cough": 0.8, "wheezing": 0.8, "fever": 0.6, "runny nose": 0.6, "shortness of breath": 0.7 },
    urgency: "medium",
    recommendations: ["Supportive care (hydration, suction)", "Hospitalize if SpO2 < 92%", "Nirsevimab prophylaxis for eligible infants"],
    adjustmentCount: 0
  },
  "Otitis Media (Ear Infection)": {
    symptoms: { "fever": 0.7, "headache": 0.5 },
    urgency: "low",
    recommendations: ["Amoxicillin if bacterial", "Pain management (acetaminophen, ibuprofen)", "Watchful waiting if > 2 years with mild symptoms"],
    herbalAlternatives: ["Garlic oil ear drops (external only)", "Warm compress"],
    adjustmentCount: 0
  },
  // ─── EMERGENCY ───────────────────────────────────────────────────────
  "Anaphylaxis": {
    symptoms: { "rash": 0.7, "urticaria": 0.8, "shortness of breath": 0.9, "swelling": 0.8, "dizziness": 0.6, "nausea": 0.5, "abdominal pain": 0.4 },
    urgency: "emergency",
    recommendations: ["EMERGENCY — Epinephrine IM IMMEDIATELY", "Call 911", "Position supine with legs elevated", "Observe 4-6 hours minimum"],
    adjustmentCount: 0
  },
  "Sepsis": {
    symptoms: { "high fever": 0.8, "tachycardia": 0.7, "shortness of breath": 0.7, "altered mental status": 0.6, "fatigue": 0.6, "chills": 0.5 },
    urgency: "emergency",
    recommendations: ["EMERGENCY — Hour-1 Bundle", "Blood cultures then broad-spectrum antibiotics within 1 hour", "30 mL/kg IV crystalloid", "Measure lactate"],
    adjustmentCount: 0
  },
  "Aortic Dissection": {
    symptoms: { "chest pain": 0.9, "back pain": 0.8, "sweating": 0.6, "syncope": 0.4, "shortness of breath": 0.4 },
    urgency: "emergency",
    recommendations: ["EMERGENCY — Call 911 immediately", "IV beta-blocker", "Goal SBP < 120 mmHg", "CT angiography"],
    adjustmentCount: 0
  },
  // ─── ADDITIONAL CONDITIONS ───────────────────────────────────────────
  "Kidney Stones": {
    symptoms: { "abdominal pain": 0.8, "back pain": 0.7, "nausea": 0.6, "vomiting": 0.5, "hematuria": 0.7, "dysuria": 0.4 },
    urgency: "medium",
    recommendations: ["CT abdomen (non-contrast)", "NSAIDs for pain", "Hydration", "Tamsulosin for stone passage if < 10mm", "Urology referral if > 10mm or obstruction"],
    herbalAlternatives: ["Lemon juice (citrate)", "Increased water intake"],
    adjustmentCount: 0
  },
  "Iron Deficiency Anemia": {
    symptoms: { "fatigue": 0.9, "dizziness": 0.6, "shortness of breath": 0.5, "palpitations": 0.4, "headache": 0.4 },
    urgency: "low",
    recommendations: ["CBC and iron studies", "Oral iron supplementation", "Evaluate source of blood loss", "Vitamin C to enhance absorption"],
    herbalAlternatives: ["Iron-rich foods (spinach, lentils, red meat)", "Nettle tea"],
    adjustmentCount: 0
  },
  "Fibromyalgia": {
    symptoms: { "muscle aches": 0.9, "fatigue": 0.8, "insomnia": 0.7, "difficulty concentrating": 0.6, "headache": 0.5, "depressed mood": 0.4 },
    urgency: "low",
    recommendations: ["Exercise program", "Duloxetine or pregabalin", "CBT for pain management", "Sleep hygiene"],
    herbalAlternatives: ["Magnesium supplementation", "SAMe", "Turmeric"],
    adjustmentCount: 0
  },
};

/**
 * Resolve symptom aliases to their canonical form.
 * If the symptom is already canonical, return it as-is.
 */
export function resolveAlias(symptom: string): string {
  const lower = symptom.toLowerCase().trim();
  return SYMPTOM_ALIASES[lower] || lower;
}

/**
 * PREDICT: Analyze symptoms and return possible diagnoses.
 *
 * Uses TF-IDF-inspired scoring:
 *   confidence = (Sum of matched weights) / (Sum of ALL weights for the disease)
 *
 * This normalizes against the disease's full symptom profile, so a disease
 * with 10 symptoms isn't unfairly boosted when only 2 match.
 */
export function predict(patientSymptoms: string[]): DiagnosisResult[] {
  const results: DiagnosisResult[] = [];
  // Resolve aliases for all patient symptoms
  const normalizedSymptoms = patientSymptoms.map(s => resolveAlias(s));

  for (const [disease, data] of Object.entries(localKB)) {
    let matchedWeight = 0;
    let matchCount = 0;

    // Sum of ALL weights for this disease (the "total profile weight")
    const totalDiseaseWeight = Object.values(data.symptoms).reduce((sum, w) => sum + w, 0);

    for (const symptom of normalizedSymptoms) {
      if (data.symptoms[symptom]) {
        matchedWeight += data.symptoms[symptom];
        matchCount++;
      }
    }

    if (matchCount > 0 && totalDiseaseWeight > 0) {
      // TF-IDF-inspired: matched weight as proportion of total disease profile
      const confidence = Math.min(matchedWeight / totalDiseaseWeight, 1.0);

      results.push({
        condition: disease,
        confidence: parseFloat(confidence.toFixed(2)),
        explanation: `Matches ${matchCount} of ${Object.keys(data.symptoms).length} known symptoms (${(confidence * 100).toFixed(0)}% profile match).`,
        urgency: data.urgency,
        recommendations: data.recommendations,
        herbalAlternatives: data.herbalAlternatives
      });
    }
  }

  // Sort by confidence, then by urgency for tiebreaking
  const urgencyOrder = { emergency: 0, high: 1, medium: 2, low: 3 };
  return results.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
  });
}

/**
 * Calculate the adaptive learning rate.
 * Decays over time so early feedback has bigger impact than late feedback.
 *
 * Formula: lr = BASE_LR / (1 + DECAY_FACTOR * adjustmentCount)
 */
const BASE_LEARNING_RATE = 0.1;
const DECAY_FACTOR = 0.01;

export function getLearningRate(adjustmentCount: number): number {
  return BASE_LEARNING_RATE / (1 + DECAY_FACTOR * adjustmentCount);
}

/**
 * COMPARE & ADJUST: Correct the AI and adjust internal weights.
 *
 * Improvements over the original:
 * 1. Learning rate decay — early feedback has bigger impact
 * 2. Negative reinforcement — misdiagnosed conditions get penalized
 * 3. Adjustment count tracking — enables learning rate decay
 *
 * @param patientSymptoms - The symptoms the patient reported
 * @param actualCondition - The condition the user confirmed
 * @param predictedCondition - The condition the engine predicted (for negative reinforcement)
 * @returns The updated knowledge base
 */
export function adjust(
  patientSymptoms: string[],
  actualCondition: string,
  predictedCondition?: string
): KnowledgeBase {
  const normalizedSymptoms = patientSymptoms.map(s => resolveAlias(s));

  // === POSITIVE REINFORCEMENT: Strengthen the actual condition ===

  // Ensure the disease exists in our KB — if not, create it (learns new diseases!)
  if (!localKB[actualCondition]) {
    localKB[actualCondition] = {
      symptoms: {},
      urgency: "medium",
      recommendations: ["Consult a healthcare professional for proper diagnosis"],
      herbalAlternatives: [],
      adjustmentCount: 0
    };
  }

  const actualData = localKB[actualCondition];
  const adjustCount = actualData.adjustmentCount || 0;
  const lr = getLearningRate(adjustCount);

  // Increase weight for matching symptoms in the ACTUAL condition
  for (const symptom of normalizedSymptoms) {
    const currentWeight = actualData.symptoms[symptom] || 0;
    actualData.symptoms[symptom] = Math.min(currentWeight + lr, 1.0);
  }

  // Increment adjustment count
  actualData.adjustmentCount = adjustCount + 1;

  // === NEGATIVE REINFORCEMENT: Penalize the misdiagnosed condition ===
  if (predictedCondition && predictedCondition !== actualCondition && localKB[predictedCondition]) {
    const predictedData = localKB[predictedCondition];
    const predictedAdjCount = predictedData.adjustmentCount || 0;
    const penaltyLr = getLearningRate(predictedAdjCount) * 0.5; // Half-strength penalty

    for (const symptom of normalizedSymptoms) {
      if (predictedData.symptoms[symptom]) {
        predictedData.symptoms[symptom] = Math.max(
          predictedData.symptoms[symptom] - penaltyLr,
          0.05 // Floor — never remove a symptom entirely
        );
      }
    }

    predictedData.adjustmentCount = predictedAdjCount + 1;
  }

  console.log(
    `[PCA] Knowledge Base adjusted: +reinforced "${actualCondition}" (lr=${lr.toFixed(4)})` +
    (predictedCondition && predictedCondition !== actualCondition
      ? `, -penalized "${predictedCondition}"`
      : '')
  );

  return localKB;
}

/**
 * Enhanced Symptom Extractor
 *
 * 1. Checks against an expanded list of ~30 common symptoms
 * 2. Resolves aliases (e.g. "stuffy nose" → "runny nose")
 * 3. Handles multi-word compound symptoms ("chest pain", "shortness of breath")
 */
export function extractSymptoms(text: string): string[] {
  const found: string[] = [];
  const lowerText = text.toLowerCase();

  // First: check for compound symptoms and aliases in the raw text
  const allTerms = [...COMMON_SYMPTOMS, ...Object.keys(SYMPTOM_ALIASES)];
  // Sort by length descending so longer multi-word matches take priority
  allTerms.sort((a, b) => b.length - a.length);

  for (const term of allTerms) {
    if (lowerText.includes(term)) {
      const resolved = resolveAlias(term);
      if (!found.includes(resolved)) {
        found.push(resolved);
      }
    }
  }

  return found;
}

export function setKnowledgeBase(newKB: KnowledgeBase) {
  localKB = newKB;
}

export function getKnowledgeBase() {
  return localKB;
}

/**
 * Get the symptom aliases map (for testing/debugging)
 */
export function getSymptomAliases() {
  return { ...SYMPTOM_ALIASES };
}
