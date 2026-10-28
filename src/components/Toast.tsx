import { createContext, ReactNode, useCallback, useContext, useState } from 'react';

type Kind = 'success' | 'error';
const Ctx = createContext<(msg: string, kind?: Kind) => void>(() => undefined);
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; msg: string; kind: Kind }[]>([]);
  const push = useCallback((msg: string, kind: Kind = 'success') => {
    const id = Date.now() + Math.random();
    setItems((i) => [...i, { id, msg, kind }]);
    setTimeout(() => setItems((i) => i.filter((x) => x.id !== id)), 3500);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} role="status"
            className={`rounded-xl px-4 py-3 text-sm text-white shadow-lg ${t.kind === 'error' ? 'bg-red-600' : 'bg-neutral-900 ring-1 ring-white/10'}`}>
            {t.msg}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
