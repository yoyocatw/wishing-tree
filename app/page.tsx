'use client';

import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

interface Wish {
  id?: number;
  message: string;
  author: string;
  color: string;
  grid_row: number;
  grid_col: number;
  [key: string]: any;
}

interface Slot {
  row: number;
  col: number;
}


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

const COLOR_MAP = {
  red: "text-red-500 drop-shadow-xl drop-shadow-red-500",
  yellow: "text-yellow-300 drop-shadow-xl drop-shadow-yellow-300",
  blue: "text-sky-400 drop-shadow-xl drop-shadow-sky-400",
  green: "text-emerald-400 drop-shadow-xl drop-shadow-emerald-400",
  purple: "text-purple-400 drop-shadow-xl drop-shadow-purple-400",
  pink: "text-pink-400 drop-shadow-xl drop-shadow-pink-400",
  orange: "text-orange-400 drop-shadow-xl drop-shadow-orange-400",
  emerald: "text-emerald-400 drop-shadow-xl drop-shadow-emerald-400",
  rose: "text-rose-400 drop-shadow-xl drop-shadow-rose-400",
  teal: "text-teal-400 drop-shadow-xl drop-shadow-teal-400",
  fuchsia: "text-fuchsia-300 drop-shadow-xl drop-shadow-fuchsia-300",
};

const COLOR_KEYS = Object.keys(COLOR_MAP) as (keyof typeof COLOR_MAP)[];
const TREE_SIZE = 40; 

export default function FiniteTree() {
  const [fulfilledSlots, setFulfilledSlots] = useState<Record<string, Wish>>({});
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [newMessage, setNewMessage] = useState<string>("");
  const [newAuthor, setNewAuthor] = useState<string>("");
  const [viewingWish, setViewingWish] = useState<Wish | null>(null);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchWishes();
    const channel = supabase
      .channel('realtime-wishes-grid')
      .on(
        'postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'wishes' }, 
        (payload) => {
          const newWish = payload.new as Wish;
          setFulfilledSlots(prev => ({
            ...prev,
            [`${newWish.grid_row}-${newWish.grid_col}`]: newWish
          }));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchWishes() {
    const { data } = await supabase.from('wishes').select('*');
    if (data) {
      const slotMap: Record<string, Wish> = {};
      data.forEach((wish: any) => { 
        slotMap[`${wish.grid_row}-${wish.grid_col}`] = wish as Wish; 
      });
      setFulfilledSlots(slotMap);
    }
  }

  const centerTree = () => {
    if (scrollContainerRef.current) {
        const { scrollWidth, clientWidth } = scrollContainerRef.current;
        scrollContainerRef.current.scrollLeft = (scrollWidth - clientWidth) / 2;
    }
  };

  useLayoutEffect(() => {
    centerTree();
    setTimeout(centerTree, 50);
  }, []);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;

    const randomColorKey = COLOR_KEYS[Math.floor(Math.random() * COLOR_KEYS.length)];
    const newWish: Wish = {
      message: newMessage,
      author: newAuthor || "Anonymous",
      color: randomColorKey,
      grid_row: selectedSlot.row,
      grid_col: selectedSlot.col,
    };

    setFulfilledSlots(prev => ({ ...prev, [`${selectedSlot.row}-${selectedSlot.col}`]: newWish }));
    setSelectedSlot(null);
    setNewMessage("");
    setNewAuthor("");

    await supabase.from('wishes').insert([newWish]);
  };

  const renderTreeRows = () => {
    let rows = [];

    for (let r = 1; r < TREE_SIZE; r++) {
      let slotsInRow = [];
      
      const slotsCount = (r * 2) - 1; 
      const startCol = -Math.floor(slotsCount / 2);

      for (let i = 0; i < slotsCount; i++) {
        const c = startCol + i;
        const slotKey = `${r}-${c}`;
        const fulfilledWish = fulfilledSlots[slotKey];
        
        const baseClass = "mx-0.5 text-2xl sm:text-3xl leading-none cursor-pointer transition select-none";

        if (fulfilledWish) {
          let colorClass = COLOR_MAP[fulfilledWish.color as keyof typeof COLOR_MAP] || COLOR_MAP.green;
          
          if (!COLOR_MAP[fulfilledWish.color as keyof typeof COLOR_MAP]) {
             if (fulfilledWish.color.includes('red')) colorClass = COLOR_MAP.red;
             else if (fulfilledWish.color.includes('yellow')) colorClass = COLOR_MAP.yellow;
             else if (fulfilledWish.color.includes('blue')) colorClass = COLOR_MAP.blue;
             else colorClass = COLOR_MAP.green;
          }

          slotsInRow.push(
            <div
              key={slotKey}
              className="relative group inline-block z-10 hover:scale-125 transition-transform"
              onClick={() => setViewingWish(fulfilledWish)} 
            >
              <span className={`${baseClass} ${colorClass} font-bold animate-pulse`}>*</span>
            </div>
          );
        } else {
          slotsInRow.push(
            <button
              key={slotKey}
              onClick={() => setSelectedSlot({ row: r, col: c })}
              className={`${baseClass} text-white/40 hover:text-white hover:scale-125 transition-transform`}
            >
              *
            </button>
          );
        }
      }
      rows.push(<div key={r} className="flex justify-center whitespace-nowrap">{slotsInRow}</div>);
    }
    return rows;
  };

  return (
    <div 
        ref={scrollContainerRef} 
        className="h-screen w-full bg-gray-950 font-mono text-white overflow-x-auto overflow-y-scroll"
    >
      <div className="min-w-max pb-20">
          
          <header className="sticky left-0 right-0 top-0 z-20 p-4 text-center bg-gray-950/80 backdrop-blur-md border-b border-white/5 w-screen max-w-full">
            <h1 className="text-xl font-bold tracking-tight text-green-400 uppercase drop-shadow-lg">
              THE WISHING TREE
            </h1>
            <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest">
              Tap a star to make a wish
            </p>
          </header>

          <main className="pt-8 flex flex-col items-center">
            <div className="mt-4">
              {renderTreeRows()}
            </div>
            
          </main>
      </div>

      {selectedSlot && (
        <div className="fixed inset-0 bg-black flex items-center justify-center z-60 p-4 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="bg-gray-900 text-white p-6 rounded max-w-sm w-full shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button type="button" onClick={() => setSelectedSlot(null)} className="absolute cursor-pointer top-4 right-4 text-gray-500 hover:text-white p-2">✕</button>
            <h2 className="text-lg font-bold mb-6 text-center text-green-400 uppercase tracking-widest">Make a Wish</h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 uppercase block mb-1 tracking-wider">From</label>
                <input 
                  className="w-full bg-black border border-gray-800 p-3 text-sm focus:outline-none focus:border-green-500 transition-colors text-center text-green-100 placeholder-gray-700" 
                  placeholder="Anonymous" 
                  value={newAuthor} 
                  onChange={e => setNewAuthor(e.target.value)} 
                  maxLength={30} 
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase block mb-1 tracking-wider">Message</label>
                <textarea 
                  required 
                  className="w-full bg-black border border-gray-800 p-3 text-sm focus:outline-none focus:border-green-500 transition-colors min-h-[100px] text-green-100 placeholder-gray-700 resize-none" 
                  placeholder="Write your blessing..." 
                  value={newMessage} 
                  onChange={e => setNewMessage(e.target.value)} 
                  maxLength={150} 
                />
              </div>
            </div>

            <button type="submit" className="w-full cursor-pointer mt-6 py-3 bg-transparent border border-green-500 text-green-400 font-bold uppercase tracking-widest hover:bg-green-500 hover:text-black transition-all duration-300 text-sm rounded">Hang Wish</button>
          </form>
        </div>
      )}

      {viewingWish && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-70 p-4 backdrop-blur-sm" onClick={() => setViewingWish(null)}>
          <div className="bg-gray-900 border border-white/10 text-white p-8 max-w-sm w-full shadow-2xl relative animate-in zoom-in-95 duration-200 text-center rounded" onClick={(e) => e.stopPropagation()}>

            <button type="button" onClick={() => setViewingWish(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white p-2">✕</button>

            <div className="mb-4">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest block mb-2">Wish from</span>
              <h3 className="text-xl font-bold text-transparent bg-clip-text bg-linear-to-r from-yellow-100 to-yellow-500">
                {viewingWish.author}
              </h3>
            </div>

            <hr className="border-gray-700 mb-6" />

            <p className="text-lg text-gray-200 italic font-serif leading-relaxed">
              "{viewingWish.message}"
            </p>

            <div className="mt-8 text-[10px] text-gray-600 uppercase tracking-widest">
              Tap outside to close
            </div>
          </div>
        </div>
      )}

    </div>
  );
}