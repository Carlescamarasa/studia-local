import React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Filter, Check } from "lucide-react";

export default function MultiSelect({ label, items, value = [], onChange }) {
  const [open, setOpen] = React.useState(false);

  const toggleItem = (itemValue) => {
    const newValue = value.includes(itemValue)
      ? value.filter(v => v !== itemValue)
      : [...value, itemValue];
    onChange(newValue);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="hover:shadow-sm h-10">
          <Filter className="w-4 h-4 mr-2" />
          <span className="hidden md:inline">{label}:</span>
          <span className="ml-1">
            {value.length === 0 ? 'Todos' : `${value.length}`}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
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
          <CommandEmpty>Sin resultados</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {items.map((item) => {
              const isSelected = value.includes(item.value);
              return (
                <CommandItem
                  key={item.value}
                  onSelect={() => toggleItem(item.value)}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                      isSelected ? 'bg-[var(--color-accent)] border-[var(--color-accent)]' : 'border-[var(--color-border-default)]'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="truncate">{item.label}</span>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}