import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, X, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  cpf: string | null;
}

interface CustomerSearchProps {
  selectedCustomer: Customer | null;
  onSelect: (customer: Customer | null) => void;
}

export function CustomerSearch({ selectedCustomer, onSelect }: CustomerSearchProps) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length < 2 || !user) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase
        .from("customers")
        .select("id, name, phone, email, cpf")
        .eq("user_id", user.id)
        .or(`name.ilike.%${query}%,phone.ilike.%${query}%,cpf.ilike.%${query}%`)
        .limit(5);

      setResults(data || []);
      setIsOpen(true);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, user]);

  if (selectedCustomer) {
    return (
      <div className="space-y-2">
        <Label>Cliente</Label>
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-accent/30 p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{selectedCustomer.name}</p>
            <p className="text-xs text-muted-foreground">{selectedCustomer.phone}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => onSelect(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 relative">
      <Label>Cliente</Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, telefone ou CPF..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          className="pl-10"
        />
      </div>
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full rounded-lg border bg-popover shadow-lg mt-1">
          {results.map((customer) => (
            <button
              key={customer.id}
              type="button"
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors first:rounded-t-lg last:rounded-b-lg"
              onMouseDown={() => {
                onSelect(customer);
                setQuery("");
                setIsOpen(false);
              }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <User className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">{customer.name}</p>
                <p className="text-xs text-muted-foreground">{customer.phone}</p>
              </div>
            </button>
          ))}
        </div>
      )}
      {isOpen && query.length >= 2 && results.length === 0 && !loading && (
        <div className="absolute z-50 w-full rounded-lg border bg-popover p-3 shadow-lg mt-1">
          <p className="text-sm text-muted-foreground text-center">Nenhum cliente encontrado</p>
        </div>
      )}
    </div>
  );
}
