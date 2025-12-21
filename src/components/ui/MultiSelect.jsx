import React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Filter, Check } from "lucide-react";

export default function MultiSelect({ label, items, value = [], onChange, icon: Icon = Filter }) {
  const [open, setOpen] = React.useState(false);

  const toggleItem = (itemValue) => {
    const newValue = value.includes(itemValue)
      ? value.filter(v => v !== itemValue)
      : [...value, itemValue];
    onChange(newValue);
  };

  // Obtener los labels de los items seleccionados
  const selectedLabels = React.useMemo(() => {
    if (value.length === 0) return [];
    return value
      .map(v => items.find(item => item.value === v)?.label)
      .filter(Boolean);
  }, [value, items]);

  // Formatear el texto del botón
  const buttonText = React.useMemo(() => {
    if (value.length === 0) {
      return label;
    }

    // En mobile, mostrar hasta 2 labels, luego "+X más" si hay más
    if (selectedLabels.length <= 2) {
      return `${label} (${selectedLabels.join(', ')})`;
    } else {
      const remaining = selectedLabels.length - 2;
      return `${label} (${selectedLabels.slice(0, 2).join(', ')} +${remaining} más)`;
    }
  }, [label, selectedLabels, value.length]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs h-9 rounded-xl focus-brand justify-start text-left min-w-0 max-w-[200px] sm:max-w-[260px] md:max-w-[360px]">
          <Icon className="w-4 h-4 mr-2 shrink-0" />
          <span className="truncate min-w-0 flex-1">
            {buttonText}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0 z-[280]" align="start">
        <Command>
          <CommandInput
            placeholder={`Buscar ${label.toLowerCase()}...`}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            data-lt-active="false"
            data-gramm="false"
            data-form-type="other"
          />
          <CommandList>
            <CommandEmpty>Sin resultados</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {items.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Sin opciones disponibles
                </div>
              ) : (
                items.map((item) => {
                  const isSelected = value.includes(item.value);
                  // cmdk requiere que el value sea un string
                  const itemValue = String(item.value);
                  return (
                    <CommandItem
                      key={item.value}
                      value={itemValue}
                      onSelect={(selectedValue) => {
                        // selectedValue viene como string de cmdk, pero necesitamos el valor original
                        toggleItem(item.value);
                      }}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <div className={`w-4 h-4 border-2 rounded flex items-center justify-center shrink-0 ${isSelected ? 'bg-[var(--color-accent)] border-[var(--color-accent)]' : 'border-[var(--color-border-default)]'
                          }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className="text-sm leading-tight">{item.label}</span>
                      </div>
                    </CommandItem>
                  );
                })
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}