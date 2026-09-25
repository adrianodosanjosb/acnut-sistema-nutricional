using Npgsql;
using System.Text.Json;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Habilitar CORS para o Frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHttpClient();

var app = builder.Build();

app.UseCors("AllowAll");
app.UseSwagger();
app.UseSwaggerUI();

// String de Conexão com o PostgreSQL (smart_nutri_db)
string connString = "Host=localhost;Port=5432;Database=smart_nutri_db;Username=postgres;Password=admin;";

// 1. LISTAR PACIENTES (PAINEL GERAL)
app.MapGet("/api/pacientes", async () =>
{
    var pacientes = new List<object>();
    using var conn = new NpgsqlConnection(connString);
    await conn.OpenAsync();
    using var cmd = new NpgsqlCommand("SELECT id, nome, email, telefone, data_nascimento, sexo, status FROM pacientes ORDER BY id DESC;", conn);
    using var reader = await cmd.ExecuteReaderAsync();
    while (await reader.ReadAsync())
    {
        pacientes.Add(new
        {
            id = reader.GetInt32(0),
            nome = reader.GetString(1),
            email = reader.GetString(2),
            telefone = reader.IsDBNull(3) ? "" : reader.GetString(3),
            data_nascimento = reader.GetDateTime(4).ToString("yyyy-MM-dd"),
            sexo = reader.GetString(5),
            status = reader.IsDBNull(6) ? "ativo" : reader.GetString(6)
        });
    }
    return Results.Ok(pacientes);
});

// 2. CADASTRAR PACIENTE


// 3. AVALIAÇÃO FÍSICA + INTEGRAÇÃO COM MICROSERVIÇO PYTHON
app.MapPost("/api/avaliacoes", async (AvaliacaoInput input, IHttpClientFactory clientFactory) =>
{
    var httpClient = clientFactory.CreateClient();
    var payloadPython = new
    {
        idade = input.Idade,
        sexo = input.Sexo,
        peso_kg = input.PesoKg,
        altura_cm = input.AlturaCm,
        nivel_atividade = input.NivelAtividade,
        objetivo = input.Objetivo
    };

    var content = new StringContent(JsonSerializer.Serialize(payloadPython), Encoding.UTF8, "application/json");
    var responsePython = await httpClient.PostAsync("http://127.0.0.1:5000/calcular-plano", content);
    
    if (!responsePython.IsSuccessStatusCode)
    {
        return Results.Problem("Erro ao comunicar com o microserviço em Python de cálculos nutricionais.");
    }

    var jsonResp = await responsePython.Content.ReadAsStringAsync();
    using var doc = JsonDocument.Parse(jsonResp);
    var root = doc.RootElement;
    
    double tmb = root.GetProperty("tmb_kcal").GetDouble();
    double get = root.GetProperty("get_kcal").GetDouble();

    using var conn = new NpgsqlConnection(connString);
    await conn.OpenAsync();
    using var cmd = new NpgsqlCommand(@"
        INSERT INTO avaliacoes_fisicas (paciente_id, peso_kg, altura_cm, percentual_gordura, massa_magra_kg, tmb_kcal, get_kcal)
        VALUES (@paciente_id, @peso, @altura, @gordura, @massa_magra, @tmb, @get) RETURNING id;", conn);

    cmd.Parameters.AddWithValue("paciente_id", input.PacienteId);
    cmd.Parameters.AddWithValue("peso", input.PesoKg);
    cmd.Parameters.AddWithValue("altura", input.AlturaCm);
    cmd.Parameters.AddWithValue("gordura", input.PercentualGordura);
    cmd.Parameters.AddWithValue("massa_magra", input.MassaMagraKg);
    cmd.Parameters.AddWithValue("tmb", tmb);
    cmd.Parameters.AddWithValue("get", get);

    var avaliacaoId = await cmd.ExecuteScalarAsync();

    return Results.Ok(new
    {
        avaliacao_id = avaliacaoId,
        mensagem = "Avaliação registrada com sucesso!",
        calculos_python = JsonSerializer.Deserialize<object>(jsonResp)
    });
});

// 4. LISTAR ALIMENTOS
app.MapGet("/api/alimentos", async () =>
{
    var alimentos = new List<object>();
    using var conn = new NpgsqlConnection(connString);
    await conn.OpenAsync();
    using var cmd = new NpgsqlCommand("SELECT id, nome, categoria, calorias_100g, proteinas_100g, carboidratos_100g, gorduras_100g, fibras_100g FROM alimentos ORDER BY nome;", conn);
    using var reader = await cmd.ExecuteReaderAsync();
    while (await reader.ReadAsync())
    {
        alimentos.Add(new
        {
            id = reader.GetInt32(0),
            nome = reader.GetString(1),
            categoria = reader.GetString(2),
            calorias_100g = reader.GetDecimal(3),
            proteinas_100g = reader.GetDecimal(4),
            carboidratos_100g = reader.GetDecimal(5),
            gorduras_100g = reader.GetDecimal(6),
            fibras_100g = reader.GetDecimal(7)
        });
    }
    return Results.Ok(alimentos);
});

// 5. REGISTRAR CHECK-IN SEMANAL
app.MapPost("/api/checkins", async (CheckinInput input) =>
{
    using var conn = new NpgsqlConnection(connString);
    await conn.OpenAsync();
    using var cmd = new NpgsqlCommand(@"
        INSERT INTO checkins_semanais (paciente_id, peso_atual_kg, adesao_plano_porcentagem, observacoes_paciente)
        VALUES (@paciente_id, @peso, @adesao, @obs) RETURNING id;", conn);

    cmd.Parameters.AddWithValue("paciente_id", input.PacienteId);
    cmd.Parameters.AddWithValue("peso", input.PesoAtualKg);
    cmd.Parameters.AddWithValue("adesao", input.AdesaoPlanoPorcentagem);
    cmd.Parameters.AddWithValue("obs", input.Observacoes ?? "");

    var checkinId = await cmd.ExecuteScalarAsync();
    return Results.Created($"/api/checkins/{checkinId}", new { id = checkinId, mensagem = "Check-in registrado com sucesso!" });
});

// 6. GUARDAR / ATUALIZAR ANAMNESE (REQUISITO 2)
app.MapPost("/api/anamnese", async (AnamneseInput input) =>
{
    using var conn = new NpgsqlConnection(connString);
    await conn.OpenAsync();
    using var cmd = new NpgsqlCommand(@"
        INSERT INTO anamneses (paciente_id, historico_medico, alergias, intolerancias, rotina_diaria, historico_familiar)
        VALUES (@paciente_id, @historico, @alergias, @intolerancias, @rotina, @familiar)
        ON CONFLICT (paciente_id) DO UPDATE SET
            historico_medico = EXCLUDED.historico_medico,
            alergias = EXCLUDED.alergias,
            intolerancias = EXCLUDED.intolerancias,
            rotina_diaria = EXCLUDED.rotina_diaria,
            historico_familiar = EXCLUDED.historico_familiar,
            atualizado_em = CURRENT_TIMESTAMP
        RETURNING id;", conn);

    cmd.Parameters.AddWithValue("paciente_id", input.PacienteId);
    cmd.Parameters.AddWithValue("historico", input.HistoricoMedico ?? "");
    cmd.Parameters.AddWithValue("alergias", input.Alergias ?? "");
    cmd.Parameters.AddWithValue("intolerancias", input.Intolerancias ?? "");
    cmd.Parameters.AddWithValue("rotina", input.RotinaDiaria ?? "");
    cmd.Parameters.AddWithValue("familiar", input.HistoricoFamiliar ?? "");

    var id = await cmd.ExecuteScalarAsync();
    return Results.Ok(new { id, mensagem = "Anamnese salva com sucesso!" });
});

// 7. BUSCAR ANAMNESE DO PACIENTE
// 7. BUSCAR ANAMNESE DO PACIENTE (MODIFICADO PARA EVITAR 404)
app.MapGet("/api/anamnese/{pacienteId}", async (int pacienteId) =>
    {
    using var conn = new NpgsqlConnection(connString);
    await conn.OpenAsync();
    using var cmd = new NpgsqlCommand("SELECT historico_medico, alergias, intolerancias, rotina_diaria, historico_familiar FROM anamneses WHERE paciente_id = @id;", conn);
    cmd.Parameters.AddWithValue("id", pacienteId);
    using var reader = await cmd.ExecuteReaderAsync();
    
    if (await reader.ReadAsync())
    {
    return Results.Ok(new
    {
    historico_medico = reader.IsDBNull(0) ? "" : reader.GetString(0),
    alergias = reader.IsDBNull(1) ? "" : reader.GetString(1),
    intolerancias = reader.IsDBNull(2) ? "" : reader.GetString(2),
    rotina_diaria = reader.IsDBNull(3) ? "" : reader.GetString(3),
    historico_familiar = reader.IsDBNull(4) ? "" : reader.GetString(4)
    });
    }
    
    // Se não encontrar, em vez de 404, devolvemos um objeto vazio com status 200 OK
    return Results.Ok(new
    {
    historico_medico = "",
    alergias = "",
    intolerancias = "",
    rotina_diaria = "",
    historico_familiar = ""
    });
    });

// 8. CRIAR PLANO ALIMENTAR E REFEIÇÃO COM DIGITAÇÃO LIVRE E MACROS MANUAIS (AUTO-MIGRAÇÃO)
app.MapPost("/api/planos/item", async (ItemRefeicaoInput input) =>
{
    using var conn = new NpgsqlConnection(connString);
    await conn.OpenAsync();

    // Cria as colunas automaticamente se elas não existirem na base de dados
    using var cmdCheck = new NpgsqlCommand(@"
        ALTER TABLE itens_refeicao ADD COLUMN IF NOT EXISTS alimento_nome_livre VARCHAR(255);
        ALTER TABLE itens_refeicao ADD COLUMN IF NOT EXISTS kcal_manual NUMERIC(10,2) DEFAULT 0;
        ALTER TABLE itens_refeicao ADD COLUMN IF NOT EXISTS proteinas_manual NUMERIC(10,2) DEFAULT 0;
        ALTER TABLE itens_refeicao ADD COLUMN IF NOT EXISTS carbos_manual NUMERIC(10,2) DEFAULT 0;
        ALTER TABLE itens_refeicao ADD COLUMN IF NOT EXISTS gorduras_manual NUMERIC(10,2) DEFAULT 0;
        
        -- Garante que a coluna alimento_id pode ser nula para aceitar digitação livre
        ALTER TABLE itens_refeicao ALTER COLUMN alimento_id DROP NOT NULL;
    ", conn);
    await cmdCheck.ExecuteNonQueryAsync();

    // 8.1. Garante ou cria o plano alimentar para o paciente
    using var cmdPlano = new NpgsqlCommand(@"
        INSERT INTO planos_alimentares (paciente_id, nome_plano, meta_calorica_kcal)
        VALUES (@paciente_id, 'Plano Personalizado', @meta)
        ON CONFLICT DO NOTHING;
        SELECT id FROM planos_alimentares WHERE paciente_id = @paciente_id ORDER BY id DESC LIMIT 1;", conn);
    
    cmdPlano.Parameters.AddWithValue("paciente_id", input.PacienteId);
    cmdPlano.Parameters.AddWithValue("meta", input.MetaCalorica > 0 ? input.MetaCalorica : 2000);
    var planoId = (int)await cmdPlano.ExecuteScalarAsync();

    // 8.2. Garante ou cria a refeição (ex: Café, Almoço)
    using var cmdRef = new NpgsqlCommand(@"
        INSERT INTO refeicoes (plano_id, nome_refeicao, horario)
        VALUES (@plano_id, @nome_refeicao, @horario::time)
        ON CONFLICT DO NOTHING;
        SELECT id FROM refeicoes WHERE plano_id = @plano_id AND nome_refeicao = @nome_refeicao LIMIT 1;", conn);

    cmdRef.Parameters.AddWithValue("plano_id", planoId);
    cmdRef.Parameters.AddWithValue("nome_refeicao", input.NomeRefeicao);
    cmdRef.Parameters.AddWithValue("horario", string.IsNullOrEmpty(input.Horario) ? "08:00" : input.Horario);
    var refeicaoId = (int)await cmdRef.ExecuteScalarAsync();

    // 8.3. Insere o item com o nome livre e os macros manuais
    using var cmdItem = new NpgsqlCommand(@"
        INSERT INTO itens_refeicao (refeicao_id, alimento_nome_livre, quantidade_g, medida_caseira, kcal_manual, proteinas_manual, carbos_manual, gorduras_manual, e_substituicao)
        VALUES (@refeicao_id, @alimento_nome, @qtd, @medida, @kcal, @proteinas, @carbos, @gorduras, @e_sub) RETURNING id;", conn);

    cmdItem.Parameters.AddWithValue("refeicao_id", refeicaoId);
    cmdItem.Parameters.AddWithValue("alimento_nome", input.AlimentoNome ?? "Alimento");
    cmdItem.Parameters.AddWithValue("qtd", input.QuantidadeG);
    cmdItem.Parameters.AddWithValue("medida", input.MedidaCaseira ?? "");
    cmdItem.Parameters.AddWithValue("kcal", input.Kcal);
    cmdItem.Parameters.AddWithValue("proteinas", input.Proteinas);
    cmdItem.Parameters.AddWithValue("carbos", input.Carbos);
    cmdItem.Parameters.AddWithValue("gorduras", input.Gorduras);
    cmdItem.Parameters.AddWithValue("e_sub", input.ESubstituicao);

    var itemId = await cmdItem.ExecuteScalarAsync();
    return Results.Created($"/api/planos/item/{itemId}", new { id = itemId, mensagem = "Item adicionado ao plano com sucesso!" });
});

// 9. BUSCAR PLANO ALIMENTAR COMPLETO DO PACIENTE COM MACROS
    app.MapGet("/api/planos/{pacienteId}", async (int pacienteId) =>
    {
    using var conn = new NpgsqlConnection(connString);
    await conn.OpenAsync();

    using var cmd = new NpgsqlCommand(@"
    SELECT 
    i.id, -- <--- Adicionado para sabermos qual item apagar
    r.nome_refeicao,
    r.horario,
    COALESCE(i.alimento_nome_livre, a.nome, 'Alimento') AS alimento,
    i.quantidade_g,
    i.medida_caseira,
    i.e_substituicao,
    COALESCE(i.kcal_manual, ROUND((a.calorias_100g * i.quantidade_g / 100)::numeric, 1), 0) AS kcal,
    COALESCE(i.proteinas_manual, ROUND((a.proteinas_100g * i.quantidade_g / 100)::numeric, 1), 0) AS proteinas,
    COALESCE(i.carbos_manual, ROUND((a.carboidratos_100g * i.quantidade_g / 100)::numeric, 1), 0) AS carbos,
    COALESCE(i.gorduras_manual, ROUND((a.gorduras_100g * i.quantidade_g / 100)::numeric, 1), 0) AS gorduras
    FROM planos_alimentares p
    JOIN refeicoes r ON r.plano_id = p.id
    JOIN itens_refeicao i ON i.refeicao_id = r.id
    LEFT JOIN alimentos a ON a.id = i.alimento_id
    WHERE p.paciente_id = @id
    ORDER BY r.horario, i.e_substituicao;", conn);

    cmd.Parameters.AddWithValue("id", pacienteId);
    using var reader = await cmd.ExecuteReaderAsync();

    var itens = new List<object>();
    while (await reader.ReadAsync())
    {
        itens.Add(new
        {
            id = reader.GetInt32(0), // <--- Incluído no objeto JSON
            refeicao = reader.GetString(1),
            horario = reader.GetTimeSpan(2).ToString(@"hh\:mm"),
            alimento = reader.GetString(3),
            quantidadeG = reader.GetDouble(4),
            medidaCaseira = reader.IsDBNull(5) ? "" : reader.GetString(5),
            eSubstituicao = reader.GetBoolean(6),
            kcal = reader.GetDecimal(7),
            proteinas = reader.GetDecimal(8),
            carbos = reader.GetDecimal(9),
            gorduras = reader.GetDecimal(10)
        });
    }

    return Results.Ok(itens);
});

// 10. EXCLUIR ITEM DO PLANO ALIMENTAR
app.MapDelete("/api/planos/item/{id}", async (int id) =>
{
    using var conn = new NpgsqlConnection(connString);
    await conn.OpenAsync();
    
    using var cmd = new NpgsqlCommand("DELETE FROM itens_refeicao WHERE id = @id", conn);
    cmd.Parameters.AddWithValue("id", id);
    
    var rowsAffected = await cmd.ExecuteNonQueryAsync();
    if (rowsAffected > 0)
    {
        return Results.Ok(new { mensagem = "Item excluído com sucesso!" });
    }
    
    return Results.NotFound(new { mensagem = "Item não encontrado." });
});

// 11. SALVAR OU ATUALIZAR ORIENTAÇÕES
app.MapPost("/api/orientacoes", async (OrientacaoDto dto) =>
{
    using var conn = new NpgsqlConnection(connString);
    await conn.OpenAsync();

    using var cmd = new NpgsqlCommand(@"
        INSERT INTO orientacoes_nutricionais (paciente_id, texto, atualizado_em)
        VALUES (@pacienteId, @texto, CURRENT_TIMESTAMP)
        ON CONFLICT (paciente_id) 
        DO UPDATE SET texto = EXCLUDED.texto, atualizado_em = CURRENT_TIMESTAMP;", conn);

    cmd.Parameters.AddWithValue("pacienteId", dto.PacienteId);
    cmd.Parameters.AddWithValue("texto", dto.Texto ?? "");

    await cmd.ExecuteNonQueryAsync();
    return Results.Ok(new { mensagem = "Orientações salvas com sucesso!" });
});

// 12. CARREGAR ORIENTAÇÕES POR PACIENTE
app.MapGet("/api/orientacoes/{pacienteId}", async (int pacienteId) =>
{
    using var conn = new NpgsqlConnection(connString);
    await conn.OpenAsync();

    using var cmd = new NpgsqlCommand("SELECT texto FROM orientacoes_nutricionais WHERE paciente_id = @id", conn);
    cmd.Parameters.AddWithValue("id", pacienteId);

    var resultado = await cmd.ExecuteScalarAsync();
    return Results.Ok(new { texto = resultado?.ToString() ?? "" });
    });

// 13. LISTAR CHECK-INS DO PACIENTE
    app.MapGet("/api/checkins/{pacienteId}", async (int pacienteId) =>
    {
    var checkins = new List<object>();
    using var conn = new NpgsqlConnection(connString);
    await conn.OpenAsync();
    using var cmd = new NpgsqlCommand("SELECT id, data_checkin, peso_atual_kg, adesao_plano_porcentagem, observacoes_paciente FROM checkins_semanais WHERE paciente_id = @id ORDER BY data_checkin DESC;", conn);
    cmd.Parameters.AddWithValue("id", pacienteId);
    using var reader = await cmd.ExecuteReaderAsync();
    while (await reader.ReadAsync())
    {
    checkins.Add(new
    {
    id = reader.GetInt32(0),
    data_checkin = reader.GetDateTime(1).ToString("yyyy-MM-dd"),
    peso_atual_kg = reader.GetDecimal(2),
    adesao_plano_porcentagem = reader.GetInt32(3),
    observacoes_paciente = reader.IsDBNull(4) ? "" : reader.GetString(4)
    });
    }
    return Results.Ok(checkins); // Se não houver check-ins, devolve [] com sucesso (200 OK)
});
// 14. EXCLUIR PACIENTE
app.MapDelete("/api/pacientes/{id}", async (int id) =>
{
    Console.WriteLine($"=== CHEGOU PEDIDO PARA APAGAR O PACIENTE ID: {id} ===");
    using var conn = new NpgsqlConnection(connString);
    await conn.OpenAsync();
    
    using var cmd = new NpgsqlCommand("DELETE FROM pacientes WHERE id = @id", conn);
    cmd.Parameters.AddWithValue("id", id);
    
    var rowsAffected = await cmd.ExecuteNonQueryAsync();
    if (rowsAffected > 0)
    {
    return Results.Ok(new { mensagem = "Paciente excluído com sucesso!" });
    }
    
    return Results.NotFound(new { mensagem = "Paciente não encontrado." });
});
// 15. ATUALIZAR PACIENTE
    app.MapPut("/api/pacientes/{id}", async (int id, Microsoft.AspNetCore.Http.HttpRequest request) =>
    {
    // Lê os dados que vêm do JavaScript em formato JSON
    var data = await System.Text.Json.JsonSerializer.DeserializeAsync<System.Text.Json.JsonElement>(request.Body);
    
    string nome = data.GetProperty("nome").GetString()!;
    string email = data.GetProperty("email").GetString()!;
    string telefone = data.TryGetProperty("telefone", out var tel) ? tel.GetString() ?? "" : "";
    string dataNascimento = data.GetProperty("data_nascimento").GetString()!;
    string sexo = data.GetProperty("sexo").GetString()!;
    string status = data.TryGetProperty("status", out var st) ? st.GetString() ?? "ativo" : "ativo";

    using var conn = new NpgsqlConnection(connString);
    await conn.OpenAsync();
    
    using var cmd = new NpgsqlCommand(
    @"UPDATE pacientes 
    SET nome = @nome, email = @email, telefone = @telefone, data_nascimento = @data, sexo = @sexo, status = @status 
    WHERE id = @id", conn);
          
    cmd.Parameters.AddWithValue("id", id);
    cmd.Parameters.AddWithValue("nome", nome);
    cmd.Parameters.AddWithValue("email", email);
    cmd.Parameters.AddWithValue("telefone", telefone);
    cmd.Parameters.AddWithValue("data", DateTime.Parse(dataNascimento));
    cmd.Parameters.AddWithValue("sexo", sexo);
    cmd.Parameters.AddWithValue("status", status);
    
    var rowsAffected = await cmd.ExecuteNonQueryAsync();
    if (rowsAffected > 0)
    {
    return Results.Ok(new { mensagem = "Paciente atualizado com sucesso!" });
    }
    
    return Results.NotFound(new { mensagem = "Paciente não encontrado." });
    });

// 14. EXECUÇÃO DA APLICAÇÃO (Deve ficar antes dos 'record')
app.Run("http://localhost:5001");
// Regista a classe DTO correspondente
public record OrientacaoDto(int PacienteId, string Texto);
record PacienteInput(string Nome, string Email, string Telefone, string DataNascimento, string Sexo);
record AvaliacaoInput(int PacienteId, int Idade, string Sexo, double PesoKg, double AlturaCm, string NivelAtividade, string Objetivo, double PercentualGordura, double MassaMagraKg);
record CheckinInput(int PacienteId, double PesoAtualKg, int AdesaoPlanoPorcentagem, string Observacoes);
record AnamneseInput(int PacienteId, string HistoricoMedico, string Alergias, string Intolerancias, string RotinaDiaria, string HistoricoFamiliar);
record ItemRefeicaoInput(
    int PacienteId, 
    double MetaCalorica, 
    string NomeRefeicao, 
    string Horario, 
    string AlimentoNome, 
    double QuantidadeG, 
    string MedidaCaseira, 
    double Kcal, 
    double Proteinas, 
    double Carbos, 
    double Gorduras, 
    bool ESubstituicao
);