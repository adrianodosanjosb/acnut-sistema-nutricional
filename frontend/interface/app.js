const API_URL = "http://localhost:5001/api";
let pacienteEmEdicaoId = null; // Se for null, está a criar. Se tiver um número, está a editar.

// 1. NAVEGAÇÃO ENTRE SEÇÕES
        function navegar(secao) {
        document.querySelectorAll("main > section").forEach(s => s.classList.add("hidden"));
        const secaoAlvo = document.getElementById(`sec-${secao}`);
        if (secaoAlvo) {
        secaoAlvo.classList.remove("hidden");
        }

        if (secao === 'pacientes' || secao === 'dashboard') {
        carregarPacientes();
        } else if (secao === 'plano' || secao === 'dieta') {
        carregarAlimentos();
        }
        }

// 2. CARREGAR PACIENTES
        async function carregarPacientes() {
        try {
        console.log("A tentar buscar pacientes em:", `${API_URL}/pacientes`); // <-- CORRIGIDO AQUI (sem o /api extra)
        const response = await fetch(`${API_URL}/pacientes`);
        
        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
        
        const pacientes = await response.json();
        console.log("Pacientes recebidos com sucesso:", pacientes);
    
        // Atualiza o contador de total de pacientes
        const elementoTotal = document.getElementById("total-pacientes");
        if (elementoTotal) {
        elementoTotal.innerText = pacientes.length;
        } else {
        console.warn("Elemento com ID 'total-pacientes' não foi encontrado no HTML!");
        }

        const tabela = document.getElementById("tabela-pacientes");
if (!tabela) return;

tabela.innerHTML = "";
pacientes.forEach(p => {
  tabela.innerHTML += `
  <tr class="border-b border-slate-700 hover:bg-slate-800/50">
    <td class="py-3 px-4 text-white">#${p.id}</td>
    <td class="py-3 px-4 font-medium text-emerald-400">${p.nome}</td>
    <td class="py-3 px-4 text-slate-300">${p.email}</td>
    <td class="py-3 px-4 text-slate-300">${p.data_nascimento || '-'}</td>
    <td class="py-3 px-4 text-slate-300">${p.telefone || '-'}</td>
    <td class="py-3 px-4">
      <span class="px-2.5 py-1 text-xs bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">Ativo</span>
    </td>
    <td class="py-3 px-4 flex items-center gap-2">
      <button onclick="abrirProntuarioDireto(${p.id})" class="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white px-3 py-1 rounded text-xs font-semibold transition">
        Prontuário
      </button>
      <button onclick="editarPaciente(${p.id})" class="bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-white px-3 py-1 rounded text-xs font-semibold transition">
        Editar
      </button>
      <button onclick="excluirPaciente(${p.id})" class="bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white px-3 py-1 rounded text-xs font-semibold transition">
        Excluir
      </button>
    </td>
  </tr>
  `;
});
        } catch (err) {
        console.error("Erro detalhado ao carregar pacientes:", err);
        }
        }
        // Garante que corre mal a página abra
        document.addEventListener("DOMContentLoaded", () => {
        carregarPacientes();
        });

        // Atalho prático para ir direto ao prontuário do paciente selecionado
// 3. ABRIR PRONTUÁRIO DIRETO        
        function abrirProntuarioDireto(id) {
        navegar('prontuario'); // Muda para a secção do prontuário
        document.getElementById("prontuario-paciente-id").value = id;
        carregarProntuarioCompleto(); // Dispara o carregamento das abas
        }

// 4. CADASTRAR PACIENTE
        async function cadastrarPaciente(event) {
        event.preventDefault();

        const dadosPaciente = {
        nome: document.getElementById('p-nome').value,
        email: document.getElementById('p-email').value,
        telefone: document.getElementById('p-telefone').value,
        data_nascimento: document.getElementById('p-data').value,
        sexo: document.getElementById('p-sexo').value,
        status: "ativo"
        };

        let url = `${API_URL}/pacientes`;
        let metodo = 'POST';

        // Se a variável tiver um ID, mudamos para o modo de edição (PUT)
        if (pacienteEmEdicaoId !== null) {
        url = `${API_URL}/pacientes/${pacienteEmEdicaoId}`;
        metodo = 'PUT';
        }

        try {
        const response = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosPaciente)
        });

        if (response.ok) {
        alert(pacienteEmEdicaoId !== null ? "Paciente atualizado com sucesso!" : "Paciente cadastrado com sucesso!");
            
        // Limpa o formulário e reseta o estado de edição
        document.getElementById('form-paciente').reset();
        pacienteEmEdicaoId = null;

        // Restaura o visual padrão do botão
        const btnSubmit = document.querySelector('#form-paciente button[type="submit"]') || document.querySelector('#form-paciente button');
        if (btnSubmit) {
        btnSubmit.textContent = "Cadastrar Paciente";
        btnSubmit.classList.remove('bg-amber-600', 'hover:bg-amber-700');
        btnSubmit.classList.add('bg-emerald-600', 'hover:bg-emerald-700');
        }

        // Recarrega a tabela de pacientes
        carregarPacientes();
        } else {
        alert("Erro ao guardar os dados do paciente.");
        }
        } catch (error) {
        console.error("Erro na requisição:", error);
        alert("Erro de conexão com o servidor C#.");
        }
        }

// 5. AVALIAÇÃO FÍSICA E CÁLCULOS
        async function gerarAvaliacao(e) {
        e.preventDefault();
        const body = {
        pacienteId: parseInt(document.getElementById("a-paciente-id").value),
        idade: parseInt(document.getElementById("a-idade").value),
        sexo: document.getElementById("a-sexo").value,
        pesoKg: parseFloat(document.getElementById("a-peso").value),
        alturaCm: parseFloat(document.getElementById("a-altura").value),
        nivelAtividade: document.getElementById("a-atividade").value,
        objetivo: document.getElementById("a-objetivo").value,
        percentualGordura: parseFloat(document.getElementById("a-gordura").value || 0),
        massaMagraKg: parseFloat(document.getElementById("a-massa").value || 0)
        };

        const res = await fetch(`${API_URL}/avaliacoes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
        });

        if (res.ok) {
        const data = await res.json();
        const calc = data.calculos_python;
    
        document.getElementById("resultado-avaliacao").classList.remove("hidden");
        document.getElementById("cards-resultado").innerHTML = `
        <div class="bg-slate-900 p-3 rounded border border-slate-700"><span class="text-xs text-slate-400">TMB</span><p class="text-xl font-bold text-emerald-400">${calc.tmb_kcal} kcal</p></div>
        <div class="bg-slate-900 p-3 rounded border border-slate-700"><span class="text-xs text-slate-400">GET</span><p class="text-xl font-bold text-emerald-400">${calc.get_kcal} kcal</p></div>
        <div class="bg-slate-900 p-3 rounded border border-slate-700"><span class="text-xs text-slate-400">Meta Calórica</span><p class="text-xl font-bold text-emerald-400">${calc.meta_calorias} kcal</p></div>
        <div class="bg-slate-900 p-3 rounded border border-slate-700"><span class="text-xs text-slate-400">Proteínas / Carb / Gord</span><p class="text-sm font-semibold text-emerald-400">${calc.macronutrientes.proteinas_g}g / ${calc.macronutrientes.carboidratos_g}g / ${calc.macronutrientes.gorduras_g}g</p></div>
        `;
        }
        }

// 6. REGISTAR CHECK-IN
        async function salvarCheckin(e) {
        e.preventDefault();
        const body = {
        pacienteId: parseInt(document.getElementById("c-paciente-id").value),
        pesoAtualKg: parseFloat(document.getElementById("c-peso").value),
        adesaoPlanoPorcentagem: parseInt(document.getElementById("c-adesao").value),
        observacoes: document.getElementById("c-obs").value
        };

        const res = await fetch(`${API_URL}/checkins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
        });

        if (res.ok) {
        alert("Check-in semanal registrado!");
        }
        }

// 7. ANAMNESE (GUARDAR E CARREGAR)
        async function salvarAnamnese(e) {
        if (e) e.preventDefault();
        const body = {
        pacienteId: parseInt(document.getElementById("an-paciente-id").value),
        historicoMedico: document.getElementById("an-historico").value,
        alergias: document.getElementById("an-alergias").value,
        intolerancias: document.getElementById("an-intolerancias").value,
        rotinaDiaria: document.getElementById("an-rotina").value,
        historicoFamiliar: document.getElementById("an-familiar").value
        };

        const res = await fetch(`${API_URL}/anamnese`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
        });

        if (res.ok) {
        alert("Anamnese salva com sucesso!");
        }
        }

// 8. CARREGAR ANAMNESE        
        async function carregarAnamnese() {
        const pacienteId = document.getElementById("an-paciente-id").value;
        if (!pacienteId) {
        alert("Informa o ID do paciente para buscar a anamnese.");
        return;
        }

        const res = await fetch(`${API_URL}/anamnese/${pacienteId}`);
        if (res.ok) {
        const data = await res.json();
        document.getElementById("an-historico").value = data.historico_medico || "";
        document.getElementById("an-alergias").value = data.alergias || "";
        document.getElementById("an-intolerancias").value = data.intolerancias || "";
        document.getElementById("an-rotina").value = data.rotina_diaria || "";
        document.getElementById("an-familiar").value = data.historico_familiar || "";
        alert("Anamnese carregada!");
        } else {
        alert("Nenhuma anamnese encontrada para este paciente.");
        }
        }

// 9. CARREGAR LISTA DE ALIMENTOS NO SELECT
        async function carregarAlimentos() {
        const select = document.getElementById("item-alimento");
        if (!select) return;

        try {
        const res = await fetch(`${API_URL}/alimentos`);
        const alimentos = await res.json();

        select.innerHTML = `<option value="">Selecione um alimento...</option>`;
        alimentos.forEach(a => {
        select.innerHTML += `<option value="${a.id}">${a.nome} (${a.calorias_100g} kcal/100g)</option>`;
        });
        } catch (err) {
        console.error("Erro ao carregar alimentos:", err);
        }
        }

// 10. VISUALIZAR PLANO ALIMENTAR COMPLETO
        async function carregarPlanoAlimentar() {
        const pacienteId = document.getElementById("pl-paciente-id").value;
        if (!pacienteId) {
        alert("Por favor, introduz o ID do paciente.");
        return;
        }

        const res = await fetch(`${API_URL}/planos/${pacienteId}`);
        if (!res.ok) {
        alert("Erro ao procurar o plano alimentar.");
        return;
        }

        const itens = await res.json();
        const contentor = document.getElementById("plano-resultado");

        if (itens.length === 0) {
        contentor.innerHTML = `<p class="text-slate-400">Nenhum item registado para este paciente.</p>`;
        return;
        }

        let html = `<div class="space-y-4">`;
        let totalKcal = 0, totalProt = 0, totalCarb = 0, totalGord = 0;

        itens.forEach(item => {
        if (!item.eSubstituicao) {
        totalKcal += Number(item.kcal);
        totalProt += Number(item.proteinas);
        totalCarb += Number(item.carbos);
        totalGord += Number(item.gorduras);
        }

        const tagSub = item.eSubstituicao 
        ? `<span class="bg-amber-500/20 text-amber-300 text-xs px-2 py-0.5 rounded">Opção Substituta</span>` 
        : `<span class="bg-emerald-500/20 text-emerald-300 text-xs px-2 py-0.5 rounded">Principal</span>`;

        html += `
        <div class="bg-slate-900 p-4 rounded-lg border border-slate-700 flex justify-between items-center">
        <div>
        <div class="flex items-center gap-2">
        <span class="font-bold text-white">${item.refeicao} (${item.horario})</span>
        ${tagSub}
        </div>
        <div class="text-sm text-slate-300 font-medium mt-1">${item.alimento} - ${item.quantidadeG}g (${item.medidaCaseira})</div>
        </div>
        <div class="text-right text-xs text-slate-400 space-y-0.5">
        <div class="text-emerald-400 font-bold text-sm">${item.kcal} kcal</div>
        <div>P: ${item.proteinas}g | C: ${item.carbos}g | G: ${item.gorduras}g</div>
        </div>
        </div>
        `;
        });

        html += `
        <div class="bg-emerald-950/60 border border-emerald-500/30 p-4 rounded-lg flex justify-between items-center mt-6">
        <span class="font-bold text-emerald-300">TOTAL DIÁRIO (Itens Principais)</span>
        <div class="text-right">
        <div class="text-lg font-extrabold text-emerald-400">${totalKcal.toFixed(1)} Kcal</div>
        <div class="text-xs text-emerald-200 font-medium">Proteínas: ${totalProt.toFixed(1)}g | Carbos: ${totalCarb.toFixed(1)}g | Gorduras: ${totalGord.toFixed(1)}g</div>
        </div>
        </div>
        </div>`;

        contentor.innerHTML = html;
        }

// 11. LIGAR O CALCULO NUTRICIONAL AO MICROSSERVIÇO PYTHON
        const PYTHON_API_URL = "http://localhost:5001"; // Ajusta se a porta do Python for diferente
        async function calcularMetasNutricionais(dadosAntropometricos) {
        try {
        const response = await fetch(`${PYTHON_API_URL}/calcular`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dadosAntropometricos)
        });

        if (!response.ok) throw new Error("Erro no cálculo do microsserviço Python");

        const resultado = await response.json();
        return resultado; // Retorna as calorias, proteínas, carboidratos calculados
        } catch (err) {
        console.error("Erro ao comunicar com o microsserviço Python:", err);
        }
        }

// 12. ALTERNAR ENTRE AS 10 ABAS DO PRONTUÁRIO
        function trocarAbaProntuario(nomeAba) {
        // Esconde todos os conteúdos das abas
        document.querySelectorAll(".aba-conteudo").forEach(el => el.classList.add("hidden"));
        // Reseta a cor de todas as abas
        document.querySelectorAll(".aba-item").forEach(el => {
        el.classList.remove("bg-emerald-600", "text-white");
        el.classList.add("bg-slate-800", "text-slate-400");
        });
        // Mostra o conteúdo da aba selecionada
        const abaAlvo = document.getElementById(`sub-${nomeAba}`);
        if (abaAlvo) abaAlvo.classList.remove("hidden");
        // Destaca o botão da aba selecionada
        const btnTab = document.getElementById(`tab-${nomeAba}`);
        if (btnTab) {
        btnTab.classList.remove("bg-slate-800", "text-slate-400");
        btnTab.classList.add("bg-emerald-600", "text-white");
        }
        }

// 13. CARREGAR TODOS OS DADOS DO PACIENTE NO PRONTUÁRIO
        async function carregarProntuarioCompleto() {
        const pacienteId = document.getElementById("prontuario-paciente-id").value;
        if (!pacienteId) {
        alert("Por favor, introduz o ID do paciente.");
        return;
        }
        try {
        // 11.1 BUSCAR PERFIL DO PACIENTE
        const resPacientes = await fetch(`${API_URL}/pacientes`);
        const pacientes = await resPacientes.json();
        const paciente = pacientes.find(p => p.id === parseInt(pacienteId));
        if (!paciente) {
        alert("Paciente não encontrado!");
        return;
        }        
        // Exibir Cabeçalho
        document.getElementById("prontuario-cabecalho-paciente").classList.remove("hidden");
        document.getElementById("p-cab-nome").innerText = `${paciente.nome} (#${paciente.id})`;
        document.getElementById("p-cab-email").innerText = paciente.email;
    
        // Preencher Aba Perfil
        document.getElementById("conteudo-perfil").innerHTML = `
        <div class="bg-slate-900 p-3 rounded border border-slate-700"><strong>Nome:</strong> ${paciente.nome}</div>
        <div class="bg-slate-900 p-3 rounded border border-slate-700"><strong>E-mail:</strong> ${paciente.email}</div>
        <div class="bg-slate-900 p-3 rounded border border-slate-700"><strong>Telefone:</strong> ${paciente.telefone || 'Não informado'}</div>
        <div class="bg-slate-900 p-3 rounded border border-slate-700"><strong>Data de Nascimento:</strong> ${paciente.data_nascimento}</div>
        <div class="bg-slate-900 p-3 rounded border border-slate-700"><strong>Sexo:</strong> ${paciente.sexo}</div>
        <div class="bg-slate-900 p-3 rounded border border-slate-700"><strong>Estado:</strong> ${paciente.status}</div>
        `;
        // 11.2 BUSCAR ANAMNESE
        const resAnamnese = await fetch(`${API_URL}/anamnese/${pacienteId}`);
        if (resAnamnese.ok) {
        const dataAnamnese = await resAnamnese.json();
        document.getElementById("p-an-historico").value = dataAnamnese.historico_medico || "";
        document.getElementById("p-an-alergias").value = dataAnamnese.alergias || "";
        document.getElementById("p-an-intolerancias").value = dataAnamnese.intolerancias || "";
        document.getElementById("p-an-rotina").value = dataAnamnese.rotina_diaria || "";
        }
        // 11.3 BUSCAR PLANO ALIMENTAR PARA A ABA DE PLANOS
        const plPacienteId = document.getElementById("pl-paciente-id");
        if (plPacienteId) plPacienteId.value = pacienteId;
        // Tenta buscar o plano real; se falhar ou estiver vazio, podes chamar o exemplo se quiseres testar
        await carregarPlanoAlimentarProntuario(pacienteId);
        // 11.4 CARREGAR O GRÁFICO DE EVOLUÇÃO
        await carregarGraficoEvolucao(pacienteId);
        } catch (err) {
        console.error("Erro ao carregar prontuário:", err);
        }
        }
// 14. FUNÇÃO DE EXEMPLO PARA RENDERIZAR O PLANO ALIMENTAR
        function renderizarPlanoExemplo() {
        const containerPlano = document.getElementById('prontuario-plano-resultado');
        if (containerPlano) {
        containerPlano.innerHTML = `
        <div class="space-y-4">
        <div class="bg-slate-900 p-4 rounded-lg border border-slate-700">
        <h4 class="font-bold text-emerald-400">Café da Manhã</h4>
        <p class="text-sm text-slate-300">2 ovos mexidos + 1 fatia de pão integral + 1 chávena de café sem açúcar.</p>
        </div>
        <div class="bg-slate-900 p-4 rounded-lg border border-slate-700">
        <h4 class="font-bold text-emerald-400">Almoço</h4>
        <p class="text-sm text-slate-300">150g de peito de frango grelhado + 100g de arroz integral + Salada verde à vontade com azeite.</p>
        </div>
        <div class="bg-slate-900 p-4 rounded-lg border border-slate-700">
        <h4 class="font-bold text-emerald-400">Jantar</h4>
        <p class="text-sm text-slate-300">150g de salmão ou pescada + Puré de batata-doce (120g) + Brócolis ao vapor.</p>
        </div>
        </div>
        `;
        }
        }

// 15. CARREGAR PLANO DENTRO DA ABA DO PRONTUÁRIO
        async function carregarPlanoAlimentarProntuario(pacienteId) {
        try {
        const res = await fetch(`${API_URL}/planos/${pacienteId}`);
        const contentor = document.getElementById("prontuario-plano-resultado");

        if (!contentor) return;

        if (!res.ok) {
        contentor.innerHTML = `<p class="text-slate-400">Nenhum plano registado.</p>`;
        return;
        }

        const itens = await res.json();
        if (!itens || itens.length === 0) {
        contentor.innerHTML = `<p class="text-slate-400">Nenhum alimento registado para este paciente.</p>`;
        return;
        }

        let html = `<div class="space-y-3">`;
        itens.forEach(item => {
        html += `
        <div class="bg-slate-900 p-3 rounded-lg border border-slate-700 flex justify-between items-center text-sm">
        <div>
        <span class="font-bold text-emerald-400">${item.refeicao} (${item.horario})</span>: 
        <span class="text-white">${item.alimento}</span> - ${item.quantidadeG}g (${item.medidaCaseira || ''})
        </div>
        <div class="flex items-center gap-4">
        <span class="text-xs text-slate-400 font-mono">${item.kcal} kcal | P:${item.proteinas}g C:${item.carbos}g G:${item.gorduras}g</span>
        <button onclick="removerItemPlano(${item.id}, ${pacienteId})" class="text-red-400 hover:text-red-300 transition-colors p-1" title="Excluir alimento">
        🗑️
        </button>
        </div>
        </div>`;
        });
        html += `</div>`;
        contentor.innerHTML = html;
        } catch (err) {
        console.error("Erro ao carregar plano alimentar:", err);
        }
        }
// 16. FUNÇÃO AUXILIAR PARA APAGAR O ITEM
async function removerItemPlano(itemId, pacienteId) {
    if (!confirm("Tens a certeza que pretendes remover este alimento do plano?")) return;

    try {
        const res = await fetch(`${API_URL}/planos/item/${itemId}`, {
            method: "DELETE"
        });

        if (res.ok) {
            carregarPlanoAlimentarProntuario(pacienteId);
        } else {
            alert("Erro ao excluir o item.");
        }
    } catch (err) {
        console.error("Erro ao excluir item:", err);
        alert("Erro de conexão com o servidor.");
    }
}

// 17. FUNÇÃO PARA GERAR PDF DO PLANO ALIMENTAR // --- ATUALIZAÇÃO COMPLETA PARA O APP.JS ---
        // 17.1 Função melhorada para guardar o ID ativo globalmente sempre que abrir o prontuário
        function abrirProntuarioPaciente(id) {
        const input = document.getElementById("prontuario-paciente-id");
        if (input) input.value = id;
        window.pacienteIdAtivo = id; // Garante que o ID nunca se perde
        carregarPlanoAlimentarProntuario(id);
        }
        // 17.2 Função unificada para adicionar itens ao plano (com suporte a digitação manual ou seleção)
        async function adicionarItemAutomatico(e) {
        if (e) e.preventDefault();

        const pacienteId = parseInt(document.getElementById("prontuario-paciente-id").value) || window.pacienteIdAtivo;
        if (!pacienteId) {
        alert("Por favor, selecione ou informe o ID do paciente no prontuário.");
        return;
        }

        const body = {
        pacienteId: pacienteId,
        metaCalorica: 2000,
        nomeRefeicao: document.getElementById("item-refeicao").value,
        horario: document.getElementById("item-horario").value,
        alimento: document.getElementById("item-alimento-livre").value,
        quantidadeG: parseFloat(document.getElementById("item-qtd").value) || 0,
        medidaCaseira: document.getElementById("item-medida").value,
        kcal: parseFloat(document.getElementById("item-kcal").value) || 0,
        proteinas: parseFloat(document.getElementById("item-prot").value) || 0,
        carbos: parseFloat(document.getElementById("item-carbo").value) || 0,
        gorduras: parseFloat(document.getElementById("item-gordura").value) || 0, // <--- Atualizado aqui
        eSubstituicao: false
        };

        try {
        const res = await fetch(`${API_URL}/planos/item`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
        });

        if (res.ok) {
        alert("Alimento adicionado com sucesso ao plano!");
        document.getElementById("form-adicionar-item").reset();
        carregarPlanoAlimentarProntuario(pacienteId);
        } else {
        alert("Erro ao salvar o item no plano.");
        }
        } catch (err) {
        console.error("Erro ao enviar item automático:", err);
        alert("Erro de conexão com o servidor.");
        }
        }
        // 17.3 Função robusta e definitiva para Gerar o PDF com todos os dados preenchidos
        async function gerarPDFPlanoAlimentar() {
    const inputElement = document.getElementById("prontuario-paciente-id");
    const pacienteId = (inputElement && inputElement.value) ? parseInt(inputElement.value) : window.pacienteIdAtivo;
    if (!pacienteId) {
        alert("Por favor, selecione um paciente e abra o prontuário primeiro.");
        return;
    }

    const elementoPdf = document.getElementById("pdf-template-container");
    if (!elementoPdf) {
        alert("Erro crítico: O template do PDF não foi encontrado no HTML.");
        return;
    }
    try {
        // Buscar dados do paciente
        const resPacientes = await fetch(`${API_URL}/pacientes`);
        if (!resPacientes.ok) throw new Error("Erro ao carregar lista de pacientes.");
        const pacientes = await resPacientes.json();
        const paciente = pacientes.find(p => p.id === pacienteId);
        
        // Buscar plano alimentar do paciente
        const resPlano = await fetch(`${API_URL}/planos/${pacienteId}`);
        if (!resPlano.ok) {
            alert("Este paciente ainda não possui um plano alimentar registado.");
            return;
        }
        const itens = await resPlano.json();
        if (!itens || itens.length === 0) {
            alert("Não há nenhum alimento registado neste plano para exportar!");
            return;
        }

        // Buscar as orientações nutricionais
        let textoOrientacoes = "Nenhuma orientação registada.";
        try {
            const resOrientacoes = await fetch(`${API_URL}/orientacoes/${pacienteId}`);
            if (resOrientacoes.ok) {
            const dataOrientacoes = await resOrientacoes.json();
            console.log("DADOS DAS ORIENTAÇÕES:", dataOrientacoes);
            textoOrientacoes = dataOrientacoes.texto || "Nenhuma orientação registada.";
            }
        } catch (err) {
            console.error("Erro ao buscar orientações para o PDF:", err);
        }

        // Preencher cabeçalho do template
        document.getElementById("pdf-paciente-nome").innerText = paciente ? paciente.nome : `Paciente #${pacienteId}`;
        document.getElementById("pdf-paciente-email").innerText = paciente && paciente.email ? paciente.email : "Não informado";
        document.getElementById("pdf-data-emissao").innerText = `Emitido em: ${new Date().toLocaleDateString('pt-PT')}`;
        
        let htmlRefeicoes = "";
        let totalKcalGeral = 0;

        itens.forEach(item => {
            if (!item.eSubstituicao) {
                totalKcalGeral += Number(item.kcal || 0);
            }
            const tipoTag = item.eSubstituicao ? "(Opção / Substituição)" : "(Principal)";                    
            htmlRefeicoes += `
                <div style="border-bottom: 1px solid #e2e8f0; padding: 10px 0; display: flex; justify-content: space-between; font-size: 13px;">
                    <div>
                        <strong style="color: #047857;">${item.refeicao || 'Refeição'} (${item.horario || '--:--'})</strong> ${tipoTag}<br>
                        <span style="color: #334155;">${item.alimento || 'Alimento'} - ${item.quantidadeG || 0}g (${item.medidaCaseira || ''})</span>
                    </div>
                    <div style="text-align: right; color: #475569; min-width: 120px;">
                        <strong style="color: #059669;">${item.kcal || 0} kcal</strong><br>
                        <span style="font-size: 11px;">P:${item.proteinas || 0}g | C:${item.carbos || 0}g | G:${item.gorduras || 0}g</span>
                    </div>
                </div>
            `;
        });

        htmlRefeicoes += `
            <div style="margin-top: 15px; background: #ecfdf5; border: 1px solid #10b981; padding: 12px 15px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
                <strong style="color: #065f46; font-size: 14px;">Total Calórico Diário (Itens Principais)</strong>
                <span style="color: #047857; font-size: 16px; font-weight: bold;">${totalKcalGeral.toFixed(1)} kcal</span>  
            </div>
        `;

        document.getElementById("pdf-conteudo-refeicoes").innerHTML = htmlRefeicoes;

        // 🌟 ATUALIZAR O TEXTO DAS ORIENTAÇÕES AQUI NO ELEMENTO DO HTML 🌟
        const elementoOrientacoesPdf = document.getElementById("pdf-texto-orientacoes");

console.log("ELEMENTO PDF:", elementoOrientacoesPdf);   
console.log("TEXTO PDF:", textoOrientacoes);

if (elementoOrientacoesPdf) {
    elementoOrientacoesPdf.innerText = textoOrientacoes;
    console.log("ORIENTAÇÃO INSERIDA NO HTML:", elementoOrientacoesPdf.innerText);
} else {
    console.error("ERRO: pdf-texto-orientacoes NÃO FOI ENCONTRADO!");
}

        // Tornar o template visível temporariamente para a captura
        elementoPdf.classList.remove("hidden");
        elementoPdf.style.display = "block";
        // Dá um pequeno tempo para o navegador renderizar o conteúdo
        await new Promise(resolve => requestAnimationFrame(resolve));
        const opcoes = {
        margin: 10,
        filename: `plano-alimentar-ACNUT-${paciente ? paciente.nome.toLowerCase().replace(/\s+/g, '-') : 'paciente'}.pdf`,
        image: {
        type: 'jpeg',
        quality: 0.98
        },
        html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false
        },
        jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
        }
        };
        await html2pdf()
        .from(elementoPdf)
        .set(opcoes)
        .save();

        // Esconder novamente
        elementoPdf.classList.add("hidden");
        elementoPdf.style.display = "none";

        } catch (err) {
        console.error("Erro detalhado ao gerar PDF:", err);
        alert("Ocorreu um erro técnico ao gerar o PDF. Verifique a consola (F12).");
        if (elementoPdf) elementoPdf.style.display = "none";
        }   
        }
// 18. GRÁFICO DE EVOLUÇÃO DE PESO
        let meuGraficoEvolucao = null; // Variável global para controlar a instância do gráfico
        async function carregarGraficoEvolucao(pacienteId) {
        try {
        // Exemplo: Buscar histórico de check-ins ou avaliações do paciente
        const res = await fetch(`${API_URL}/checkins/${pacienteId}`); // Ajusta a rota conforme o teu backend
        if (!res.ok) {
        console.warn("Não foi possível carregar os dados para o gráfico.");
        return;
        }
    
        const historico = await res.json();

        // Se não houver dados suficientes
        if (!historico || historico.length === 0) return;

        // Extrair datas e pesos para as diretrizes do gráfico
        const datas = historico.map(item => item.data || 'Data');
        const pesos = historico.map(item => item.pesoAtualKg || item.peso);
        const ctx = document.getElementById('graficoEvolucao');
        if (!ctx) return;
        // Se já existir um gráfico criado anteriormente, destroi-o para evitar sobreposição
        if (meuGraficoEvolucao) {
        meuGraficoEvolucao.destroy();
        }
        // Criar o gráfico com Chart.js
        meuGraficoEvolucao = new Chart(ctx, {
        type: 'line',
        data: {
        labels: datas,
        datasets: [{
        label: 'Peso (kg)',
        data: pesos,
        borderColor: '#10b981', // Cor verde esmeralda a combinar com o teu design
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 2,
        tension: 0.3,
        fill: true,
        pointBackgroundColor: '#10b981'
        }]
        },
        options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
        legend: {
        labels: { color: '#94a3b8' } // Texto cinzento claro (slate-400)
        }
        },
        scales: {
        x: {
        ticks: { color: '#94a3b8' },
        grid: { color: 'rgba(51, 65, 85, 0.4)' }
        },
        y: {
        ticks: { color: '#94a3b8' },
        grid: { color: 'rgba(51, 65, 85, 0.4)' }
        }
        }
        }
        });

        } catch (err) {
        console.error("Erro ao gerar gráfico de evolução:", err);
        }
        }
// 19. ADICIONAR ITEM COM DIGITAÇÃO MANUAL AUTOMÁTICA
        async function adicionarItemAutomatico(e) {
        if (e) e.preventDefault();

        const pacienteId = parseInt(document.getElementById("prontuario-paciente-id").value) || window.pacienteIdAtivo;
        if (!pacienteId) {
        alert("Por favor, selecione ou informe o ID do paciente no prontuário.");
        return;
        }

        const body = {
        pacienteId: pacienteId,
        metaCalorica: 2000,
        nomeRefeicao: document.getElementById("item-refeicao")?.value || "Café",
        horario: document.getElementById("item-horario")?.value || "08:00",
        alimentoNome: document.getElementById("item-alimento-livre")?.value || document.getElementById("item-alimento")?.value || "Alimento",
        quantidadeG: parseFloat(document.getElementById("item-qtd")?.value) || 0,
        medidaCaseira: document.getElementById("item-medida")?.value || "",
        kcal: parseFloat(document.getElementById("item-kcal")?.value) || 0,
        proteinas: parseFloat(document.getElementById("item-prot")?.value) || 0,
        carbos: parseFloat(document.getElementById("item-carbo")?.value) || 0,
        gorduras: parseFloat(document.getElementById("item-gordura")?.value) || 0, 
        eSubstituicao: false
        };

        try {
        const res = await fetch(`${API_URL}/planos/item`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
        });

        if (res.ok) {
        alert("Alimento adicionado com sucesso!");
        const form = document.getElementById("form-adicionar-item");
        if (form) form.reset();
        carregarPlanoAlimentarProntuario(pacienteId);
        } else {
        // Mostra o erro exato enviado pelo C# no ecrã para sabermos se falta mais alguma coisa
        const erroDetalhe = await res.text();
        console.error("Erro retornado pela API C#:", erroDetalhe);
        alert("Erro do Servidor: " + erroDetalhe);
        }
        } catch (err) {
        console.error("Erro ao enviar item automático:", err);
        alert("Erro de conexão com o servidor: " + err.message); 
        }
        }
        
// 20. Função para carregar as orientações quando abre a aba
       async function carregarOrientacoes(pacienteId) {
        try {
        const res = await fetch(`${API_URL}/orientacoes/${pacienteId}`);
        if (res.ok) {
        const data = await res.json();
        // Coloca o texto guardado dentro da textarea do HTML
        const textarea = document.getElementById("input-orientacoes"); // Substitui pelo ID correto da tua textarea
        if (textarea) {
        textarea.value = data.texto || "";
        }
        }
        } catch (err) {
        console.error("Erro ao carregar orientações:", err);
        }
        }

// 21. Função ligada ao botão "Salvar Orientações"
        async function salvarOrientacoes(pacienteId) {
        const textarea = document.getElementById("input-orientacoes");
        if (!textarea) return;

        const texto = textarea.value;

        try {
        const res = await fetch(`${API_URL}/orientacoes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pacienteId: parseInt(pacienteId), texto: texto })
        });

        if (res.ok) {
        alert("Orientações salvas com sucesso!");
        } else {
        alert("Erro ao salvar as orientações.");
        }
        } catch (err) {
        console.error("Erro de conexão:", err);
        alert("Erro de conexão com o servidor.");
        }
        }    
// 22. FUNÇÃO PARA EXCLUIR PACIENTE        
        async function excluirPaciente(id) {
        if (!confirm("Tens a certeza de que pretendes excluir este paciente?")) {
        return;
        }

        try {
        // Usa a variável API_URL para garantir que vai para a porta correta (5001)
        const response = await fetch(`${API_URL}/pacientes/${id}`, {
        method: 'DELETE'
        });

        if (response.ok) {
        alert("Paciente excluído com sucesso!");
        carregarPacientes();
        } else {
        alert("Erro ao tentar excluir o paciente.");
        }
        } catch (err) {
        console.error("Erro de conexão:", err);
        alert("Erro de conexão com o servidor ao tentar excluir.");
        }
        }
// 23. FUNÇÃO PARA CARREGAR PACIENTE PARA EDIÇÃO (VERSÃO COMPLETA COM CANCELAR)
        function editarPaciente(id, nome, email, telefone, dataNascimento, sexo) {
    pacienteEmEdicaoId = id;

    // Preenche os inputs
    document.getElementById('p-nome').value = nome;
    document.getElementById('p-email').value = email;
    document.getElementById('p-telefone').value = telefone;
    document.getElementById('p-data').value = dataNascimento;
    document.getElementById('p-sexo').value = sexo;

    // Muda o botão para "Atualizar" e mostra o botão "Cancelar"
    const btnSubmit = document.querySelector('#form-paciente button[type="submit"]');
    if (btnSubmit) {
    btnSubmit.textContent = "Atualizar Paciente";
    btnSubmit.classList.remove('bg-emerald-600', 'hover:bg-emerald-700');
    btnSubmit.classList.add('bg-amber-600', 'hover:bg-amber-700');
    }

    const btnCancelar = document.getElementById('btn-cancelar');
    if (btnCancelar) {
    btnCancelar.classList.remove('hidden'); // Mostra o botão de cancelar
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
        }

// 24. FUNÇÃO PARA CANCELAR EDIÇÃO
        function cancelarEdicao() {
    pacienteEmEdicaoId = null;
    document.getElementById('form-paciente').reset();

    // Restaura o botão original e oculta o cancelar
    const btnSubmit = document.querySelector('#form-paciente button[type="submit"]');
    if (btnSubmit) {
        btnSubmit.textContent = "Cadastrar Paciente";
        btnSubmit.classList.remove('bg-amber-600', 'hover:bg-amber-700');
        btnSubmit.classList.add('bg-emerald-600', 'hover:bg-emerald-700');
    }

    const btnCancelar = document.getElementById('btn-cancelar');
    if (btnCancelar) {
        btnCancelar.classList.add('hidden'); // Esconde o botão de cancelar
    }
        }
// 25. FUNÇÃO PARA LIMPAR O FORMULÁRIO DE CADASTRO DE PACIENTE    
        function alternarSenha() {

    const senha = document.getElementById("login-senha");
    const icone = document.getElementById("icone-senha");

    if (senha.type === "password") {

    senha.type = "text";

    icone.classList.remove("fa-eye");
    icone.classList.add("fa-eye-slash");

    } else {

    senha.type = "password";

    icone.classList.remove("fa-eye-slash");
    icone.classList.add("fa-eye");
    }
        }

// 26. MENU MOBILE ACNUT
        //26.1
        function abrirMenuMobile() {

        const sidebar = document.getElementById("sidebar-acnut");
        const overlay = document.getElementById("acnut-menu-overlay");

        if (!sidebar || !overlay) return;

        sidebar.classList.remove("-translate-x-full");
        sidebar.classList.add("translate-x-0");

        overlay.classList.remove("hidden");

        document.body.style.overflow = "hidden";
}
        //26.2
        function fecharMenuMobile() {
        const sidebar = document.getElementById("sidebar-acnut");
        const overlay = document.getElementById("acnut-menu-overlay");

        if (!sidebar || !overlay) return;

        sidebar.classList.remove("translate-x-0");
        sidebar.classList.add("-translate-x-full");

        overlay.classList.add("hidden");

        document.body.style.overflow = "";
}
        // Exemplo de como deves montar a linha no teu JS:
////////////////////////////////////////########## INICIALIZAÇÃO ##########////////////////////////////////////////
// INICIALIZAÇÃO CORRETA
document.addEventListener("DOMContentLoaded", () => {
  carregarPacientes();
  carregarAlimentos();
});