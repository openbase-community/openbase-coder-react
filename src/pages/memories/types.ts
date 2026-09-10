export interface MemoryEntry {
  name: string;
  path: string;
  description?: string;
  memory_type?: string;
  updated_at?: string;
  read_only?: boolean;
  kind?: string;
  is_index?: boolean;
}

export interface MemorySection {
  key: string;
  label: string;
  agent: string;
  project_path: string;
  memories_dir: string;
  memories: MemoryEntry[];
}
