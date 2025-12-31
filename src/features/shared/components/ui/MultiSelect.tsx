import React from "react";
import { Button } from "@/features/shared/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/features/shared/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/features/shared/components/ui/command";
import { Filter, Check, LucideIcon } from "lucide-react";

interface MultiSelectProps {
  label: string;
  items: { value: string; label: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  icon?: LucideIcon;
  placeholder?: string;
}

export default function MultiSelect({ label, items, value = [], onChange, icon: Icon = Filter, placeholder }: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const toggleItem = (itemValue: string) => {
    const newValue = value.includes(itemValue)
      ? value.filter(v => v !== itemValue)
      : [...value, itemValue];
    onChange(newValue);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-10 rounded-xl focus-brand justify-start text-left min-w-0 gap-2"
        >
          <Icon className="w-4 h-4 shrink-0" />
          <span className="truncate">{label}</span>
          {value.length > 0 && (
            <span className="ml-auto flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-semibold rounded-full bg-[var(--color-primary)] text-white shrink-0">
              {value.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0 z-[280]" align="start">
        <Command>
          <CommandInput
            placeholder={placeholder || `Buscar ${label.toLowerCase()}...`}
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