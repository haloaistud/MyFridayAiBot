import React, { useEffect, useState } from 'react';
import { X, Trash2, Database, Search, Heart, Sparkles } from 'lucide-react';
import { memoryService } from '../services/memory';
import { MemoryNode } from '../types';

interface MemoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const MemoryPanel: React.FC<MemoryPanelProps> = ({ isOpen, onClose }) => {
  const [memories, setMemories] = useState<MemoryNode[]>([]);
  const [search, setSearch] = useState('');

  const refresh = () => {
    setMemories(memoryService.fuzzyFilter(search));
  };

  useEffect(() => {
    if (isOpen) refresh();
  }, [isOpen, search]);

  const handleDelete = (id: string) => {
    memoryService.deleteMemory(id);
    refresh();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 left-0 w-full md:w-[420px] bg-stone-900/98 backdrop-blur-3xl border-r border-stone-800 shadow-2xl z-50 flex flex-col transition-transform duration-500 ease-out">
      <div className="p-7 border-b border-stone-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
            <Heart className="text-indigo-400" size={18} fill="currentColor" />
          </div>
          <div>
            <h2 className="text-stone-100 font-semibold tracking-tight text-lg">Emotional Growth</h2>
            <p className="text-[10px] text-stone-500 font-mono tracking-widest">LIFE CONTINUITY GRAPH</p>
          </div>
        </div>
        <button onClick={onClose} className="text-stone-500 hover:text-white p-2 hover:bg-stone-800 rounded-full transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="p-5 bg-stone-950/20">
         <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-600 group-focus-within:text-indigo-400 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Search our history..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-stone-900 border border-stone-800 rounded-2xl pl-11 pr-4 py-3 text-sm text-stone-200 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-stone-700"
            />
         </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
        {memories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-stone-700 opacity-40 space-y-3">
             <Database size={32} strokeWidth={1.5} />
             <p className="text-sm italic">Our story is just beginning.</p>
          </div>
        ) : (
          memories.map(node => (
            <div key={node.id} className="group bg-stone-800/30 border border-stone-700/50 rounded-2xl p-5 hover:border-indigo-500/30 hover:bg-stone-800/60 transition-all duration-300">
              <div className="flex justify-between items-start">
                 <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                       <span className="font-bold text-stone-100 text-sm tracking-tight">{node.entity}</span>
                       <span className="text-[9px] bg-stone-900 text-stone-500 px-2 py-0.5 rounded-full uppercase font-mono border border-stone-800">{node.relation}</span>
                    </div>
                    <p className="text-indigo-200 text-sm font-medium leading-relaxed">{node.value}</p>
                 </div>
                 <button 
                   onClick={() => handleDelete(node.id)}
                   className="opacity-0 group-hover:opacity-100 text-stone-600 hover:text-rose-400 p-2 transition-all"
                 >
                   <Trash2 size={14} />
                 </button>
              </div>
              <div className="mt-4 pt-4 border-t border-stone-700/40 flex justify-between items-center text-[10px] text-stone-600 font-mono">
                 <span className="flex items-center gap-2">
                    <Sparkles size={10} className={node.confidence > 0.8 ? 'text-emerald-500' : 'text-amber-500'} />
                    INTEGRATION: {Math.round(node.confidence * 100)}%
                 </span>
                 <span>REC: {new Date(node.timestamp).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MemoryPanel;