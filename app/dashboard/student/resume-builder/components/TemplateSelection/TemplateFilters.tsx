'use client';

import { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ResumeTemplateDTO } from '@/components/Resume/types/resume';

interface TemplateFiltersProps {
  templates: ResumeTemplateDTO[];
  onFilterChange: (filtered: ResumeTemplateDTO[]) => void;
}

export function TemplateFilters({ templates, onFilterChange }: TemplateFiltersProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    return templates.filter(template => {
      const matchesSearch = template.templateName.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === 'all' || template.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [templates, search, typeFilter]);

  useEffect(() => {
    onFilterChange(filtered);
  }, [filtered, onFilterChange]);

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <Input
        placeholder="Search templates..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="flex-1"
      />
      <Select value={typeFilter} onValueChange={setTypeFilter}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="All types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          <SelectItem value="global">Global</SelectItem>
          <SelectItem value="section">Section</SelectItem>
          <SelectItem value="department">Department</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
