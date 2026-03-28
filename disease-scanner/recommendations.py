# ============================================================
# IT24103127 — Treatment Recommendation Engine
# Tea Leaf Disease Detector | Sri Lanka
# ============================================================

CLASSES = ['Algal Leaf Spot', 'Brown Blight', 'Gray Blight',
           'Healthy', 'Helopeltis', 'Red Leaf Spot']

TREATMENT_DB = {
    "Algal Leaf Spot": {
        "severity": "Moderate",
        "cause": "Cephaleuros virescens alga — common in wet humid zones",
        "symptoms": "Greenish-gray powdery spots on upper leaf surface",
        "treatment": [
            "Apply copper-based fungicide (Copper oxychloride 50% WP, 2.5g/L)",
            "Improve drainage and air circulation between bushes",
            "Remove and destroy heavily infected leaves",
            "Avoid overhead irrigation"
        ],
        "prevention": [
            "Maintain proper spacing between tea bushes",
            "Apply lime to reduce soil acidity",
            "Regular pruning to improve canopy airflow"
        ],
        "urgency": "within 2 weeks",
        "sri_lanka_note": "Most common in wet zone estates — Ratnapura, Galle, Kalutara"
    },
    "Brown Blight": {
        "severity": "High",
        "cause": "Colletotrichum camelliae fungus",
        "symptoms": "Brown irregular patches spreading from leaf tips",
        "treatment": [
            "Spray Carbendazim 50% WP (1g/L) every 14 days",
            "Apply Mancozeb 75% WP (2.5g/L) as protective spray",
            "Remove affected shoots during skiffing"
        ],
        "prevention": [
            "Avoid wounding during plucking",
            "Apply balanced NPK fertilizer",
            "Monitor during monsoon season closely"
        ],
        "urgency": "immediate",
        "sri_lanka_note": "Peak incidence during SW monsoon (May–September)"
    },
    "Gray Blight": {
        "severity": "High",
        "cause": "Pestalotiopsis theae fungus",
        "symptoms": "Gray spots with dark brown margins, affects young shoots",
        "treatment": [
            "Spray Propiconazole 25% EC (1mL/L)",
            "Apply Thiophanate-methyl 70% WP (1g/L)",
            "Remove and burn infected plant material"
        ],
        "prevention": [
            "Maintain proper fertilization schedule",
            "Avoid water stress — ensure proper irrigation",
            "Regular field inspection especially after dry spells"
        ],
        "urgency": "within 1 week",
        "sri_lanka_note": "Critical in up-country estates — Nuwara Eliya, Hatton"
    },
    "Healthy": {
        "severity": "None",
        "cause": "No disease detected",
        "symptoms": "Leaf appears healthy and normal",
        "treatment": ["No treatment required"],
        "prevention": [
            "Continue regular fertilization schedule",
            "Maintain good field hygiene",
            "Monitor weekly for early disease signs"
        ],
        "urgency": "none",
        "sri_lanka_note": "Keep up good agricultural practices"
    },
    "Helopeltis": {
        "severity": "High",
        "cause": "Helopeltis antonii — tea mosquito bug (pest)",
        "symptoms": "Dark necrotic spots with yellow halo, leaf curling, shoot die-back",
        "treatment": [
            "Spray Imidacloprid 17.8% SL (0.5mL/L) — systemic insecticide",
            "Apply Thiamethoxam 25% WG (0.3g/L)",
            "Use sticky traps to monitor population levels"
        ],
        "prevention": [
            "Remove shade trees that harbor the bug",
            "Regular field scouting — check 5 shoots per bush",
            "Maintain field hygiene by clearing weeds"
        ],
        "urgency": "immediate",
        "sri_lanka_note": "Major pest in low country and mid-country — requires immediate action"
    },
    "Red Leaf Spot": {
        "severity": "Moderate",
        "cause": "Cercospora theae fungal infection",
        "symptoms": "Reddish-brown circular spots reducing photosynthesis",
        "treatment": [
            "Apply Hexaconazole 5% EC (1mL/L)",
            "Spray Copper hydroxide 77% WP (2g/L)",
            "Increase field ventilation by pruning"
        ],
        "prevention": [
            "Balanced nutrition — avoid excess nitrogen",
            "Control soil moisture levels",
            "Early detection through weekly monitoring"
        ],
        "urgency": "within 2 weeks",
        "sri_lanka_note": "Common in wet zones during rainy season"
    }
}

def get_recommendation(disease_name: str) -> dict:
    rec = TREATMENT_DB.get(disease_name)
    if not rec:
        return {"error": f"Unknown disease: {disease_name}"}
    return {
        "disease"       : disease_name,
        "severity"      : rec["severity"],
        "cause"         : rec["cause"],
        "symptoms"      : rec["symptoms"],
        "treatment_steps": rec["treatment"],
        "prevention"    : rec["prevention"],
        "urgency"       : rec["urgency"],
        "sri_lanka_note": rec["sri_lanka_note"],
    }

if __name__ == "__main__":
    for disease in CLASSES:
        rec = get_recommendation(disease)
        print(f"\n{disease}: severity={rec['severity']}, urgency={rec['urgency']}")
