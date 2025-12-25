import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { CURRICULUM, TOTAL_PHASES, MAX_WEEKLY_HOURS, WEEKS_PER_SEMESTER, REQUIRED_ELECTIVE_HOURS, MAX_COMPLEMENTARY_HOURS } from './constants';
import { analyzeAll, getSubjectByCode, calculateMinimumSemesters } from './utils';
import { SubjectAnalysis, UserSession, Elective } from './types';
import { 
  CheckCircle2, 
  Lock, 
  Unlock, 
  LogOut, 
  UserCircle,
  BarChart3,
  GraduationCap,
  Loader2,
  Info,
  LayoutDashboard,
  Lightbulb,
  MessageCircle,
  Pencil,
  Save,
  X,
  Clock,
  AlertTriangle,
  CalendarCheck,
  CheckSquare,
  Square,
  Sun,
  Plus,
  Trash2,
  BookOpen,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// --- MOCK BACKEND SERVICE ---
const AuthService = {
  login: async (username: string): Promise<UserSession> => {
    // Simulate network delay slightly faster for UX
    await new Promise(resolve => setTimeout(resolve, 400)); 
    
    const key = `civil_tracker_${username.toLowerCase().trim()}`;
    // Save as active user for persistence
    localStorage.setItem('civil_tracker_active_user', username);

    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
    
    const newUser: UserSession = {
      username,
      completedCodes: [],
      electives: [],
      lastLogin: new Date()
    };
    localStorage.setItem(key, JSON.stringify(newUser));
    return newUser;
  },

  // New method to restore session
  checkSession: async (): Promise<UserSession | null> => {
    const activeUser = localStorage.getItem('civil_tracker_active_user');
    if (!activeUser) return null;
    
    // We can reuse the login logic or fetch directly to avoid delay
    const key = `civil_tracker_${activeUser.toLowerCase().trim()}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
    return null;
  },

  saveProgress: (username: string, codes: string[], electives: Elective[]) => {
    const key = `civil_tracker_${username.toLowerCase().trim()}`;
    const session: UserSession = {
      username,
      completedCodes: codes,
      electives: electives || [],
      lastLogin: new Date()
    };
    localStorage.setItem(key, JSON.stringify(session));
  },

  renameUser: (oldUsername: string, newUsername: string, codes: string[], electives: Elective[]): UserSession => {
    const oldKey = `civil_tracker_${oldUsername.toLowerCase().trim()}`;
    const newKey = `civil_tracker_${newUsername.toLowerCase().trim()}`;
    
    const newSession: UserSession = {
      username: newUsername,
      completedCodes: codes,
      electives: electives,
      lastLogin: new Date()
    };

    localStorage.setItem(newKey, JSON.stringify(newSession));
    localStorage.removeItem(oldKey);
    // Update active user reference
    localStorage.setItem('civil_tracker_active_user', newUsername);
    return newSession;
  },

  logout: () => {
    localStorage.removeItem('civil_tracker_active_user');
  }
};

// --- COMPONENTS ---

interface PhaseColumnProps {
  phase: number;
  subjects: SubjectAnalysis[];
  onToggle: (code: string) => void;
}

const PhaseColumn: React.FC<PhaseColumnProps> = ({ 
  phase, 
  subjects, 
  onToggle 
}) => {
  return (
    <div className="flex-shrink-0 w-[320px] flex flex-col h-full bg-slate-50/50 border-r border-slate-200">
      {/* Header */}
      <div className="px-3 py-3 bg-slate-100/90 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10 flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
          Fase {phase}
        </h3>
        <div className="flex items-center gap-2">
           <span className="text-[10px] font-medium text-slate-400">
            {subjects.filter(s => s.status === 'completed').length}/{subjects.length}
          </span>
          <div className="h-1.5 w-12 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ 
                width: `${(subjects.filter(s => s.status === 'completed').length / subjects.length) * 100}%` 
              }}
            />
          </div>
        </div>
      </div>

      {/* Cards Container */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar pb-20">
        {subjects.map(({ subject, status, missingPrereqs }) => {
          const isCompleted = status === 'completed';
          const isAvailable = status === 'available';
          const isBlocked = status === 'blocked';

          return (
            <div
              key={subject.code}
              onClick={() => {
                if (!isBlocked || isCompleted) {
                  onToggle(subject.code);
                }
              }}
              className={`
                relative px-3 py-3 rounded-lg border transition-all duration-200 group select-none flex flex-col gap-2
                ${isCompleted 
                  ? 'bg-emerald-50/50 border-emerald-100 opacity-60 hover:opacity-100 cursor-pointer' 
                  : ''}
                ${isAvailable 
                  ? 'bg-white border-blue-200 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:border-blue-400 hover:-translate-y-0.5 cursor-pointer z-10' 
                  : ''}
                ${isBlocked 
                  ? 'bg-slate-100/50 border-slate-200 text-slate-400 cursor-not-allowed grayscale-[0.8]' 
                  : ''}
              `}
            >
              <div className="flex items-start gap-3 w-full">
                {/* Status Icon Column */}
                <div className="pt-0.5 flex-shrink-0">
                   {isCompleted && <CheckCircle2 size={16} className="text-emerald-500" />}
                   {isAvailable && <Unlock size={16} className="text-blue-500" />}
                   {isBlocked && <Lock size={14} className="text-slate-300" />}
                </div>

                {/* Text Content */}
                <div className="flex-1 min-w-0">
                  <div className={`text-xs leading-snug break-words flex items-start justify-between
                    ${isCompleted ? 'line-through decoration-emerald-300 text-emerald-800' : ''}
                    ${isBlocked ? 'text-slate-500' : 'text-slate-700'}
                  `}>
                    <div>
                      <span className={`font-black tracking-wide mr-1.5 ${isCompleted ? 'text-emerald-600' : 'text-slate-900'}`}>
                        {subject.code}
                      </span>
                      <span className="opacity-30 mr-1.5">|</span>
                      <span className="font-medium">{subject.name}</span>
                    </div>
                    {/* Hours Tag */}
                    <span className="flex-shrink-0 ml-2 text-[9px] font-medium bg-slate-100 px-1.5 py-0.5 rounded text-slate-400 whitespace-nowrap">
                       {subject.hours}h
                    </span>
                  </div>
                </div>
              </div>

              {/* Blocked Reasons (Names) */}
              {isBlocked && missingPrereqs.length > 0 && (
                <div className="mt-1 pt-2 border-t border-slate-200/50 w-full">
                  <div className="flex items-center gap-1 text-[9px] font-bold text-red-400 mb-1">
                    <Info size={10} /> Pré-requisitos:
                  </div>
                  <div className="flex flex-col gap-1">
                    {missingPrereqs.map(code => {
                       const prereqName = getSubjectByCode(code)?.name || 'Desconhecido';
                       return (
                         <div key={code} className="flex items-start gap-1.5 text-[9px] text-red-500/80">
                           <span className="font-bold bg-red-50 px-1 rounded border border-red-100">{code}</span>
                           <span className="truncate leading-tight opacity-90">{prereqName}</span>
                         </div>
                       );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const RecommendationsView = ({ 
  analysis, 
  completedCodesSet,
  electives,
  onAddElective,
  onRemoveElective
}: { 
  analysis: Record<number, SubjectAnalysis[]>, 
  completedCodesSet: Set<string>,
  electives: Elective[],
  onAddElective: (hours: number, type: 'discipline' | 'complementary', name: string) => void,
  onRemoveElective: (id: string) => void
}) => {
  const allSubjects = Object.values(analysis).flat();
  const available = allSubjects.filter(s => s.status === 'available');
  const completed = allSubjects.filter(s => s.status === 'completed');
  const blocked = allSubjects.filter(s => s.status === 'blocked');
  
  const [plannedCodes, setPlannedCodes] = useState<Set<string>>(new Set());
  
  // Elective Form State
  const [isElectivesOpen, setIsElectivesOpen] = useState(true);
  const [electiveName, setElectiveName] = useState('');
  const [electiveType, setElectiveType] = useState<'discipline' | 'complementary'>('discipline');
  const [customHours, setCustomHours] = useState('54');

  // Stats Calculations
  const totalMandatoryHours = allSubjects.reduce((acc, s) => acc + s.subject.hours, 0);
  const completedMandatoryHours = completed.reduce((acc, s) => acc + s.subject.hours, 0);
  
  const completedElectiveHours = electives.reduce((acc, e) => acc + e.hours, 0);
  const validElectiveHours = Math.min(completedElectiveHours, REQUIRED_ELECTIVE_HOURS);
  
  const totalCourseHours = totalMandatoryHours + REQUIRED_ELECTIVE_HOURS;
  const totalCompletedHours = completedMandatoryHours + validElectiveHours;
  
  const progressPercent = Math.round((totalCompletedHours / totalCourseHours) * 100);

  // Complementary Hours Check
  const complementaryHours = electives
    .filter(e => e.type === 'complementary')
    .reduce((acc, e) => acc + e.hours, 0);

  // Calculate minimum remaining semesters using simulation
  const minSemestersRemaining = useMemo(() => {
    return calculateMinimumSemesters(completedCodesSet, validElectiveHours);
  }, [completedCodesSet, validElectiveHours]);

  // Auto-select logic
  useEffect(() => {
    const prioritized = [...available].sort((a, b) => {
      if (b.chainWeight !== a.chainWeight) return b.chainWeight - a.chainWeight;
      return a.subject.phase - b.subject.phase;
    });

    const newPlanned = new Set<string>();
    let currentWeeklyLoad = 0;

    for (const item of prioritized) {
      const weeklyHours = item.subject.hours / WEEKS_PER_SEMESTER;
      const effectiveLoad = item.subject.hours > 200 ? MAX_WEEKLY_HOURS : weeklyHours;

      if (currentWeeklyLoad + effectiveLoad <= MAX_WEEKLY_HOURS) {
        newPlanned.add(item.subject.code);
        currentWeeklyLoad += effectiveLoad;
      }
    }
    setPlannedCodes(newPlanned);
  }, [available.length]);

  const togglePlanned = (code: string) => {
    const newSet = new Set(plannedCodes);
    if (newSet.has(code)) newSet.delete(code);
    else newSet.add(code);
    setPlannedCodes(newSet);
  };

  const totalPlannedWeeklyHours = Array.from(plannedCodes).reduce((acc, code) => {
    const subj = getSubjectByCode(code);
    if (!subj) return acc;
    const weekly = subj.hours / WEEKS_PER_SEMESTER;
    return acc + (subj.hours > 200 ? MAX_WEEKLY_HOURS : weekly);
  }, 0);

  const isOverLimit = totalPlannedWeeklyHours > MAX_WEEKLY_HOURS;

  const handleAddElectiveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const h = parseInt(customHours);
    if (h > 0) {
      onAddElective(h, electiveType, electiveName || 'Optativa Personalizada');
      setElectiveName('');
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 pb-24 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-900 text-sm">
        <AlertTriangle className="flex-shrink-0 mt-0.5 text-amber-600" size={18} />
        <div>
          <strong>Aviso Importante:</strong> Este sistema sugere um planejamento ideal baseado apenas nos pré-requisitos pedagógicos.
          <br/>
          <span className="opacity-80">Não verificamos disponibilidade de vagas, horários reais das turmas ou conflitos no CAGR.</span>
        </div>
      </div>

      {/* Progress Card (Dark) */}
      <div className="bg-[#0f172a] rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <GraduationCap size={180} />
        </div>
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
             <div>
                <h2 className="text-xl font-bold">Progresso Total</h2>
                <div className="text-slate-400 text-sm">Obrigatórias + Optativas</div>
             </div>
             <div className="text-4xl font-bold text-emerald-400">{progressPercent}%</div>
          </div>

          <div className="h-4 bg-slate-800 rounded-full overflow-hidden mb-2">
            <div 
              className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-1000 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          
          <div className="flex justify-between text-xs text-slate-400 font-medium">
             <span>{totalCompletedHours}h Concluídas</span>
             <span>Meta: {totalCourseHours}h</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Graduation Indicator */}
        <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-amber-50 to-orange-50 p-5 rounded-xl border border-amber-200 shadow-sm relative overflow-hidden">
           <div className="absolute -right-2 -bottom-2 text-amber-500/10">
              <Sun size={64} />
           </div>
           <div className="text-amber-600 text-[10px] uppercase font-bold tracking-wider mb-2 flex items-center gap-1">
             <Sun size={12} className="fill-amber-500" /> Lugar ao Sol
           </div>
           <div className="text-3xl font-bold text-amber-800 leading-none">
              {minSemestersRemaining}
              <span className="text-sm font-medium ml-1 opacity-70">Semestres</span>
           </div>
           <div className="text-[10px] text-amber-700/60 font-medium mt-1">Previsão Mínima</div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
           <div className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-2">Mat. Restantes</div>
           <div className="text-3xl font-bold text-slate-800">{blocked.length + available.length}</div>
        </div>
        {/* Card 3 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
           <div className="text-blue-600 text-[10px] uppercase font-bold tracking-wider mb-2">Disponíveis</div>
           <div className="text-3xl font-bold text-blue-600">{available.length}</div>
        </div>
        {/* Card 4 (Load) */}
        <div className={`p-5 rounded-xl border shadow-sm transition-colors ${isOverLimit ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
           <div className={`${isOverLimit ? 'text-red-600' : 'text-emerald-600'} text-[10px] uppercase font-bold tracking-wider mb-2`}>
             Carga Selecionada
           </div>
           <div className="flex items-baseline gap-1">
             <span className={`text-3xl font-bold ${isOverLimit ? 'text-red-700' : 'text-slate-800'}`}>
                {Math.round(totalPlannedWeeklyHours)}h
             </span>
             <span className="text-sm text-slate-400 font-medium">/sem</span>
           </div>
        </div>
      </div>

      {/* Electives Management (Retractable) */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm transition-all duration-300">
        <div 
          onClick={() => setIsElectivesOpen(!isElectivesOpen)}
          className="p-4 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors select-none"
        >
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            {isElectivesOpen ? <ChevronUp className="text-slate-400" size={20} /> : <ChevronDown className="text-slate-400" size={20} />}
            <BookOpen className="text-purple-500" size={20} />
            Banco de Optativas
          </h2>
          <div className="text-right">
             <div className="text-[10px] uppercase font-bold text-slate-400">Total Validado</div>
             <div className={`text-lg font-black leading-none ${completedElectiveHours >= REQUIRED_ELECTIVE_HOURS ? 'text-emerald-600' : 'text-slate-800'}`}>
                {completedElectiveHours} <span className="text-sm font-medium text-slate-400">/ {REQUIRED_ELECTIVE_HOURS}h</span>
             </div>
          </div>
        </div>
        
        {/* Progress Bar for Electives (Always visible) */}
        <div className="h-1.5 bg-slate-100 w-full">
           <div 
             className="h-full bg-purple-500 transition-all duration-700" 
             style={{ width: `${Math.min(100, (completedElectiveHours / REQUIRED_ELECTIVE_HOURS) * 100)}%` }}
           />
        </div>

        {isElectivesOpen && (
          <div className="p-4 md:p-6 grid md:grid-cols-2 gap-8 animate-in slide-in-from-top-2 duration-200">
             {/* Add Form */}
             <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase text-slate-400">Adicionar Créditos</h3>
                
                <div className="flex gap-2">
                   <button onClick={() => onAddElective(36, 'discipline', 'Optativa (2 créditos)')} className="flex-1 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-100 hover:border-purple-300 transition-colors">+36h</button>
                   <button onClick={() => onAddElective(54, 'discipline', 'Optativa (3 créditos)')} className="flex-1 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-100 hover:border-purple-300 transition-colors">+54h</button>
                   <button onClick={() => onAddElective(72, 'discipline', 'Optativa (4 créditos)')} className="flex-1 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-100 hover:border-purple-300 transition-colors">+72h</button>
                </div>

                <div className="border-t border-slate-100 pt-4">
                   <form onSubmit={handleAddElectiveSubmit} className="space-y-3">
                     <div className="grid grid-cols-2 gap-3">
                        <input 
                          type="text" 
                          placeholder="Nome (Opcional)" 
                          value={electiveName}
                          onChange={(e) => setElectiveName(e.target.value)}
                          className="col-span-2 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-slate-900"
                        />
                        <select 
                          value={electiveType} 
                          onChange={(e) => setElectiveType(e.target.value as any)}
                          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                           <option value="discipline">Disciplina</option>
                           <option value="complementary">Complementar</option>
                        </select>
                        
                        {/* Custom Input for Hours with hidden spin buttons */}
                        <div className="relative">
                          <input 
                             type="number"
                             value={customHours}
                             onChange={(e) => setCustomHours(e.target.value)}
                             className="w-full text-sm border border-slate-200 rounded-lg pl-3 pr-10 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                             placeholder="Qtd"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold pointer-events-none">
                            horas
                          </div>
                        </div>
                     </div>
                     <button type="submit" className="w-full py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2">
                        <Plus size={16} /> Adicionar Personalizado
                     </button>
                   </form>
                </div>
                
                {complementaryHours > MAX_COMPLEMENTARY_HOURS && (
                   <div className="text-[10px] text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                      ⚠️ Atenção: Você tem {complementaryHours}h de atividades complementares. O limite para validação é {MAX_COMPLEMENTARY_HOURS}h.
                   </div>
                )}
             </div>

             {/* List */}
             <div className="bg-slate-50 rounded-xl p-4 max-h-[240px] overflow-y-auto">
                {electives.length === 0 ? (
                   <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center">
                      <BookOpen className="mb-2 opacity-20" size={32} />
                      <p className="text-xs">Nenhuma optativa registrada.</p>
                   </div>
                ) : (
                   <ul className="space-y-2">
                      {electives.map(e => (
                         <li key={e.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between group">
                            <div>
                               <div className="text-sm font-medium text-slate-800">{e.name}</div>
                               <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                                  <span className={`w-1.5 h-1.5 rounded-full ${e.type === 'complementary' ? 'bg-amber-400' : 'bg-purple-400'}`}></span>
                                  {e.type === 'complementary' ? 'Atv. Complementar' : 'Disciplina'}
                               </div>
                            </div>
                            <div className="flex items-center gap-3">
                               <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded">{e.hours}h</span>
                               <button onClick={() => onRemoveElective(e.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                                  <Trash2 size={14} />
                               </button>
                            </div>
                         </li>
                      ))}
                   </ul>
                )}
             </div>
          </div>
        )}
      </div>

      {/* Simulator List */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Lightbulb className="text-amber-500 fill-amber-500" size={20} />
          Sugestão de Matrícula (Máx 30h/sem)
        </h2>
        
        {available.length === 0 ? (
           <div className="p-8 bg-slate-100 rounded-xl text-center text-slate-500">
              <CheckCircle2 className="mx-auto mb-2 opacity-50" size={32} />
              Sem matérias disponíveis para matrícula no momento.
           </div>
        ) : (
          <div className="grid gap-3">
             {/* Same simulator items as before */}
             {[...available].sort((a, b) => {
               const aSelected = plannedCodes.has(a.subject.code);
               const bSelected = plannedCodes.has(b.subject.code);
               if (aSelected !== bSelected) return aSelected ? -1 : 1;
               if (b.chainWeight !== a.chainWeight) return b.chainWeight - a.chainWeight;
               return a.subject.phase - b.subject.phase;
            }).map((item) => {
              const isSelected = plannedCodes.has(item.subject.code);
              const weekly = item.subject.hours / WEEKS_PER_SEMESTER;
              
              return (
                <div 
                  key={item.subject.code} 
                  onClick={() => togglePlanned(item.subject.code)}
                  className={`
                    relative p-4 rounded-xl border transition-all cursor-pointer flex items-center gap-4 group
                    ${isSelected 
                      ? 'bg-blue-50/50 border-blue-300 shadow-sm ring-1 ring-blue-200' 
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'}
                  `}
                >
                   <div className={`
                     flex-shrink-0 w-6 h-6 rounded-md border flex items-center justify-center transition-colors
                     ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white border-slate-300 text-transparent group-hover:border-blue-400'}
                   `}>
                     <CheckSquare size={16} />
                   </div>

                   <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${isSelected ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                          {item.subject.code}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wide">Fase {item.subject.phase}</span>
                        {item.chainWeight > 0 && (
                          <span className="text-[10px] flex items-center gap-1 text-amber-600 bg-amber-50 px-1.5 rounded-full font-medium">
                             Bloqueia {item.chainWeight} matérias
                          </span>
                        )}
                      </div>
                      <h3 className={`text-sm font-semibold ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>
                        {item.subject.name}
                      </h3>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {item.subject.hours} horas totais
                      </div>
                   </div>

                   <div className="text-right flex-shrink-0 min-w-[60px]">
                      <div className={`text-sm font-bold ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
                         {Math.round(weekly)}h/sem
                      </div>
                   </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---

const App: React.FC = () => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true); // New state to prevent flash
  const [completedCodes, setCompletedCodes] = useState<Set<string>>(new Set());
  const [electives, setElectives] = useState<Elective[]>([]);
  const [activeTab, setActiveTab] = useState<'board' | 'stats'>('board');
  
  // Edit Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editNameInput, setEditNameInput] = useState('');

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const analysis = useMemo(() => analyzeAll(completedCodes), [completedCodes]);

  const whatsappLink = `https://wa.me/5548991198583?text=${encodeURIComponent("Vim pelo currículo interativo da UFSC e estou interessado em mais serviços")}`;

  // Calculate Global Progress (Including Electives)
  const progressStats = useMemo(() => {
    const allSubjects = Object.values(analysis).flat();
    const totalMandatoryHours = allSubjects.reduce((acc, s) => acc + s.subject.hours, 0);
    const completedMandatoryHours = allSubjects
      .filter(s => s.status === 'completed')
      .reduce((acc, s) => acc + s.subject.hours, 0);
    
    // Elective math
    const currentElectiveHours = electives.reduce((acc, e) => acc + e.hours, 0);
    const validElectiveHours = Math.min(currentElectiveHours, REQUIRED_ELECTIVE_HOURS);

    const totalHours = totalMandatoryHours + REQUIRED_ELECTIVE_HOURS;
    const completedHours = completedMandatoryHours + validElectiveHours;
    
    const percentage = totalHours > 0 ? Math.round((completedHours / totalHours) * 100) : 0;
    return { completedHours, totalHours, percentage };
  }, [analysis, electives]);

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const session = await AuthService.checkSession();
        if (session) {
          setUser(session);
          setCompletedCodes(new Set(session.completedCodes));
          setElectives(session.electives || []);
        }
      } catch (err) {
        console.error("Failed to restore session", err);
      } finally {
        setIsCheckingSession(false);
      }
    };
    restoreSession();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;
    setLoading(true);
    try {
      const session = await AuthService.login(usernameInput);
      setUser(session);
      setCompletedCodes(new Set(session.completedCodes));
      setElectives(session.electives || []);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    AuthService.logout(); // Clear active user key
    setUser(null);
    setCompletedCodes(new Set());
    setElectives([]);
    setUsernameInput('');
    setActiveTab('board');
  };

  const toggleSubject = (code: string) => {
    if (!user) return;
    const newSet = new Set(completedCodes);
    if (newSet.has(code)) newSet.delete(code);
    else newSet.add(code);
    
    setCompletedCodes(newSet);
    AuthService.saveProgress(user.username, Array.from(newSet) as string[], electives);
  };

  const addElective = (hours: number, type: 'discipline' | 'complementary', name: string) => {
    if (!user) return;
    const newElective: Elective = {
      id: Date.now().toString(),
      name,
      hours,
      type
    };
    const newElectives = [...electives, newElective];
    setElectives(newElectives);
    AuthService.saveProgress(user.username, Array.from(completedCodes), newElectives);
  };

  const removeElective = (id: string) => {
    if (!user) return;
    const newElectives = electives.filter(e => e.id !== id);
    setElectives(newElectives);
    AuthService.saveProgress(user.username, Array.from(completedCodes), newElectives);
  };

  const startEditingProfile = () => {
    if (user) {
      setEditNameInput(user.username);
      setIsEditingProfile(true);
    }
  };

  const saveProfileName = () => {
    if (!user || !editNameInput.trim() || editNameInput.trim() === user.username) {
      setIsEditingProfile(false);
      return;
    }
    
    const newSession = AuthService.renameUser(user.username, editNameInput.trim(), Array.from(completedCodes), electives);
    setUser(newSession);
    setIsEditingProfile(false);
  };

  // Show nothing or a simple loader while checking session to prevent login screen flash
  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
        {/* Same login screen as before */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] rounded-full bg-blue-600/20 blur-3xl opacity-50"></div>
          <div className="absolute top-[40%] -left-[10%] w-[400px] h-[400px] rounded-full bg-emerald-500/10 blur-3xl opacity-50"></div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-xl border border-white/10 p-8 rounded-2xl w-full max-w-md shadow-2xl relative z-10">
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-emerald-500 p-4 rounded-xl shadow-lg ring-4 ring-slate-800">
              <GraduationCap size={40} className="text-white" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-center text-white mb-2">Engenharia Civil UFSC</h1>
          <p className="text-center text-slate-400 mb-8 text-xs uppercase tracking-widest font-medium">
            Currículo Interativo Engenharia Civil UFSC
          </p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Identificação</label>
              <div className="relative group">
                <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={20} />
                <input 
                  type="text" 
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="Seu nome ou matrícula"
                  className="w-full bg-slate-900/50 border border-slate-700 text-white placeholder-slate-600 rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  autoFocus
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading || !usernameInput.trim()}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Acessar'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Top Navigation */}
      <header className="bg-slate-900 text-white border-b border-slate-800 h-14 flex-shrink-0 flex items-center justify-between px-4 lg:px-6 shadow-md z-20 relative">
        {/* Left Side: Logo & Tabs */}
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="bg-blue-500 p-1.5 rounded-lg flex-shrink-0">
              <GraduationCap size={18} />
            </div>
            <div className="hidden min-[370px]:block">
              <h1 className="font-bold text-sm leading-none">Civil</h1>
              <span className="text-[9px] text-slate-400 uppercase tracking-widest">UFSC</span>
            </div>
          </div>

          {/* Divider */}
          <div className="h-5 w-px bg-slate-700 hidden min-[370px]:block"></div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-slate-800/50 p-1 rounded-lg">
             <button 
               onClick={() => setActiveTab('board')}
               className={`p-1.5 md:px-3 md:py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2
                 ${activeTab === 'board' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}
               `}
               title="Acompanhamento do Curso"
             >
               <LayoutDashboard size={18} /> <span className="hidden md:inline">Acompanhamento</span>
             </button>
             <button 
               onClick={() => setActiveTab('stats')}
               className={`p-1.5 md:px-3 md:py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2
                 ${activeTab === 'stats' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}
               `}
               title="Planejador"
             >
               <CalendarCheck size={18} /> <span className="hidden md:inline">Planejador</span>
             </button>
          </nav>
        </div>

        {/* Center: Desktop Progress */}
        <div className="hidden md:flex items-center gap-3 flex-1 justify-center max-w-xs mx-4">
           <div className="text-[10px] text-slate-400 font-bold whitespace-nowrap">
             {progressStats.percentage}% Concluído
           </div>
           <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${progressStats.percentage}%` }}></div>
           </div>
        </div>
        
        {/* Right Side: Tools & Profile */}
        <div className="flex items-center gap-3">
          
          {/* WhatsApp (Desktop) */}
          <a 
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white px-3 py-1.5 rounded-full text-xs font-bold transition-all"
          >
            <MessageCircle size={14} className="fill-white text-[#25D366]" />
            <span>Contato</span>
          </a>

          {/* User Profile */}
          <div className="flex items-center gap-2">
            {isEditingProfile ? (
              <div className="flex items-center bg-slate-800 rounded-md p-0.5 border border-blue-500/50 absolute top-14 right-2 z-50 shadow-xl md:static md:shadow-none md:border-none md:bg-transparent">
                <input 
                  className="bg-slate-900 text-white text-xs px-2 py-1 outline-none w-24 rounded border border-slate-700"
                  value={editNameInput}
                  onChange={(e) => setEditNameInput(e.target.value)}
                  autoFocus
                />
                <button onClick={saveProfileName} className="p-1 text-emerald-400"><Save size={14}/></button>
                <button onClick={() => setIsEditingProfile(false)} className="p-1 text-red-400"><X size={14}/></button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group cursor-pointer" onClick={startEditingProfile} title="Editar nome">
                 <div className="text-right hidden md:block">
                   <div className="text-xs font-bold text-slate-200 flex items-center justify-end gap-1">
                     {user.username}
                   </div>
                 </div>
                 <div className="bg-slate-700 p-1.5 rounded-full border border-slate-600">
                   <UserCircle size={18} className="text-slate-300" />
                 </div>
              </div>
            )}
          </div>

          <button onClick={handleLogout} className="text-slate-500 hover:text-white transition-colors" title="Sair">
            <LogOut size={18} />
          </button>
        </div>

        {/* Mobile Progress Bar (Absolute Bottom) */}
        <div className="absolute bottom-0 left-0 w-full md:hidden h-1 bg-slate-800">
           <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${progressStats.percentage}%` }}></div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative flex flex-col">
        {activeTab === 'board' ? (
          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-x-auto overflow-y-hidden flex bg-slate-100"
          >
            {Array.from({ length: TOTAL_PHASES }, (_, i) => i + 1).map((phase) => (
              <PhaseColumn 
                key={phase} 
                phase={phase} 
                subjects={analysis[phase] || []}
                onToggle={toggleSubject}
              />
            ))}
            <div className="w-8 flex-shrink-0 bg-slate-50/50 border-r border-transparent"></div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto bg-slate-50">
             <RecommendationsView 
               analysis={analysis} 
               completedCodesSet={completedCodes}
               electives={electives}
               onAddElective={addElective}
               onRemoveElective={removeElective}
             />
          </div>
        )}
      </main>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}

export default App;