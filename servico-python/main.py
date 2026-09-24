from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional

app = FastAPI(
    title="Camila Sidônio - Calculadora Clínica Nutricional",
    version="1.0.0"
)

# Modelo de entrada de dados
class DadosAvaliacao(BaseModel):
    idade: int
    sexo: str  # 'M' ou 'F'
    peso_kg: float
    altura_cm: float
    nivel_atividade: str  # 'sedentario', 'leve', 'moderado', 'intenso', 'muito_intenso'
    objetivo: str  # 'perder_gordura', 'manter_peso', 'ganhar_massa'

# Fatores de Atividade Física (Estatuto FAO/OMS)
FATORES_ATIVIDADE = {
    "sedentario": 1.2,
    "leve": 1.375,
    "moderado": 1.55,
    "intenso": 1.725,
    "muito_intenso": 1.9
}

@app.get("/")
def status():
    return {"servico": "Smart Nutri Python API", "status": "Ativo"}

@app.post("/calcular-plano")
def calcular_plano(dados: DadosAvaliacao):
    # 1. Cálculo da TMB (Fórmula Mifflin-St Jeor)
    if dados.sexo.upper() == 'M':
        tmb = (10 * dados.peso_kg) + (6.25 * dados.altura_cm) - (5 * dados.idade) + 5
    else:
        tmb = (10 * dados.peso_kg) + (6.25 * dados.altura_cm) - (5 * dados.idade) - 161

    # 2. Cálculo do GET (Gasto Energético Total)
    fator = FATORES_ATIVIDADE.get(dados.nivel_atividade.lower(), 1.2)
    get_kcal = tmb * fator

    # 3. Definição da Meta Calórica conforme o Objetivo
    if dados.objetivo == "perder_gordura":
        meta_calorias = get_kcal - 500  # Déficit calórico
    elif dados.objetivo == "ganhar_massa":
        meta_calorias = get_kcal + 400  # Superávit calórico
    else:
        meta_calorias = get_kcal  # Manutenção

    # 4. Distribuição de Macronutrientes (g/kg de peso corporal)
    if dados.objetivo == "perder_gordura":
        proteina_g_kg = 2.2
        gordura_g_kg = 0.8
    elif dados.objetivo == "ganhar_massa":
        proteina_g_kg = 2.0
        gordura_g_kg = 1.0
    else:
        proteina_g_kg = 1.8
        gordura_g_kg = 0.9

    proteinas_g = round(dados.peso_kg * proteina_g_kg, 1)
    gorduras_g = round(dados.peso_kg * gordura_g_kg, 1)

    # 1g Proteína = 4 kcal | 1g Gordura = 9 kcal | 1g Carboidrato = 4 kcal
    calorias_proteinas = proteinas_g * 4
    calorias_gorduras = gorduras_g * 9
    calorias_restantes = meta_calorias - (calorias_proteinas + calorias_gorduras)

    carboidratos_g = round(max(calorias_restantes / 4, 0), 1)

    return {
        "tmb_kcal": round(tmb, 2),
        "get_kcal": round(get_kcal, 2),
        "meta_calorias": round(meta_calorias, 2),
        "macronutrientes": {
            "proteinas_g": proteinas_g,
            "carboidratos_g": carboidratos_g,
            "gorduras_g": gorduras_g
        }
    }