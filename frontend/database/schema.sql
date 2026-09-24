-- 1. TABELA DE PACIENTES
CREATE TABLE IF NOT EXISTS pacientes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    telefone VARCHAR(20),
    data_nascimento DATE NOT NULL,
    sexo CHAR(1) CHECK (sexo IN ('M', 'F')),
    foto_url TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABELA DE ANAMNESE E ESTILO DE VIDA
CREATE TABLE IF NOT EXISTS anamneses (
    id SERIAL PRIMARY KEY,
    paciente_id INT REFERENCES pacientes(id) ON DELETE CASCADE,
    historico_medico TEXT,
    alergias_restricoes TEXT,
    nivel_atividade VARCHAR(50) CHECK (nivel_atividade IN ('sedentario', 'leve', 'moderado', 'intenso', 'muito_intenso')),
    objetivo VARCHAR(50) CHECK (objetivo IN ('perder_gordura', 'manter_peso', 'ganhar_massa')),
    horas_sono INT DEFAULT 8,
    consumo_agua_ml INT DEFAULT 2000,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABELA DE AVALIAÇÕES FÍSICAS (Evolução Corporal)
CREATE TABLE IF NOT EXISTS avaliacoes_fisicas (
    id SERIAL PRIMARY KEY,
    paciente_id INT REFERENCES pacientes(id) ON DELETE CASCADE,
    data_avaliacao DATE DEFAULT CURRENT_DATE,
    peso_kg DECIMAL(5,2) NOT NULL,
    altura_cm DECIMAL(5,2) NOT NULL,
    percentual_gordura DECIMAL(4,1),
    massa_magra_kg DECIMAL(5,2),
    circunferencia_cintura_cm DECIMAL(5,2),
    circunferencia_quadril_cm DECIMAL(5,2),
    tmb_kcal DECIMAL(6,2),
    get_kcal DECIMAL(6,2),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABELA NUTRICIONAL DE ALIMENTOS
CREATE TABLE IF NOT EXISTS alimentos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    categoria VARCHAR(50),
    calorias_100g DECIMAL(6,2) NOT NULL,
    proteinas_100g DECIMAL(5,2) NOT NULL,
    carboidratos_100g DECIMAL(5,2) NOT NULL,
    gorduras_100g DECIMAL(5,2) NOT NULL,
    fibras_100g DECIMAL(5,2) DEFAULT 0.00
);

-- 5. TABELA DE PLANOS ALIMENTARES
CREATE TABLE IF NOT EXISTS planos_alimentares (
    id SERIAL PRIMARY KEY,
    paciente_id INT REFERENCES pacientes(id) ON DELETE CASCADE,
    titulo VARCHAR(100) NOT NULL,
    meta_calorias DECIMAL(6,2) NOT NULL,
    meta_proteinas_g DECIMAL(6,2) NOT NULL,
    meta_carboidratos_g DECIMAL(6,2) NOT NULL,
    meta_gorduras_g DECIMAL(6,2) NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. REFEIÇÕES DO PLANO
CREATE TABLE IF NOT EXISTS refeicoes (
    id SERIAL PRIMARY KEY,
    plano_id INT REFERENCES planos_alimentares(id) ON DELETE CASCADE,
    nome VARCHAR(50) NOT NULL,
    horario TIME,
    observacoes TEXT
);

-- 7. ITENS DA REFEIÇÃO
CREATE TABLE IF NOT EXISTS itens_refeicao (
    id SERIAL PRIMARY KEY,
    refeicao_id INT REFERENCES refeicoes(id) ON DELETE CASCADE,
    alimento_id INT REFERENCES alimentos(id),
    quantidade_gramas DECIMAL(6,2) NOT NULL,
    calorias_totais DECIMAL(6,2),
    proteinas_totais DECIMAL(6,2),
    carboidratos_totais DECIMAL(6,2),
    gorduras_totais DECIMAL(6,2)
);

-- POPULAR DADOS INICIAIS
INSERT INTO alimentos (nome, categoria, calorias_100g, proteinas_100g, carboidratos_100g, gorduras_100g, fibras_100g) VALUES
('Peito de Frango Grelhado', 'Proteínas', 165.00, 31.00, 0.00, 3.60, 0.00),
('Arroz Integral Cozido', 'Carboidratos', 111.00, 2.60, 23.00, 0.90, 1.80),
('Ovo Cozido', 'Proteínas/Gorduras', 155.00, 13.00, 1.10, 11.00, 0.00),
('Aveia em Flocos', 'Carboidratos/Fibras', 394.00, 13.90, 66.60, 8.50, 9.10),
('Banana Prata', 'Frutas', 98.00, 1.30, 26.00, 0.10, 2.00),
('Azeite de Oliva Extra Virgem', 'Gorduras', 884.00, 0.00, 0.00, 100.00, 0.00),
('Feijão Preto Cozido', 'Leguminosas', 77.00, 4.50, 14.00, 0.50, 8.40);

INSERT INTO pacientes (nome, email, telefone, data_nascimento, sexo) VALUES
('Maria Silva', 'maria.silva@email.com', '(11) 98765-4321', '1995-06-15', 'F');

-- 8. ADICIONAR STATUS AO PACIENTE
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ativo';

-- 9. ADICIONAR MEDIDAS CASEIRAS E OPÇÃO DE SUBSTITUIÇÃO NOS ITENS DA REFEIÇÃO
ALTER TABLE itens_refeicao ADD COLUMN IF NOT EXISTS medida_caseira VARCHAR(100);
ALTER TABLE itens_refeicao ADD COLUMN IF NOT EXISTS e_substituicao BOOLEAN DEFAULT FALSE;

-- 3. NOVA TABELA DE CHECK-INS SEMANAIIS (REQUISITO 6)
CREATE TABLE IF NOT EXISTS checkins_semanais (
    id SERIAL PRIMARY KEY,
    paciente_id INT REFERENCES pacientes(id) ON DELETE CASCADE,
    data_checkin DATE DEFAULT CURRENT_DATE,
    peso_atual_kg DECIMAL(5,2) NOT NULL,
    adesao_plano_porcentagem INT CHECK (adesao_plano_porcentagem BETWEEN 0 AND 100),
    observacoes_paciente TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. NOVA TABELA DE EXAMES E ANEXOS (REQUISITO 8)
CREATE TABLE IF NOT EXISTS exames_paciente (
    id SERIAL PRIMARY KEY,
    paciente_id INT REFERENCES pacientes(id) ON DELETE CASCADE,
    titulo_exame VARCHAR(100) NOT NULL,
    data_exame DATE NOT NULL,
    observacao TEXT,
    arquivo_url TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1. Ajustes na tabela PLANOS_ALIMENTARES
ALTER TABLE planos_alimentares ADD COLUMN IF NOT EXISTS nome_plano VARCHAR(255);
ALTER TABLE planos_alimentares ADD COLUMN IF NOT EXISTS meta_calorica_kcal NUMERIC;

-- Garantir que colunas obrigatórias aceitam valores ou têm predefinição
ALTER TABLE planos_alimentares ALTER COLUMN titulo DROP NOT NULL;
ALTER TABLE planos_alimentares ALTER COLUMN titulo SET DEFAULT 'Plano Alimentar';
ALTER TABLE planos_alimentares ALTER COLUMN meta_calorias DROP NOT NULL;
ALTER TABLE planos_alimentares ALTER COLUMN meta_calorias SET DEFAULT 2000;
ALTER TABLE planos_alimentares ALTER COLUMN meta_proteinas_g DROP NOT NULL;
ALTER TABLE planos_alimentares ALTER COLUMN meta_proteinas_g SET DEFAULT 100;
ALTER TABLE planos_alimentares ALTER COLUMN meta_carboidratos_g DROP NOT NULL;
ALTER TABLE planos_alimentares ALTER COLUMN meta_carboidratos_g SET DEFAULT 250;
ALTER TABLE planos_alimentares ALTER COLUMN meta_gorduras_g DROP NOT NULL;
ALTER TABLE planos_alimentares ALTER COLUMN meta_gorduras_g SET DEFAULT 60;


-- 2. Ajustes na tabela REFEICOES
ALTER TABLE refeicoes ADD COLUMN IF NOT EXISTS nome_refeicao VARCHAR(255);
ALTER TABLE refeicoes ADD COLUMN IF NOT EXISTS horario VARCHAR(50);
ALTER TABLE refeicoes ADD COLUMN IF NOT EXISTS plano_alimentar_id INT;

-- Ajustar a coluna nome antiga para aceitar nulos caso o C# use a nome_refeicao
ALTER TABLE refeicoes ALTER COLUMN nome DROP NOT NULL;
ALTER TABLE refeicoes ALTER COLUMN nome SET DEFAULT 'Refeição';


-- 3. Ajustes na tabela ITENS_REFEICAO
ALTER TABLE itens_refeicao ADD COLUMN IF NOT EXISTS quantidade_g DECIMAL(6,2);
ALTER TABLE itens_refeicao ADD COLUMN IF NOT EXISTS medida_caseira VARCHAR(255);
ALTER TABLE itens_refeicao ADD COLUMN IF NOT EXISTS kcal DECIMAL(6,2);
ALTER TABLE itens_refeicao ADD COLUMN IF NOT EXISTS proteinas DECIMAL(6,2);
ALTER TABLE itens_refeicao ADD COLUMN IF NOT EXISTS carbos DECIMAL(6,2);
ALTER TABLE itens_refeicao ADD COLUMN IF NOT EXISTS gorduras DECIMAL(6,2);
ALTER TABLE itens_refeicao ADD COLUMN IF NOT EXISTS alimento_nome VARCHAR(255);
ALTER TABLE itens_refeicao ADD COLUMN IF NOT EXISTS e_substituicao BOOLEAN DEFAULT FALSE;
		
-- Permitir que quantidade_gramas antiga não bloqueie se vier nula
ALTER TABLE itens_refeicao ALTER COLUMN quantidade_gramas DROP NOT NULL;
ALTER TABLE itens_refeicao ALTER COLUMN quantidade_gramas SET DEFAULT 0;

CREATE TABLE IF NOT EXISTS orientacoes_nutricionais (
    id SERIAL PRIMARY KEY,
    paciente_id INT UNIQUE REFERENCES pacientes(id) ON DELETE CASCADE,
    texto TEXT,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS historico_medico TEXT;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS alergias TEXT;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS intolerancias TEXT;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS rotina_diaria TEXT;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS historico_familiar TEXT;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS orientacoes_nutricionais (
    id SERIAL PRIMARY KEY,
    paciente_id INT UNIQUE REFERENCES pacientes(id) ON DELETE CASCADE,
    texto TEXT,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS checkins_semanais (
    id SERIAL PRIMARY KEY,
    paciente_id INT REFERENCES pacientes(id) ON DELETE CASCADE,
    peso_atual DECIMAL(5,2),
    circunferencia_cintura DECIMAL(5,2),
    nivel_energia INT,
    nivel_fome INT,
    qualidade_sono INT,
    aderencia_dieta INT,
    observacoes TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

