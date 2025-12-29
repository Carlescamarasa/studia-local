import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/features/shared/components/ui/button';
import { Pencil, ArrowRight, Circle, Square, Type, Undo, Redo, Save, X } from 'lucide-react';
import { componentStyles } from '@/design/componentStyles';

const TOOLS = {
  PEN: 'pen',
  ARROW: 'arrow',
  CIRCLE: 'circle',
  RECT: 'rect',
  TEXT: 'text',
};

const COLORS = [
  { value: '#ef4444', label: 'Rojo' },
  { value: '#3b82f6', label: 'Azul' },
  { value: '#eab308', label: 'Amarillo' },
  { value: '#000000', label: 'Negro' },
];

export default function ScreenshotEditor({ imageUrl, onSave, onCancel }) {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState(TOOLS.PEN);
  const [color, setColor] = useState(COLORS[0].value);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [textInput, setTextInput] = useState('');
  const [textPos, setTextPos] = useState(null);
  const imageRef = useRef(null);
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  
  useEffect(() => {
    historyRef.current = history;
  }, [history]);
  
  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const maxWidth = 1200;
      const maxHeight = 800;
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = width * ratio;
        height = height * ratio;
      }
      
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      imageRef.current = img;
      const imageData = canvas.toDataURL();
      setHistory([imageData]);
      setHistoryIndex(0);
      historyRef.current = [imageData];
      historyIndexRef.current = 0;
    };
    
    img.src = imageUrl;
  }, [imageUrl]);

  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const imageData = canvas.toDataURL();
    const currentIndex = historyIndexRef.current;
    setHistory(prev => {
      const newHistory = prev.slice(0, currentIndex + 1);
      newHistory.push(imageData);
      const newIndex = newHistory.length - 1;
      setHistoryIndex(newIndex);
      historyIndexRef.current = newIndex;
      historyRef.current = newHistory;
      return newHistory;
    });
  }, []);

  const restoreFromHistory = useCallback((index) => {
    const currentHistory = historyRef.current;
    if (index < 0 || index >= currentHistory.length) return;
    
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) return;
    
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setHistoryIndex(index);
      historyIndexRef.current = index;
    };
    img.src = currentHistory[index];
  }, []);

  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const draw = useCallback((start, end) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (tool) {
      case TOOLS.PEN:
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        break;
        
      case TOOLS.ARROW:
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const angle = Math.atan2(dy, dx);
        const headlen = 15;
        
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.lineTo(end.x - headlen * Math.cos(angle - Math.PI / 6), end.y - headlen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - headlen * Math.cos(angle + Math.PI / 6), end.y - headlen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
        break;
        
      case TOOLS.CIRCLE:
        const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
        ctx.beginPath();
        ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
        break;
        
      case TOOLS.RECT:
        ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
        break;
        
      default:
        break;
    }
  }, [tool, color]);

  const handleMouseDown = (e) => {
    if (tool === TOOLS.TEXT) {
      const pos = getMousePos(e);
      if (pos) {
        setTextPos(pos);
      }
      return;
    }

    const pos = getMousePos(e);
    if (!pos) return;
    
    setIsDrawing(true);
    setStartPos(pos);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !startPos || tool === TOOLS.TEXT) return;
    
    const currentPos = getMousePos(e);
    if (!currentPos) return;

    if (tool === TOOLS.PEN) {
      draw(startPos, currentPos);
      setStartPos(currentPos);
    } else {
      const canvas = canvasRef.current;
      if (!canvas || !imageRef.current) return;
      
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const currentHistory = historyRef.current;
        const currentIndex = historyIndexRef.current;
        if (currentIndex >= 0 && currentHistory[currentIndex]) {
          const historyImg = new Image();
          historyImg.onload = () => {
            ctx.drawImage(historyImg, 0, 0);
            draw(startPos, currentPos);
          };
          historyImg.src = currentHistory[currentIndex];
        } else {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          draw(startPos, currentPos);
        }
      };
      img.src = imageRef.current.src;
    }
  };

  const handleMouseUp = (e) => {
    if (!isDrawing || !startPos || tool === TOOLS.TEXT) {
      setIsDrawing(false);
      return;
    }
    
    const endPos = getMousePos(e);
    if (endPos && tool !== TOOLS.PEN) {
      const canvas = canvasRef.current;
      if (!canvas || !imageRef.current) return;
      
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const currentHistory = historyRef.current;
      const currentIndex = historyIndexRef.current;
      
      if (currentIndex >= 0 && currentHistory[currentIndex]) {
        const historyImg = new Image();
        historyImg.onload = () => {
          ctx.drawImage(historyImg, 0, 0);
          draw(startPos, endPos);
          saveToHistory();
        };
        historyImg.src = currentHistory[currentIndex];
      } else {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          draw(startPos, endPos);
          saveToHistory();
        };
        img.src = imageRef.current.src;
      }
    } else if (tool === TOOLS.PEN) {
      saveToHistory();
    }
    
    setIsDrawing(false);
    setStartPos(null);
  };

  const handleTextSubmit = () => {
    if (!textInput || !textPos) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.font = '20px Arial';
    ctx.fillText(textInput, textPos.x, textPos.y);
    setTextInput('');
    setTextPos(null);
    saveToHistory();
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      restoreFromHistory(historyIndex - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      restoreFromHistory(historyIndex + 1);
    }
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.toBlob((blob) => {
      if (blob && onSave) {
        const url = URL.createObjectURL(blob);
        onSave({ blob, url });
      }
    }, 'image/png', 0.9);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center border-b pb-4">
        <div className="flex gap-1 border-r pr-2">
          <Button
            type="button"
            variant={tool === TOOLS.PEN ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTool(TOOLS.PEN)}
            className="gap-2"
          >
            <Pencil className="w-4 h-4" />
            Pincel
          </Button>
          <Button
            type="button"
            variant={tool === TOOLS.ARROW ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTool(TOOLS.ARROW)}
            className="gap-2"
          >
            <ArrowRight className="w-4 h-4" />
            Flecha
          </Button>
          <Button
            type="button"
            variant={tool === TOOLS.CIRCLE ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTool(TOOLS.CIRCLE)}
            className="gap-2"
          >
            <Circle className="w-4 h-4" />
            Círculo
          </Button>
          <Button
            type="button"
            variant={tool === TOOLS.RECT ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTool(TOOLS.RECT)}
            className="gap-2"
          >
            <Square className="w-4 h-4" />
            Rectángulo
          </Button>
          <Button
            type="button"
            variant={tool === TOOLS.TEXT ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTool(TOOLS.TEXT)}
            className="gap-2"
          >
            <Type className="w-4 h-4" />
            Texto
          </Button>
        </div>
        
        <div className="flex gap-1 border-r pr-2">
          {COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setColor(c.value)}
              className={`w-8 h-8 rounded border-2 ${
                color === c.value ? 'border-[var(--color-primary)] scale-110' : 'border-gray-300'
              }`}
              style={{ backgroundColor: c.value }}
              title={c.label}
            />
          ))}
        </div>
        
        <div className="flex gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="gap-2"
          >
            <Undo className="w-4 h-4" />
            Deshacer
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="gap-2"
          >
            <Redo className="w-4 h-4" />
            Rehacer
          </Button>
        </div>
      </div>

      <div className="relative border rounded-lg overflow-auto max-h-[60vh] bg-[var(--color-surface-muted)] flex justify-center">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={(e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
              clientX: touch.clientX,
              clientY: touch.clientY,
            });
            handleMouseDown(mouseEvent);
          }}
          onTouchMove={(e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
              clientX: touch.clientX,
              clientY: touch.clientY,
            });
            handleMouseMove(mouseEvent);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            handleMouseUp(e);
          }}
          className="max-w-full h-auto cursor-crosshair"
          style={{ touchAction: 'none' }}
        />
      </div>

      {textPos && (
        <div className="flex gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleTextSubmit();
              } else if (e.key === 'Escape') {
                setTextPos(null);
                setTextInput('');
              }
            }}
            placeholder="Escribe texto y presiona Enter"
            className="flex-1 px-3 py-2 border rounded ctrl-field"
            autoFocus
          />
          <Button type="button" onClick={handleTextSubmit} size="sm">
            Añadir
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setTextPos(null);
              setTextInput('');
            }}
            size="sm"
          >
            Cancelar
          </Button>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className={componentStyles.buttons.outline}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          className={`${componentStyles.buttons.primary} gap-2`}
        >
          <Save className="w-4 h-4" />
          Guardar edición
        </Button>
      </div>
    </div>
  );
}

