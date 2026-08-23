'use client'; 

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

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
  // NOVO ESTADO: Armazena o link do WhatsApp após o envio para exibir a tela de sucesso
  const [linkWhatsappPronto, setLinkWhatsappPronto] = useState<string | null>(null);

  const inputCameraRef = useRef<HTMLInputElement>(null);
  const inputFileRef = useRef<HTMLInputElement>(null);

  const obterHoraAtual = () => {
    const agora = new Date();
    const horas = String(agora.getHours()).padStart(2, '0');
    const minutos = String(agora.getMinutes()).padStart(2, '0');
    return `${horas}:${minutos}`;
  };

  useEffect(() => {
    setFormData((prev) => ({ ...prev, horarioObservado: obterHoraAtual() }));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBlurHora = (e: React.FocusEvent<HTMLInputElement>) => {
    let valor = e.target.value.trim();
    if (!valor) return;

    if (/^\d{1,2}$/.test(valor)) {
      valor = `${valor.padStart(2, '0')}:00`;
    } 
    else if (/^\d{3,4}$/.test(valor)) {
      valor = valor.padStart(4, '0');
      valor = `${valor.slice(0, 2)}:${valor.slice(2, 4)}`;
    }

    setFormData((prev) => ({ ...prev, horarioObservado: valor }));
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        foto: file,
        fotoPreview: URL.createObjectURL(file),
      }));
    }
  };

  const converterParaBase64 = (arquivo: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(arquivo);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (erro) => reject(erro);
    });
  };

  const handleEnviar = async () => {
    if (!formData.tecnico || !formData.local || !formData.tipoPonto || !formData.foto || !formData.horarioObservado) {
      alert("Por favor, preencha todos os campos");
      return;
    }

    setEnviando(true);

    try {
      const fotoBase64 = await converterParaBase64(formData.foto);

      const dadosEnvio = {
        tecnico: formData.tecnico,
        local: formData.local,
        horarioObservado: formData.horarioObservado,
        tipoPonto: formData.tipoPonto,
        fotoBase64: fotoBase64,
      };

      const URL_APPS_SCRIPT = "https://script.google.com/macros/s/AKfycbwJt1wWDqr6CCknFK7YzPH01vwN8hzsynqZHIWqUBKDALcFI-C6exWC_01RkuCQjCZ8/exec"; 
      
      fetch(URL_APPS_SCRIPT, {
        method: 'POST',
        body: JSON.stringify(dadosEnvio),
      }).catch(err => console.error("Erro na planilha:", err));

      const frasesAcao: Record<string, string> = {
        'Chegada': 'começou o expediente',
        'Pausa': 'fez pausa para almoço',
        'Retorno': 'retornou do almoço',
        'Fim': 'finalizou o expediente'
      };

      const acaoTexto = frasesAcao[formData.tipoPonto];
      const linkGestao = "sistema-ponto-weld.vercel.app/painel";
      const mensagem = `o ${formData.tecnico.toLowerCase()} ${acaoTexto}: ${linkGestao}`;

      // Monta o link Universal oficial do WhatsApp
      const linkWhatsApp = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;

      // Salva o link no estado para acionar a tela de Sucesso
      setLinkWhatsappPronto(linkWhatsApp);

      // Limpa os dados do formulário silenciosamente no fundo
      setFormData({
        tecnico: '',
        local: '',
        horarioObservado: obterHoraAtual(),
        tipoPonto: '',
        foto: null,
        fotoPreview: null,
      });

    } catch (erro) {
      console.error("Erro ao enviar:", erro);
      alert("Ocorreu um erro ao gerar o registro.");
    } finally {
      setEnviando(false);
    }
  };

  // SE O LINK ESTIVER PRONTO, MOSTRA A TELA DE SUCESSO
  if (linkWhatsappPronto) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg text-center space-y-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-800">Ponto Salvo!</h2>
          <p className="text-gray-600">
            Seu registro foi enviado para a planilha com sucesso.
          </p>
          
          {/* BOTÃO DO WHATSAPP (Como é um link real, o iOS nunca bloqueia) */}
          <a 
            href={linkWhatsappPronto}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#20b958] text-white p-4 rounded-xl font-bold text-lg shadow-md transition-all active:scale-95"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.031 0C5.385 0 0 5.385 0 12.031c0 2.127.554 4.195 1.604 6.009L.452 22.408l4.492-1.178c1.745.952 3.738 1.453 5.787 1.453 6.645 0 12.031-5.385 12.031-12.031S18.677 0 12.031 0zm0 21.654c-1.802 0-3.568-.484-5.116-1.401l-.367-.217-3.337.876.888-3.256-.238-.378a10.057 10.057 0 01-1.531-5.347c0-5.541 4.512-10.052 10.053-10.052 5.542 0 10.053 4.511 10.053 10.052s-4.511 10.052-10.053 10.052zm5.512-7.535c-.302-.151-1.792-.885-2.068-.987-.277-.101-.478-.151-.68.151-.201.302-.781.987-.957 1.189-.176.201-.353.226-.655.075-2.074-1.036-3.411-2.023-4.698-3.921-.126-.192-.014-.287.132-.435.132-.132.302-.353.453-.529.151-.176.201-.302.302-.504.101-.201.05-.378-.025-.529-.075-.151-.68-1.637-.932-2.242-.244-.585-.494-.504-.68-.514-.176-.01-.378-.01-.58-.01-.201 0-.529.075-.806.378-.277.302-1.058 1.033-1.058 2.519 0 1.486 1.083 2.923 1.234 3.125.151.201 2.128 3.246 5.152 4.548 2.019.869 2.793.937 3.82.781 1.116-.168 2.766-1.129 3.155-2.222.389-1.093.389-2.03.277-2.222-.112-.192-.414-.293-.716-.444z"/>
            </svg>
            Avisar no WhatsApp
          </a>

          <button 
            onClick={() => setLinkWhatsappPronto(null)}
            className="mt-6 text-gray-500 font-medium underline hover:text-gray-700 transition-colors"
          >
            Voltar para novo registro
          </button>
        </div>
      </div>
    );
  }

  // TELA PADRÃO (O FORMULÁRIO)
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

        {/* 6. ACESSO AO PAINEL */}
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