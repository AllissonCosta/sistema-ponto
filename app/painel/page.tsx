"use client";

import { UserButton } from "@clerk/nextjs";
import Image from "next/image";

import { useEffect, useState } from "react";

// Definição do formato dos dados que vêm do Google Sheets
interface Registro {
  data: string;
  horaSistema: string;
  horarioObservado: string;
  tecnico: string;
  tipoPonto: string;
  local: string;
  fotoUrl: string;
}

export default function Painel() {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);

  const [filtroTecnico, setFiltroTecnico] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  // COLOQUE SUA URL DO GOOGLE APPS SCRIPT AQUI
  const URL_APPS_SCRIPT = "https://script.google.com/macros/s/AKfycbwJt1wWDqr6CCknFK7YzPH01vwN8hzsynqZHIWqUBKDALcFI-C6exWC_01RkuCQjCZ8/exec";

  const buscarDados = async () => {
    setLoading(true);
    try {
      const response = await fetch(URL_APPS_SCRIPT);
      const data = await response.json();
      setRegistros(data.reverse()); // Inverte para mostrar os mais recentes primeiro
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      alert("Erro ao carregar os dados. Verifique o console.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const inicializar = async () => {
      await buscarDados();
    };
    inicializar();
  }, []);
// Extrai o ID do Google Drive e converte para link de miniatura
  const obterUrlMiniatura = (url: string) => {
    if (!url) return "";
    // Tenta encontrar o ID no formato /d/ID/ ou ?id=ID
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      const id = match[1];
      // Retorna o link direto da imagem gerado pelo Drive
      return `https://drive.google.com/thumbnail?id=${id}&sz=w150-h150`;
    }
    return url; 
  };

  // --- FUNÇÃO PARA EXPORTAR PARA PLANILHA (CSV) ---
  const exportarParaCSV = () => {
    if (registrosFiltrados.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }

    // 1. Cria os cabeçalhos da planilha
    const cabecalhos = ["Data", "Horas", "Técnico", "Local"];

    // 2. Mapeia os dados da tabela
    const linhas = registrosFiltrados.map(reg => [
      formatarData(reg.data),
      formatarHoraTecnico(reg.horarioObservado),
      reg.tecnico,
    ]);

    // 3. Junta tudo separando por vírgula e quebra de linha
    const conteudoCSV = [
      cabecalhos.join(","),
      ...linhas.map(linha => linha.join(","))
    ].join("\n");

    // 4. Cria o arquivo e força o download (O \uFEFF garante que acentos funcionem no Excel)
    const blob = new Blob(["\uFEFF" + conteudoCSV], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_ponto_${new Date().getTime()}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  // --- FUNÇÕES DE FORMATAÇÃO ---

  // Converte "2026-08-17T..." para "17-08-2026"
  const formatarData = (isoStr: string) => {
    if (!isoStr) return "---";
    if (isoStr.includes("T")) {
      const parteData = isoStr.split("T")[0]; // Pega só a parte antes do "T"
      const [ano, mes, dia] = parteData.split("-");
      return `${dia}-${mes}-${ano}`;
    }
    // Caso a data já venha limpa da planilha, substitui barras por traços
    return isoStr.replace(/\//g, "-");
  };

  // Converte "1899-12-31T00:13:28.000Z" para "22:35" (HH:mm)
  const formatarHoraTecnico = (isoStr: string) => {
    if (!isoStr) return "---";
    if (isoStr.includes("T")) {
      const d = new Date(isoStr);
      const h = String(d.getHours()).padStart(2, "0");
      const m = String(d.getMinutes()).padStart(2, "0");
      return `${h}:${m}`;
    }
    // Fallback caso seja um texto limpo
    const match = isoStr.match(/^(\d{2}:\d{2})/);
    return match ? match[1] : isoStr;
  };

  // Converte "1899-12-31T01:37:09.000Z" para "22:35:20" (HH:mm:ss)
  const formatarHoraSistema = (isoStr: string) => {
    if (!isoStr) return "---";
    if (isoStr.includes("T")) {
      const d = new Date(isoStr);
      const h = String(d.getHours()).padStart(2, "0");
      const m = String(d.getMinutes()).padStart(2, "0");
      const s = String(d.getSeconds()).padStart(2, "0");
      return `${h}:${m}:${s}`;
    }
    return isoStr;
  };

  // Cores dinâmicas para o status
  const getBadgeStyle = (tipo: string) => {
    if (!tipo) return "bg-gray-100 text-gray-800 border-gray-200";
    const t = tipo.toLowerCase();
    if (t.includes("chegada") || t.includes("entrada")) return "bg-green-100 text-green-800 border-green-200";
    if (t.includes("fim") || t.includes("saída") || t.includes("saida")) return "bg-red-100 text-red-800 border-red-200";
    if (t.includes("pausa") || t.includes("almoço") || t.includes("almoco")) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-blue-100 text-blue-800 border-blue-200";
  };

  // Lógica de Filtragem
  // Função auxiliar para padronizar a data para YYYY-MM-DD na hora de comparar
  const obterDataParaFiltro = (dataStr: string) => {
    if (!dataStr) return "";
    if (dataStr.includes("T")) return dataStr.split("T")[0]; 
    const partes = dataStr.split(/[\/\-]/); // Lida com 17/08/2026 ou 17-08-2026
    if (partes.length === 3 && partes[2].length === 4) {
      return `${partes[2]}-${partes[1]}-${partes[0]}`;
    }
    return dataStr;
  };

  // Lógica de Filtragem Atualizada
  const periodoInvalido = Boolean(dataInicio && dataFim && dataInicio > dataFim);

  const registrosFiltrados = registros.filter((reg) => {
    // 1. Filtra por técnico
    const matchTecnico = reg.tecnico?.toLowerCase().includes(filtroTecnico.toLowerCase());

    // 2. Filtra por período
    let matchData = true;
    const dataRegistro = obterDataParaFiltro(reg.data);

    if (dataInicio && dataRegistro < dataInicio) {
      matchData = false; // Se for mais antigo que a data inicial, oculta
    }
    if (dataFim && dataRegistro > dataFim) {
      matchData = false; // Se for mais novo que a data final, oculta
    }

    return matchTecnico && matchData;
  });
  

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10 font-sans text-gray-800">
      <div className="max-w-7xl mx-auto">
        
        {/* Cabeçalho */}
<div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
  <div>
    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Painel de Registros</h1>
    <p className="text-gray-500 mt-1">Acompanhamento de ponto da equipe técnica externa.</p>
  </div>
  
  <div className="flex items-center gap-3">

    {/* NOVO BOTÃO DE EXPORTAR */}
    <button 
      onClick={exportarParaCSV}
      disabled={registrosFiltrados.length === 0 || periodoInvalido}
      className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      title="Baixar planilha Excel/CSV"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      <span className="hidden sm:inline">Exportar</span>
    </button>

    <button 
      onClick={buscarDados}
      disabled={loading}
      className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
    >
      {loading ? "Atualizando..." : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="hidden sm:inline">Atualizar</span>
        </>
      )}
    </button>

    <UserButton afterSignOutUrl="/" />
  </div>
</div>

        {/* Barra de Filtros */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Buscar por Técnico
            </label>
            <input
              type="text"
              placeholder="Ex: Alisson..."
              value={filtroTecnico}
              onChange={(e) => setFiltroTecnico(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-700"
            />
          </div>
          
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Data Inicial
            </label>
            <input
              type="date"
              value={dataInicio}
              max={dataFim} // O calendário bloqueia datas maiores que a final
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-700"
            />
          </div>

          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Data Final
            </label>
            <input
              type="date"
              value={dataFim}
              min={dataInicio} // O calendário bloqueia datas menores que a inicial
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-700"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => { setFiltroTecnico(""); setDataInicio(""); setDataFim(""); }}
              className="p-2.5 px-4 bg-gray-100 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg font-medium transition-all"
            >
              Limpar Filtros
            </button>
          </div>
        </div>

        {/* Container da Tabela */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-semibold text-xs tracking-wider">
                <tr>
                  <th className="px-6 py-4">Técnico</th>
                  <th className="px-6 py-4">Ação</th>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Hora (Técnico)</th>
                  <th className="px-6 py-4">Hora (Sistema)</th>
                  <th className="px-6 py-4">Local</th>
                  <th className="px-6 py-4 text-center">Comprovante</th>
                </tr>
              </thead>
              
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse bg-white">
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                      <td className="px-6 py-4"><div className="h-5 bg-gray-200 rounded-full w-20"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-12"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                      <td className="px-6 py-4 flex justify-center"><div className="h-10 w-10 bg-gray-200 rounded-lg"></div></td>
                    </tr>
                  ))
                ) : periodoInvalido ? (
                  // NOVO: Mensagem de erro de período
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-red-600 font-medium bg-red-50/50">
                      ⚠️ A Data Inicial não pode ser maior que a Data Final. Ajuste o período para visualizar os registros.
                    </td>
                  </tr>
                ) : registrosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 font-medium">
                      Nenhum registro encontrado com estes filtros.
                    </td>
                  </tr>
                ) : (
                  registrosFiltrados.map((registro, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {registro.tecnico}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full border ${getBadgeStyle(registro.tipoPonto)}`}>
                          {registro.tipoPonto}
                        </span>
                      </td>

                      {/* --- APLICAÇÃO DAS FUNÇÕES DE FORMATAÇÃO --- */}
                      <td className="px-6 py-4 text-gray-700 font-bold">
                        {formatarData(registro.data)}
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900">
                        {formatarHoraTecnico(registro.horarioObservado)}
                      </td>
                      <td className="px-6 py-4 text-gray-500 font-medium">
                        {formatarHoraSistema(registro.horaSistema)}
                      </td>
                      
                      <td className="px-6 py-4 text-gray-600 max-w-xs truncate" title={registro.local}>
                        {registro.local}
                      </td>
                     <td className="px-6 py-4 flex justify-center">
  {registro.fotoUrl ? (
    <a 
      href={registro.fotoUrl} 
      target="_blank" 
      rel="noopener noreferrer"
      className="block h-10 w-10 rounded-lg border border-gray-200 overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all shadow-sm"
      title="Ver foto do comprovante"
    >
      {/* Usando a função obterUrlMiniatura aqui no src */}
      <img 
        src={obterUrlMiniatura(registro.fotoUrl)} 
        alt={`Foto de ${registro.tecnico}`} 
        className="h-full w-full object-cover"
      />
    </a>
  ) : (
    <span className="text-gray-400 text-xs">Sem foto</span>
  )}
</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}