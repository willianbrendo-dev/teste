import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  label: string;
  value: string;
  color?: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  emptyText?: string;
  className?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Selecione categorias...",
  emptyText = "Nenhuma categoria encontrada",
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const handleSelect = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const handleRemove = (value: string) => {
    onChange(selected.filter((item) => item !== value));
  };

  const selectedOptions = options.filter((option) => selected.includes(option.value));

  return (
    <div className={cn("w-full", className)}>
      <Command className="overflow-visible bg-transparent">
        <div
          className="group min-h-[44px] rounded-md border border-input px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
          onClick={() => setOpen(true)}
        >
          <div className="flex flex-wrap gap-1">
            {selectedOptions.map((option) => (
              <Badge
                key={option.value}
                variant="secondary"
                className="rounded-sm px-2 py-1 font-normal"
                style={option.color ? { backgroundColor: option.color + "20", color: option.color } : undefined}
              >
                {option.label}
                <button
                  className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRemove(option.value);
                  }}
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
              </Badge>
            ))}
            {selectedOptions.length === 0 && (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
        </div>
        {open && (
          <div className="relative mt-2">
            <div className="absolute top-0 z-10 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
              <CommandInput
                placeholder="Buscar categoria..."
                value={search}
                onValueChange={setSearch}
              />
              <CommandList>
                <CommandEmpty>{emptyText}</CommandEmpty>
                <CommandGroup className="max-h-64 overflow-auto">
                  {options
                    .filter((option) =>
                      option.label.toLowerCase().includes(search.toLowerCase())
                    )
                    .map((option) => {
                      const isSelected = selected.includes(option.value);
                      return (
                        <CommandItem
                          key={option.value}
                          onSelect={() => handleSelect(option.value)}
                          className="cursor-pointer"
                        >
                          <div
                            className={cn(
                              "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                              isSelected
                                ? "bg-primary text-primary-foreground"
                                : "opacity-50 [&_svg]:invisible"
                            )}
                          >
                            <X className="h-3 w-3" />
                          </div>
                          <div className="flex items-center gap-2">
                            {option.color && (
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: option.color }}
                              />
                            )}
                            <span>{option.label}</span>
                          </div>
                        </CommandItem>
                      );
                    })}
                </CommandGroup>
              </CommandList>
              <div className="p-2 border-t">
                <button
                  type="button"
                  className="w-full text-sm text-center text-muted-foreground hover:text-foreground"
                  onClick={() => setOpen(false)}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </Command>
      {open && (
        <div
          className="fixed inset-0 z-[5]"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}
