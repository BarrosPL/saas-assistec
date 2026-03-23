import { Link } from "react-router-dom";
import { Plus, UserPlus, FileText, ShoppingCart } from "lucide-react";

const actions = [
  {
    name: "Nova OS",
    description: "Abrir ordem de serviço",
    icon: FileText,
    href: "/ordens/nova",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    name: "Novo Cliente",
    description: "Cadastrar cliente",
    icon: UserPlus,
    href: "/clientes/novo",
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    name: "Nova Venda",
    description: "Registrar venda",
    icon: ShoppingCart,
    href: "/vendas/nova",
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    name: "Add Produto",
    description: "Cadastrar produto",
    icon: Plus,
    href: "/estoque/novo",
    color: "text-info",
    bgColor: "bg-info/10",
  },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {actions.map((action) => (
        <Link
          key={action.name}
          to={action.href}
          className="quick-action group"
        >
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl ${action.bgColor} transition-transform group-hover:scale-110`}
          >
            <action.icon className={`h-6 w-6 ${action.color}`} />
          </div>
          <div>
            <p className="font-medium text-foreground">{action.name}</p>
            <p className="text-xs text-muted-foreground">{action.description}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
