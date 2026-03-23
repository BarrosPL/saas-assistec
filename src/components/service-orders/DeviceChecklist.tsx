import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Smartphone } from "lucide-react";

const checklistItems = [
  { key: "screen_ok", label: "Tela sem trincas/riscos" },
  { key: "touch_ok", label: "Touch funcionando" },
  { key: "buttons_ok", label: "Botões funcionando" },
  { key: "camera_ok", label: "Câmera funcionando" },
  { key: "speaker_ok", label: "Alto-falante funcionando" },
  { key: "mic_ok", label: "Microfone funcionando" },
  { key: "charging_ok", label: "Carregamento funcionando" },
  { key: "battery_ok", label: "Bateria em bom estado" },
  { key: "wifi_ok", label: "Wi-Fi funcionando" },
  { key: "bluetooth_ok", label: "Bluetooth funcionando" },
  { key: "biometric_ok", label: "Biometria funcionando" },
  { key: "has_cover", label: "Possui capa/película" },
];

interface DeviceChecklistProps {
  condition: Record<string, boolean>;
  onChange: (condition: Record<string, boolean>) => void;
}

export function DeviceChecklist({ condition, onChange }: DeviceChecklistProps) {
  const handleToggle = (key: string) => {
    onChange({ ...condition, [key]: !condition[key] });
  };

  const checkedCount = Object.values(condition).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Checklist do Aparelho</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          {checkedCount}/{checklistItems.length} itens OK
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {checklistItems.map((item) => (
          <label
            key={item.key}
            className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all hover:border-primary/40 ${
              condition[item.key]
                ? "border-success/40 bg-success/5"
                : "border-border bg-card"
            }`}
          >
            <Checkbox
              checked={condition[item.key] || false}
              onCheckedChange={() => handleToggle(item.key)}
            />
            <span className="text-sm select-none">{item.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
