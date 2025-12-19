import React, { useState, useMemo, useEffect } from 'react';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ds";
import {
    Search,
    Star,
    ChevronDown,
    ChevronUp,
    Palette,
    PaintBucket,
    Type,
    Box,
    LayoutTemplate,
    Grid,
    Accessibility,
    Eye,
    EyeOff
} from "lucide-react";
import { DESIGN_CONTROLS, SECTIONS } from "@/data/designControlsMap";

// Helper to get nested value
const getNestedValue = (obj, path, defaultValue) => {
    return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined) ? acc[part] : undefined, obj) ?? defaultValue;
};

// Icons map
const ICONS = {
    Palette,
    PaintBucket,
    Type,
    Box,
    LayoutTemplate,
    Grid,
    Accessibility
};

function ControlInput({ control, value, onChange, className }) {
    if (control.type === 'switch') {
        return (
            <Switch
                checked={!!value}
                onCheckedChange={onChange}
            />
        );
    }

    if (control.type === 'select') {
        return (
            <Select value={String(value)} onValueChange={onChange}>
                <SelectTrigger className={`w-48 ${className}`}>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {control.options?.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        );
    }

    if (control.type === 'color') {
        return (
            <div className="flex items-center gap-2">
                <Input
                    type="color"
                    value={value || '#000000'}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-12 h-9 p-1 cursor-pointer"
                />
                <Input
                    type="text"
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    className={`w-32 font-mono text-xs ${className}`}
                />
            </div>
        );
    }

    if (control.type === 'number') {
        return (
            <Input
                type="number"
                min={control.min}
                max={control.max}
                step={control.step || 1}
                value={value}
                onChange={(e) => {
                    const val = control.step ? parseFloat(e.target.value) : parseInt(e.target.value);
                    onChange(isNaN(val) ? 0 : val);
                }}
                className={`w-32 ${className}`}
            />
        );
    }

    // Default text
    return (
        <Input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={`w-48 ${className}`}
        />
    );
}

function ControlRow({ control, value, onChange, isFavorite, onToggleFavorite, componentStyles }) {
    return (
        <div className="flex items-start justify-between gap-4 py-3 border-b border-[var(--color-border-default)] last:border-0 hover:bg-[var(--color-surface-muted)]/30 px-2 -mx-2 rounded-lg transition-colors group">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <Label className="text-sm text-[var(--color-text-primary)] font-medium cursor-pointer" title={control.id}>
                        {control.label}
                    </Label>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onToggleFavorite(control.id)}
                        className={`h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity ${isFavorite ? 'opacity-100 text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-yellow-500'}`}
                        title={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
                    >
                        <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
                    </Button>
                    {control.level === 'advanced' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] border border-[var(--color-border-muted)]">
                            Adv
                        </span>
                    )}
                </div>
                <div className="text-xs text-[var(--color-text-secondary)] mt-0.5 pr-4">
                    {control.description}
                    <span className="ml-1 opacity-50 font-mono text-[10px]">({control.id})</span>
                </div>
            </div>
            <div className="shrink-0 pt-0.5">
                <ControlInput
                    control={control}
                    value={value}
                    onChange={onChange}
                    className={componentStyles?.controls?.inputDefault || ''}
                />
            </div>
        </div>
    );
}

export function DesignControls({ design, setDesignPartial, componentStyles }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [favorites, setFavorites] = useState([]);
    // Load favorites on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem('studia_design_favorites');
            if (saved) setFavorites(JSON.parse(saved));
        } catch (e) { console.error('Error loading favorites', e); }
    }, []);

    // Save favorites on change
    const toggleFavorite = (id) => {
        const newFavs = favorites.includes(id)
            ? favorites.filter(f => f !== id)
            : [...favorites, id];
        setFavorites(newFavs);
        localStorage.setItem('studia_design_favorites', JSON.stringify(newFavs));
    };

    // Filter controls
    const filteredControls = useMemo(() => {
        let matches = DESIGN_CONTROLS;

        // 1. Text Search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            matches = matches.filter(c =>
                c.label.toLowerCase().includes(q) ||
                c.id.toLowerCase().includes(q) ||
                c.description.toLowerCase().includes(q) ||
                c.keywords?.some(k => k.toLowerCase().includes(q))
            );
        }

        // 2. Level Filter (unless searching, then show all matches)
        if (!showAdvanced && !searchQuery) {
            matches = matches.filter(c => c.level === 'basic');
        }

        return matches;
    }, [searchQuery, showAdvanced]);

    // Group controls by section
    const groupedControls = useMemo(() => {
        const groups = {};

        // Initialize groups from SECTIONS
        SECTIONS.forEach(s => groups[s.id] = { meta: s, items: [] });
        // Add implicit "Other" if needed, but we try to map everything

        filteredControls.forEach(control => {
            if (groups[control.section]) {
                groups[control.section].items.push(control);
            }
        });

        return groups;
    }, [filteredControls]);

    const activeSections = useMemo(() => {
        if (searchQuery) return SECTIONS.map(s => s.id); // Open all when searching
        return ['brand', 'theme-colors']; // Defaults
    }, [searchQuery]);

    const favoriteControls = useMemo(() => {
        return DESIGN_CONTROLS.filter(c => favorites.includes(c.id));
    }, [favorites]);

    return (
        <div className="space-y-6">
            {/* Top Bar: Search and Toggles */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div className="relative flex-1 w-full md:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                    <Input
                        placeholder="Buscar control (ej: radio, color, sidebar...)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`pl-9 ${componentStyles?.controls?.inputDefault}`}
                    />
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <Label className="text-sm cursor-pointer flex items-center gap-2 select-none">
                        <span className={showAdvanced ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]"}>
                            Mostrar avanzados
                        </span>
                        <Switch checked={showAdvanced} onCheckedChange={setShowAdvanced} />
                    </Label>
                </div>
            </div>

            {/* Favorites Section */}
            {favoriteControls.length > 0 && !searchQuery && (
                <div className="mb-6 p-4 rounded-xl bg-[var(--color-surface-muted)] border border-[var(--color-border-default)]">
                    <div className="flex items-center gap-2 mb-3 text-yellow-600 dark:text-yellow-500 font-medium text-sm">
                        <Star className="w-4 h-4 fill-current" />
                        Tus Favoritos
                    </div>
                    <div className="space-y-1">
                        {favoriteControls.map(control => (
                            <ControlRow
                                key={control.id}
                                control={control}
                                value={getNestedValue(design, control.path)}
                                onChange={(val) => setDesignPartial(control.path, val)}
                                isFavorite={true}
                                onToggleFavorite={toggleFavorite}
                                componentStyles={componentStyles}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Main Accordion */}
            <Accordion type="multiple" defaultValue={activeSections} className="w-full">
                {SECTIONS.map(section => {
                    const group = groupedControls[section.id];
                    if (!group || group.items.length === 0) return null;
                    const Icon = ICONS[section.icon] || Box;

                    // Group Items by Subsection if available
                    const subsectionGroups = {};
                    const rootItems = [];

                    group.items.forEach(item => {
                        if (item.subsection) {
                            if (!subsectionGroups[item.subsection]) subsectionGroups[item.subsection] = [];
                            subsectionGroups[item.subsection].push(item);
                        } else {
                            rootItems.push(item);
                        }
                    });

                    return (
                        <AccordionItem key={section.id} value={section.id} className="border-b border-[var(--color-border-default)]">
                            <AccordionTrigger className="hover:no-underline py-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 rounded-lg bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]">
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-sm font-semibold text-[var(--color-text-primary)]">
                                            {section.label}
                                        </div>
                                        {/* Show count of matches if searching */}
                                        {searchQuery && (
                                            <div className="text-xs font-normal text-[var(--color-text-muted)]">
                                                {group.items.length} resultados
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="pl-2 pb-4 space-y-4">
                                    {/* Root items without subsection */}
                                    {rootItems.length > 0 && (
                                        <div className="space-y-1">
                                            {rootItems.map(control => (
                                                <ControlRow
                                                    key={control.id}
                                                    control={control}
                                                    value={getNestedValue(design, control.path)}
                                                    onChange={(val) => setDesignPartial(control.path, val)}
                                                    isFavorite={favorites.includes(control.id)}
                                                    onToggleFavorite={toggleFavorite}
                                                    componentStyles={componentStyles}
                                                />
                                            ))}
                                        </div>
                                    )}

                                    {/* Subsections */}
                                    {Object.entries(subsectionGroups).map(([subLabel, items]) => (
                                        <div key={subLabel} className="pt-2">
                                            <h4 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2 border-b border-[var(--color-border-default)]/50 pb-1">
                                                {subLabel}
                                            </h4>
                                            <div className="space-y-1">
                                                {items.map(control => (
                                                    <ControlRow
                                                        key={control.id}
                                                        control={control}
                                                        value={getNestedValue(design, control.path)}
                                                        onChange={(val) => setDesignPartial(control.path, val)}
                                                        isFavorite={favorites.includes(control.id)}
                                                        onToggleFavorite={toggleFavorite}
                                                        componentStyles={componentStyles}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    );
                })}
            </Accordion>

            {/* Empty State for Search */}
            {filteredControls.length === 0 && (
                <div className="text-center py-10 text-[var(--color-text-muted)]">
                    <p>No se encontraron controles que coincidan con "{searchQuery}".</p>
                    <Button variant="link" onClick={() => setSearchQuery('')}>Limpiar búsqueda</Button>
                </div>
            )}
        </div>
    );
}
