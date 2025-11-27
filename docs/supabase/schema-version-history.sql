-- Tabla para historial de versiones
create table if not exists version_history (
  id uuid primary key default gen_random_uuid(),
  version text not null,          -- ej: "v0.9-beta"
  codename text,                  -- ej: "Aurora"
  notes text,                     -- markdown
  author_id uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- Asegurar que la foreign key tiene un nombre explícito para PostgREST
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'version_history_author_id_fkey'
  ) then
    alter table version_history 
    add constraint version_history_author_id_fkey 
    foreign key (author_id) references profiles(id) on delete set null;
  end if;
end $$;

-- Tabla para metadatos de la app (1 solo registro)
create table if not exists app_meta (
  id uuid primary key default gen_random_uuid(),
  current_version_id uuid references version_history(id),
  updated_at timestamptz default now()
);

-- Insertar registro único si no existe
insert into app_meta (id)
select gen_random_uuid()
where not exists (select 1 from app_meta);

-- Habilitar RLS
alter table app_meta enable row level security;
alter table version_history enable row level security;

-- Políticas RLS para app_meta
create policy "admins read" on app_meta for select using (auth.role() = 'authenticated');
create policy "admins update" on app_meta for update using (auth.uid() in (select id from profiles where role = 'ADMIN'));

-- Políticas RLS para version_history
create policy "admins read" on version_history for select using (auth.role() = 'authenticated');
create policy "admins insert" on version_history for insert with check (auth.uid() in (select id from profiles where role = 'ADMIN'));
create policy "admins update" on version_history for update using (auth.uid() in (select id from profiles where role = 'ADMIN'));

