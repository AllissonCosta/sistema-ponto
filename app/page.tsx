'use client'; // Necessário se estiver usando Next.js App Router

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link'; // <-- Importação do Link adicionada

// Tipagem dos dados
interface PontoData {
  tecnico: string;
  local: string;
  horarioObservado: string;
  tipoPonto: 'Chegada' | 'Pausa' | 'Retorno' | 'Fim' | '';
  foto: File | null;
  fotoPreview: string | null;
}

const tecnicosDisponiveis = ['Alisson', 'João Silva', 'Carlos Santos', 'Ana Oliveira'];

export default function RegistroPonto() {
  const [formData, setFormData] = useState<PontoData>({
    tecnico: '',
    local: '',
    horarioObservado: '',
    tipoPonto: '',
    foto: null,
    fotoPreview: null,
  });

  const [enviando, setEnviando] = useState(false);

  // Referências para os inputs de arquivo ocultos
  const inputCameraRef = useRef<HTMLInputElement>(null);
  const inputFileRef = useRef<HTMLInputElement>(null);

  // Função auxiliar para pegar a hora atual no formato "HH:mm"
  const obterHoraAtual = () => {
    const agora = new Date();
    const horas = String(agora.getHours()).padStart(2, '0');
    const minutos = String(agora.getMinutes()).padStart(2, '0');
    return `${horas}:${minutos}`;
  };

  // Preenche o horário do sistema assim que o componente é montado
  useEffect(() => {
    setFormData((prev) => ({ ...prev, horarioObservado: obterHoraAtual() }));
  }, []);

  // Atualiza campos de texto e seleção
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Função inteligente para formatar a hora ao perder o foco (caso o navegador permita ajuste manual)
  const handleBlurHora = (e: React.FocusEvent<HTMLInputElement>) => {
    let valor = e.target.value.trim();
    if (!valor) return;

    // Se o usuário digitou apenas números (ex: "8" ou "08"), converte para "08:00"
    if (/^\d{1,2}$/.test(valor)) {
      valor = `${valor.padStart(2, '0')}:00`;
    } 
    // Se digitou sem dois pontos (ex: "0830"), converte para "08:30"
    else if (/^\d{3,4}$/.test(valor)) {
      valor = valor.padStart(4, '0');
      valor = `${valor.slice(0, 2)}:${valor.slice(2, 4)}`;
    }

    setFormData((prev) => ({ ...prev, horarioObservado: valor }));
  };

  // Lida com a escolha/captura da foto
  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        foto: file,
        fotoPreview: URL.createObjectURL(file), // Cria a visualização da foto na tela
      }));
    }
  };

  // Converte a imagem para Base64 para poder enviar para o Google Sheets
  const converterParaBase64 = (arquivo: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(arquivo);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (erro) => reject(erro);
    });
  };

  // Função principal ao clicar em ENVIAR
  const handleEnviar = async () => {
    // 1. Validação
    if (!formData.tecnico || !formData.local || !formData.tipoPonto || !formData.foto || !formData.horarioObservado) {
      alert("Por favor, preencha todos os campos");
      return;
    }

    setEnviando(true);

    try {
      // 2. Converte a foto
      const fotoBase64 = await converterParaBase64(formData.foto);

      // 3. Monta os dados para o Google Sheets
      const dadosEnvio = {
        tecnico: formData.tecnico,
        local: formData.local,
        horarioObservado: formData.horarioObservado,
        tipoPonto: formData.tipoPonto,
        fotoBase64: fotoBase64,
      };

      // 4. Envia para o Google Sheets
      const URL_APPS_SCRIPT = "https://script.google.com/macros/s/AKfycbwJt1wWDqr6CCknFK7YzPH01vwN8hzsynqZHIWqUBKDALcFI-C6exWC_01RkuCQjCZ8/exec"; 
      
      // Enviamos em background
      fetch(URL_APPS_SCRIPT, {
        method: 'POST',
        body: JSON.stringify(dadosEnvio),
      }).catch(err => console.error("Erro na planilha:", err));

      // 5. Monta a mensagem do WhatsApp
      const frasesAcao: Record<string, string> = {
        'Chegada': 'começou o expediente',
        'Pausa': 'fez pausa para almoço',
        'Retorno': 'retornou do almoço',
        'Fim': 'finalizou o expediente'
      };

      const acaoTexto = frasesAcao[formData.tipoPonto];
      // Atualize este link com o seu domínio real na Vercel quando necessário
      const linkGestao = "sistema-ponto-weld.vercel.app/painel";
      const mensagem = `o ${formData.tecnico.toLowerCase()} ${acaoTexto}: ${linkGestao}`;

      const linkWhatsApp = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;

      // Abre o WhatsApp
      window.open(linkWhatsApp, '_blank');

      // 6. Limpa o formulário após o envio e restaura a hora atual do sistema
      setFormData({
        tecnico: '',
        local: '',
        horarioObservado: obterHoraAtual(),
        tipoPonto: '',
        foto: null,
        fotoPreview: null,
      });
      alert("Ponto registrado com sucesso!");

    } catch (erro) {
      console.error("Erro ao enviar:", erro);
      alert("Ocorreu um erro ao gerar o registro.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-20 font-sans">
      <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow-lg space-y-6">
        
        <h1 className="text-2xl font-bold text-center text-gray-800">
          Registro de Ponto
        </h1>

        {/* 1. SELEÇÃO DO TÉCNICO */}
        <div className="flex flex-col">
          <label className="font-semibold text-gray-700 mb-1">Técnico:</label>
          <select 
            name="tecnico" 
            value={formData.tecnico} 
            onChange={handleChange}
            className="p-3 border rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione seu nome...</option>
            {tecnicosDisponiveis.map((nome) => (
              <option key={nome} value={nome}>{nome}</option>
            ))}
          </select>
        </div>

        {/* 2. LOCAL E HORÁRIO */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            <label className="font-semibold text-gray-700 mb-1">Local:</label>
            <input 
              type="text" 
              name="local" 
              placeholder="Ex: Obra Centro..."
              value={formData.local} 
              onChange={handleChange}
              className="p-3 border rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col">
            <label className="font-semibold text-gray-700 mb-1">Hora Observada:</label>
            <input 
              type="time" 
              name="horarioObservado" 
              required
              value={formData.horarioObservado} 
              onChange={handleChange}
              onBlur={handleBlurHora}
              className="p-3 border rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 3. CAPTURA DE FOTO */}
        <div className="flex flex-col space-y-3 border-t pt-4">
          <label className="font-semibold text-gray-700">Comprovação (Foto):</label>
          
          <input type="file" accept="image/*" capture="environment" ref={inputCameraRef} onChange={handleFotoChange} className="hidden" />
          <input type="file" accept="image/*" ref={inputFileRef} onChange={handleFotoChange} className="hidden" />

          <div className="flex gap-2">
            <button 
              type="button" 
              onClick={() => inputCameraRef.current?.click()}
              className="flex-1 bg-blue-600 text-white font-medium p-3 rounded-lg shadow-sm active:bg-blue-700 transition-colors"
            >
              📷 Tirar Foto
            </button>
            <button 
              type="button" 
              onClick={() => inputFileRef.current?.click()}
              className="flex-1 bg-gray-200 text-gray-800 font-medium p-3 rounded-lg shadow-sm active:bg-gray-300 transition-colors"
            >
              📂 Selecionar
            </button>
          </div>

          {formData.fotoPreview && (
            <div className="mt-2 relative">
              <img src={formData.fotoPreview} alt="Preview" className="w-full h-48 object-cover rounded-lg border" />
              <button 
                onClick={() => setFormData(prev => ({ ...prev, foto: null, fotoPreview: null }))}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 w-8 h-8 flex items-center justify-center font-bold shadow-md hover:bg-red-600"
              >
                X
              </button>
            </div>
          )}
        </div>

        {/* 4. TIPO DE PONTO */}
        <div className="flex flex-col space-y-2 border-t pt-4">
          <label className="font-semibold text-gray-700">Ação do Ponto:</label>
          <div className="grid grid-cols-2 gap-2">
            {['Chegada', 'Pausa', 'Retorno', 'Fim'].map((tipo) => (
              <label 
                key={tipo} 
                className={`flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer font-medium transition-colors ${
                  formData.tipoPonto === tipo 
                    ? 'border-blue-600 bg-blue-50 text-blue-700' 
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <input 
                  type="radio" 
                  name="tipoPonto" 
                  value={tipo} 
                  checked={formData.tipoPonto === tipo}
                  onChange={handleChange}
                  className="hidden"
                />
                {tipo}
              </label>
            ))}
          </div>
        </div>

        {/* 5. BOTÃO ENVIAR */}
        <button 
          onClick={handleEnviar} 
          disabled={enviando}
          className={`w-full mt-6 p-4 rounded-xl font-bold text-lg text-white shadow-md transition-all ${
            enviando ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 active:scale-95'
          }`}
        >
          {enviando ? 'Enviando...' : 'Registrar Ponto'}
        </button>

        {/* 6. ACESSO AO PAINEL (NOVO BOTÃO ADICIONADO AQUI) */}
        <div className="pt-4 border-t border-gray-100 text-center mt-6">
          <Link 
            href="/painel"
            className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Acesso Restrito: Painel de Gestão
          </Link>
        </div>

      </div>
      
    </div>
  );
}