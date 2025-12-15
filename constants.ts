import { Subject } from './types';

export const TOTAL_PHASES = 10;
export const MAX_WEEKLY_HOURS = 30; // From PDF
export const WEEKS_PER_SEMESTER = 18; // Standard for UFSC to convert H/A to Weekly
export const REQUIRED_ELECTIVE_HOURS = 432; // Total required elective hours
export const MAX_COMPLEMENTARY_HOURS = 54; // Max hours for complementary activities

// Helper to create simple AND requirement
const req = (...codes: string[]) => [codes];
// Helper for OR logic (not used explicitly in list but kept for ref)
const reqOr = (groupA: string[], groupB: string[]) => [groupA, groupB];

export const CURRICULUM: Subject[] = [
  // --- FASE 01 ---
  { code: 'ECV2101', name: 'Introdução à Engenharia Civil', phase: 1, hours: 54, prerequisites: [] },
  { code: 'EGR5213', name: 'Representação Gráfica Espacial', phase: 1, hours: 54, prerequisites: [] },
  { code: 'EGR5604', name: 'Desenho Técnico I', phase: 1, hours: 54, prerequisites: [] },
  { code: 'FSC5101', name: 'Física I', phase: 1, hours: 72, prerequisites: [] },
  { code: 'MTM3110', name: 'Cálculo 1', phase: 1, hours: 72, prerequisites: [] },
  { code: 'QMC5125', name: 'Química Geral Experimental A', phase: 1, hours: 36, prerequisites: [] },
  { code: 'QMC5138', name: 'Química Geral', phase: 1, hours: 36, prerequisites: [] },

  // --- FASE 02 ---
  { code: 'ECV2201', name: 'Introdução à Mecânica das Estruturas', phase: 2, hours: 36, prerequisites: [] },
  { code: 'ECV2202', name: 'Topografia I', phase: 2, hours: 54, prerequisites: req('EGR5213', 'EGR5604') },
  { code: 'ECV2203', name: 'Desenho Técnico para Engenharia Civil', phase: 2, hours: 54, prerequisites: req('EGR5213') },
  { code: 'FSC5002', name: 'Física II', phase: 2, hours: 72, prerequisites: req('FSC5101') },
  { code: 'FSC5122', name: 'Física Experimental I', phase: 2, hours: 54, prerequisites: req('FSC5101') },
  { code: 'INE5201', name: 'Introdução à Ciência da Computação', phase: 2, hours: 54, prerequisites: [] },
  { code: 'MTM3120', name: 'Cálculo 2', phase: 2, hours: 72, prerequisites: req('MTM3110') },
  { code: 'MTM3121', name: 'Álgebra Linear', phase: 2, hours: 72, prerequisites: [] },

  // --- FASE 03 ---
  { code: 'ARQ5115', name: 'Arquitetura I', phase: 3, hours: 72, prerequisites: req('ECV2203') },
  { code: 'ECV2301', name: 'Ciência e Eng. de Materiais para a Eng. Civil', phase: 3, hours: 54, prerequisites: req('QMC5125', 'QMC5138') },
  { code: 'ECV2302', name: 'Estática para Engenharia Civil', phase: 3, hours: 72, prerequisites: req('ECV2201', 'FSC5101', 'MTM3120') },
  { code: 'ECV2303', name: 'Geologia de Engenharia', phase: 3, hours: 54, prerequisites: [] },
  { code: 'ECV2304', name: 'Topografia II', phase: 3, hours: 36, prerequisites: req('ECV2202') },
  { code: 'EMC5425', name: 'Fenômenos de Transportes', phase: 3, hours: 72, prerequisites: req('FSC5002') },
  { code: 'INE5108', name: 'Estatística e Probabilidade para Ciências Exatas', phase: 3, hours: 54, prerequisites: req('MTM3110') },
  { code: 'MTM3131', name: 'Equações Diferenciais Ordinárias', phase: 3, hours: 72, prerequisites: req('MTM3120') },

  // --- FASE 04 ---
  { code: 'ECV2401', name: 'Análise Estrutural I', phase: 4, hours: 54, prerequisites: req('ECV2302') },
  { code: 'ECV2402', name: 'Geoprocessamento', phase: 4, hours: 72, prerequisites: req('ECV2304') },
  { code: 'ECV2403', name: 'Materiais de Construção I', phase: 4, hours: 54, prerequisites: req('ECV2301') },
  { code: 'ECV2404', name: 'Mecânica dos Sólidos I', phase: 4, hours: 72, prerequisites: req('ECV2302') },
  { code: 'ECV2405', name: 'Sistemas de Transporte', phase: 4, hours: 54, prerequisites: req('ECV2304') },
  { code: 'ENS5101', name: 'Hidráulica', phase: 4, hours: 90, prerequisites: req('EMC5425') },
  { code: 'MTM3103', name: 'Cálculo 3', phase: 4, hours: 72, prerequisites: req('MTM3120') },

  // --- FASE 05 ---
  { code: 'ARQ5515', name: 'Urbanismo', phase: 5, hours: 54, prerequisites: req('ARQ5115', 'ECV2402') },
  { code: 'ECV2501', name: 'Ações e Segurança nas Estruturas', phase: 5, hours: 36, prerequisites: req('INE5108') },
  { code: 'ECV2502', name: 'Estradas I', phase: 5, hours: 54, prerequisites: req('ECV2402') },
  { code: 'ECV2503', name: 'Física das Construções', phase: 5, hours: 54, prerequisites: req('EMC5425', 'FSC5122') },
  { code: 'ECV2504', name: 'Materiais de Construção II', phase: 5, hours: 54, prerequisites: req('ECV2403') },
  { code: 'ECV2505', name: 'Mecânica dos Sólidos II', phase: 5, hours: 72, prerequisites: req('ECV2401', 'ECV2404') },
  { code: 'ECV2506', name: 'Mecânica dos Solos I', phase: 5, hours: 54, prerequisites: req('ECV2303', 'EMC5425') },
  { code: 'INE5202', name: 'Cálculo Numérico em Computadores', phase: 5, hours: 72, prerequisites: req('INE5201', 'MTM3103') },

  // --- FASE 06 ---
  { code: 'ECV2601', name: 'Análise Estrutural II', phase: 6, hours: 36, prerequisites: req('ECV2401', 'ECV2505', 'MTM3131') },
  { code: 'ECV2602', name: 'Concreto Armado I', phase: 6, hours: 54, prerequisites: req('ECV2401', 'ECV2404', 'ECV2501') },
  { code: 'ECV2603', name: 'Engenharia de Tráfego', phase: 6, hours: 54, prerequisites: req('ECV2405') },
  { code: 'ECV2604', name: 'Instalações Prediais I', phase: 6, hours: 54, prerequisites: req('ARQ5115', 'ENS5101') },
  { code: 'ECV2605', name: 'Mecânica dos Solos II', phase: 6, hours: 72, prerequisites: req('ECV2404', 'ECV2506') },
  { code: 'ECV2606', name: 'Técnicas de Construção I', phase: 6, hours: 54, prerequisites: req('ARQ5115', 'ECV2403', 'ECV2504') },
  { code: 'ECV2607', name: 'Técnicas de Construção II', phase: 6, hours: 54, prerequisites: req('ARQ5115', 'ECV2403', 'ECV2504') },
  { code: 'ENS5102', name: 'Hidrologia', phase: 6, hours: 72, prerequisites: req('ENS5101') },

  // --- FASE 07 ---
  { code: 'ECV2701', name: 'Concreto Armado II', phase: 7, hours: 54, prerequisites: req('ECV2602', 'MTM3103') },
  { code: 'ECV2702', name: 'Estradas II', phase: 7, hours: 36, prerequisites: req('ECV2502', 'ECV2605', 'ENS5102') },
  { code: 'ECV2703', name: 'Estruturas Metálicas e de Madeira', phase: 7, hours: 72, prerequisites: req('ECV2501', 'ECV2504', 'ECV2601') },
  { code: 'ECV2704', name: 'Expressão Oral e Escrita', phase: 7, hours: 54, prerequisites: [] },
  { code: 'ECV2705', name: 'Fundações', phase: 7, hours: 54, prerequisites: req('ECV2605', 'ECV2606') },
  { code: 'ECV2706', name: 'Instalações Prediais II', phase: 7, hours: 36, prerequisites: req('ARQ5115', 'ENS5101') },
  { code: 'ECV2707', name: 'Planejamento Econômico e Financeiro', phase: 7, hours: 54, prerequisites: req('ECV2502', 'ECV2606') },
  { code: 'ENS5106', name: 'Saneamento', phase: 7, hours: 72, prerequisites: req('ENS5101') },

  // --- FASE 08 ---
  { code: 'ECV2801', name: 'Orçamento de Obras', phase: 8, hours: 54, prerequisites: req('ECV2606', 'ECV2607') },
  { code: 'ECV2802', name: 'Pavimentação', phase: 8, hours: 72, prerequisites: req('ECV2702') },
  { code: 'ECV2803', name: 'Planejamento de Obras', phase: 8, hours: 54, prerequisites: req('ECV2606', 'ECV2607') },

  // --- FASE 09 ---
  { code: 'ECV2901', name: 'Legislação e Segurança do Trabalho', phase: 9, hours: 54, prerequisites: req('ECV2606', 'ECV2607') },
  { code: 'ECV2902', name: 'Obras de Engenharia e Impacto Ambiental', phase: 9, hours: 36, prerequisites: req('ECV2402') },
  { 
    code: 'ECV2903', 
    name: 'TCC: Projeto Integrador I', 
    phase: 9, 
    hours: 72,
    prerequisites: req(
      'ARQ5515', 'ECV2503', 'ECV2603', 'ECV2604', 
      'ECV2701', 'ECV2703', 'ECV2705', 'ECV2706', 'ECV2707',
      'ECV2801', 'ECV2802', 'ECV2803', 'ENS5106', 'INE5202'
    ) 
  },

  // --- FASE 10 ---
  { 
    code: 'ECV2000', 
    name: 'Estágio Profissionalizante', 
    phase: 10, 
    hours: 540,
    prerequisites: req('ECV2404', 'ECV2901', 'ECV2902', 'ECV2903') 
  },
  { code: 'ECV2002', name: 'TCC: Projeto Integrador II', phase: 10, hours: 72, prerequisites: req('ECV2903') },
];