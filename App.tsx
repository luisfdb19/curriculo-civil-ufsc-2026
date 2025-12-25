
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, doc, getDoc, setDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { CURRICULUM, TOTAL_PHASES, MAX_WEEKLY_HOURS, WEEKS_PER_SEMESTER, REQUIRED_ELECTIVE_HOURS, MAX_COMPLEMENTARY_HOURS } from './constants';
import { analyzeAll, getSubjectByCode, calculateMinimumSemesters } from './utils';
import { SubjectAnalysis, UserSession, Elective } from './types';
import { 
  CheckCircle2, 
  Lock, 
  Unlock, 
  LogOut, 
  UserCircle,
  GraduationCap,
  Loader2,
  Info,
  LayoutDashboard,
  Lightbulb,
  MessageCircle,
  X,
  AlertTriangle,
  CalendarCheck,
  CheckSquare,
  Cloud,
  CloudCheck,
  Trash2,
  BookOpen,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// --- FIREBASE INITIALIZATION ---
const firebaseConfig = {
  apiKey: "AIzaSyBHnl8a6otXQsZYK4FpTMDV-Py5V9x2st4",
  authDomain: "curriculo-civil-ufsc.firebaseapp.com",
  projectId: "curriculo-civil-ufsc",
  storageBucket: "curriculo-civil-ufsc.appspot.com",
  messagingSenderId: "798554720130",
  appId: "1:798554720130:web:YOUR_APP_ID_HERE" // Adicione seu App ID aqui após registrar o Web App no console
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- BACKEND SERVICE ---
const AuthService = {
  login: async (username: string): Promise<UserSession> => {
    const userId = username.toLowerCase().trim();
    const docRef = doc(db, "users", userId);
    
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const session = {
          ...data,
          lastLogin: new Date()
        } as UserSession;
        localStorage.setItem('civil_tracker_active_user', username);
        localStorage.setItem(`civil_tracker_cache_${userId}`, JSON.stringify(session));
        return session;
      }
    } catch (e) {
      console.error("Erro ao buscar dados no Firebase:", e);
    }

    // New User
    const newUser: UserSession = {
      username,
      completedCodes: [],
      electives: [],
      lastLogin: new Date()
    };
    await setDoc(docRef, newUser);
    localStorage.setItem('civil_tracker_active_user', username);
    return newUser;
  },

  checkSession: async (): Promise<UserSession | null> => {
    const activeUser = localStorage.getItem('civil_tracker_active_user');
    if (!activeUser) return null;
    
    const userId = activeUser.toLowerCase().trim();
    const cached = localStorage.getItem(`civil_tracker_cache_${userId}`);
    if (cached) return JSON.parse(cached);

    // If no cache, try to fetch again
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as UserSession) : null;
  },

  saveProgress: async (username: string, codes: string[], electives: Elective[]): Promise<void> => {
    const userId = username.toLowerCase().trim();
    const docRef = doc(db, "users", userId);
    const session = {
      username,
      completedCodes: codes,
      electives: electives || [],
      lastLogin: new Date()
    };
    
    localStorage.setItem(`civil_tracker_cache_${userId}`, JSON.stringify(session));
    await setDoc(docRef, session, { merge: true });
  },

  logout: () => {
    localStorage.removeItem('civil_tracker_active_user');
  }
};

// --- COMPONENTS ---

const PhaseColumn = ({ phase, subjects, onToggle }: any) => (
  <div className="flex-shrink-0 w-[300px] md:w-[320px] flex flex-col h-full bg-slate-50/50 border-r border-slate-200">
    <div className="px-3 py-3 bg-slate-100/90 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10 flex items-center justify-between">
      <h3 className="text-[10px] md:text-xs font-bold text-slate-600 uppercase tracking-wider">Fase {phase}</h3>
      <div className="flex items-center gap-2">
         <span className="text-[10px] font-medium text-slate-400">{subjects.filter((s: any) => s.status === 'completed').length}/{subjects.length}</span>
         <div className="h-1 w-10 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${(subjects.filter((s: any) => s.status === 'completed').length / subjects.length) * 100}%` }} />
         </div>
      </div>
    </div>
    <div className="flex-1 overflow-y-auto p-2 space-y-2 pb-20">
      {subjects.map(({ subject, status, missingPrereqs }: any) => (
        <div key={subject.code} onClick={() => (status !== 'blocked' || status === 'completed') && onToggle(subject.code)}
          className={`relative px-3 py-3 rounded-lg border transition-all duration-200 cursor-pointer ${status === 'completed' ? 'bg-emerald-50/30 border-emerald-100 opacity-60' : status === 'available' ? 'bg-white border-blue-200 shadow-sm hover:border-blue-400' : 'bg-slate-100/50 border-slate-200 text-slate-400 grayscale-[0.5]'}`}>
          <div className="flex items-start gap-2">
            {status === 'completed' ? <CheckCircle2 size={16} className="text-emerald-500" /> : status === 'available' ? <Unlock size={16} className="text-blue-500" /> : <Lock size={14} className="text-slate-300" />}
            <div className="flex-1 min-w-0">
              <div className={`text-[11px] md:text-xs font-bold ${status === 'completed' ? 'line-through text-emerald-800' : 'text-slate-700'}`}>
                {subject.code} | {subject.name}
              </div>
            </div>
            <span className="text-[9px] bg-slate-100 px-1 rounded text-slate-400">{subject.hours}h</span>
          </div>
          {status === 'blocked' && (
            <div className="mt-1 flex flex-col gap-1">
              {missingPrereqs.map((p: string) => <div key={p} className="text-[9px] text-red-500/70 truncate">Req: {getSubjectByCode(p)?.name}</div>)}
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
);

const RecommendationsView = ({ analysis, completedCodesSet, electives, onAddElective, onRemoveElective }: any) => {
  const all = Object.values(analysis).flat() as SubjectAnalysis[];
  const completed = all.filter(s => s.status === 'completed');
  const available = all.filter(s => s.status === 'available');
  const validElectiveHours = Math.min(electives.reduce((acc: number, e: Elective) => acc + e.hours, 0), REQUIRED_ELECTIVE_HOURS);
  const totalCompletedHours = completed.reduce((acc, s) => acc + s.subject.hours, 0) + validElectiveHours;
  const progressPercent = Math.round((totalCompletedHours / (all.reduce((acc, s) => acc + s.subject.hours, 0) + REQUIRED_ELECTIVE_HOURS)) * 100);
  const minSemesters = useMemo(() => calculateMinimumSemesters(completedCodesSet, validElectiveHours), [completedCodesSet, validElectiveHours]);

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 pb-24 space-y-6">
      <div className="bg-[#0f172a] rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="flex justify-between items-start mb-4">
           <div><h2 className="text-xl font-bold">Progresso Total</h2><div className="text-slate-400 text-xs">Dados salvos em nuvem</div></div>
           <div className="text-4xl font-bold text-emerald-400">{progressPercent}%</div>
        </div>
        <div className="h-3 bg-slate-800 rounded-full overflow-hidden mb-2">
          <div className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-1000" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
           <div className="text-amber-600 text-[9px] font-bold uppercase">Restam Aprox.</div>
           <div className="text-2xl font-bold text-amber-800">{minSemesters} Semestres</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
           <div className="text-slate-500 text-[9px] font-bold uppercase">Mat. Disponíveis</div>
           <div className="text-2xl font-bold text-blue-600">{available.length}</div>
        </div>
      </div>
      <div className="space-y-3">
        <h2 className="text-sm font-bold flex items-center gap-2"><Lightbulb size={18} className="text-amber-500" /> Sugestão de Matrícula</h2>
        {available.map(item => (
          <div key={item.subject.code} className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
             <div className="flex items-center gap-3">
               <div className="w-5 h-5 rounded bg-blue-500 flex items-center justify-center text-white"><CheckSquare size={14} /></div>
               <div className="text-xs font-bold">{item.subject.code} - {item.subject.name}</div>
             </div>
             <div className="text-[10px] font-bold text-slate-400">{Math.round(item.subject.hours/18)}h/sem</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [completedCodes, setCompletedCodes] = useState<Set<string>>(new Set());
  const [electives, setElectives] = useState<Elective[]>([]);
  const [activeTab, setActiveTab] = useState<'board' | 'stats'>('board');

  const analysis = useMemo(() => analyzeAll(completedCodes), [completedCodes]);

  useEffect(() => {
    AuthService.checkSession().then(session => {
      if (session) {
        setUser(session);
        setCompletedCodes(new Set(session.completedCodes));
        setElectives(session.electives || []);
      }
      setIsCheckingSession(false);
    });
  }, []);

  const handleLogin = async (e: any) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;
    setLoading(true);
    const session = await AuthService.login(usernameInput);
    setUser(session);
    setCompletedCodes(new Set(session.completedCodes));
    setElectives(session.electives || []);
    setLoading(false);
  };

  const sync = async (codes: string[], currentElectives: Elective[]) => {
    if (!user) return;
    setIsSyncing(true);
    await AuthService.saveProgress(user.username, codes, currentElectives);
    setIsSyncing(false);
  };

  const toggleSubject = (code: string) => {
    const newSet = new Set(completedCodes);
    newSet.has(code) ? newSet.delete(code) : newSet.add(code);
    setCompletedCodes(newSet);
    sync(Array.from(newSet), electives);
  };

  if (isCheckingSession) return <div className="h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;

  if (!user) {
    return (
      <div className="h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
        <div className="bg-slate-800 p-8 rounded-2xl w-full max-w-sm border border-white/10 shadow-2xl">
          <div className="flex justify-center mb-6"><div className="bg-blue-500 p-4 rounded-xl"><GraduationCap size={40} /></div></div>
          <h1 className="text-xl font-bold text-center mb-6">Acesse seu Currículo</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="text" value={usernameInput} onChange={e => setUsernameInput(e.target.value)} placeholder="Matrícula ou Nome" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" />
            <button className="w-full bg-blue-600 p-3 rounded-lg font-bold hover:bg-blue-500 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin" /> : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      <header className="bg-slate-900 text-white h-14 flex items-center justify-between px-4 shadow-lg z-20">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500 p-1 rounded-lg"><GraduationCap size={18} /></div>
          <nav className="flex gap-1 bg-slate-800 p-1 rounded-lg">
             <button onClick={() => setActiveTab('board')} className={`px-3 py-1 rounded text-xs font-bold ${activeTab === 'board' ? 'bg-slate-700' : 'text-slate-400'}`}>Curso</button>
             <button onClick={() => setActiveTab('stats')} className={`px-3 py-1 rounded text-xs font-bold ${activeTab === 'stats' ? 'bg-slate-700' : 'text-slate-400'}`}>Planejador</button>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2 py-1 bg-slate-800 rounded-full border border-slate-700">
            {isSyncing ? <Cloud className="text-blue-400 animate-pulse" size={14} /> : <CloudCheck className="text-emerald-400" size={14} />}
            <span className="text-[9px] uppercase font-bold text-slate-400 hidden sm:block">{isSyncing ? 'Sincronizando' : 'Nuvem'}</span>
          </div>
          <div className="text-xs font-bold hidden sm:block">{user.username}</div>
          <button onClick={() => { AuthService.logout(); setUser(null); }} className="text-slate-500 hover:text-white"><LogOut size={18} /></button>
        </div>
      </header>
      <main className="flex-1 overflow-hidden relative">
        {activeTab === 'board' ? (
          <div className="flex h-full overflow-x-auto bg-slate-100">
            {Array.from({ length: 10 }, (_, i) => i + 1).map(p => <PhaseColumn key={p} phase={p} subjects={analysis[p] || []} onToggle={toggleSubject} />)}
          </div>
        ) : (
          <div className="h-full overflow-y-auto"><RecommendationsView analysis={analysis} completedCodesSet={completedCodes} electives={electives} /></div>
        )}
      </main>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
