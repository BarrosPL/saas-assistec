import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eraser } from "lucide-react";

interface PatternLockCanvasProps {
  label?: string;
  value?: string | null;
  onChange: (dataUrl: string | null) => void;
}

export function PatternLockCanvas({ label = "Desenhe o Padrão", value, onChange }: PatternLockCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const drawDots = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = "#94a3b8"; // slate-400
    const padding = 30;
    const spacingX = (width - padding * 2) / 2;
    const spacingY = (height - padding * 2) / 2;

    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        ctx.beginPath();
        ctx.arc(padding + j * spacingX, padding + i * spacingY, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#3b82f6";

    // Only draw base if not loading an existing value, or draw existing value
    if (value && value.startsWith("data:image")) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasDrawn(true);
      };
      img.src = value;
    } else {
      drawDots(ctx, rect.width, rect.height);
    }
  }, [value]); // Re-run if value is externally cleared

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const endDraw = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas && hasDrawn) {
      onChange(canvas.toDataURL("image/png"));
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    drawDots(ctx, rect.width, rect.height);
    setHasDrawn(false);
    onChange("");
  };

  return (
    <div className="space-y-2 mt-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        {hasDrawn && (
          <Button type="button" variant="ghost" size="sm" onClick={clear} className="gap-1 h-6 text-xs px-2">
            <Eraser className="h-3 w-3" /> Limpar Padrão
          </Button>
        )}
      </div>
      <canvas
        ref={canvasRef}
        className="w-full h-32 border rounded-md bg-muted/30 cursor-crosshair touch-none"
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
      />
    </div>
  );
}
