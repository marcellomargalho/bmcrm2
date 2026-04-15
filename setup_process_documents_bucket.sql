-- 1. Cria o bucket de storage se não existir
insert into storage.buckets (id, name, public)
values ('process_documents', 'process_documents', true)
on conflict (id) do update set public = true;

-- 2. Habilita RLS (Row Level Security) para o bucket de documentos (caso não esteja habilitado por padrão)
-- OBS: RLS nas tabelas 'storage.objects' e 'storage.buckets' já é padrão do Supabase, 
-- mas nós apenas adicionamos políticas de acesso aos objetos.

-- 3. Remove as políticas se elas já existirem (para evitar conflitos caso rode o script novamente)
drop policy if exists "Leitura Pública do Bucket process_documents" on storage.objects;
drop policy if exists "Upload para Usuários Autenticados process_documents" on storage.objects;
drop policy if exists "Atualização para Usuários Autenticados process_documents" on storage.objects;
drop policy if exists "Exclusão para Usuários Autenticados process_documents" on storage.objects;

-- 4. Cria política de leitura pública (necessário para que qualquer um possa baixar/visualizar via URL pública)
create policy "Leitura Pública do Bucket process_documents"
on storage.objects for select
to public
using ( bucket_id = 'process_documents' );

-- 5. Cria política de inserção (upload) para usuários autenticados
create policy "Upload para Usuários Autenticados process_documents"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'process_documents' );

-- 6. Cria política de atualização para usuários autenticados
create policy "Atualização para Usuários Autenticados process_documents"
on storage.objects for update
to authenticated
using ( bucket_id = 'process_documents' );

-- 7. Cria política de exclusão para usuários autenticados
create policy "Exclusão para Usuários Autenticados process_documents"
on storage.objects for delete
to authenticated
using ( bucket_id = 'process_documents' );

-- 8. [OPCIONAL] Caso a tabela `process_documents` no banco de dados ainda não exista, criar a tabela de metadados
CREATE TABLE IF NOT EXISTS public.process_documents (
  id uuid default gen_random_uuid() primary key,
  process_id text not null, -- Ajuste o tipo se for um UUID referenciando outra tabela na sua estrutura
  user_id uuid references auth.users(id),
  title text not null,
  type text not null,
  file_url text not null,
  size numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ativar RLS na tabela do banco (caso criado agora)
ALTER TABLE public.process_documents ENABLE ROW LEVEL SECURITY;

-- Políticas da tabela de metadados
DROP POLICY IF EXISTS "Usuários autenticados podem ver metadados dos documentos" ON public.process_documents;
CREATE POLICY "Usuários autenticados podem ver metadados dos documentos"
ON public.process_documents FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuários autenticados podem inserir metadados dos documentos" ON public.process_documents;
CREATE POLICY "Usuários autenticados podem inserir metadados dos documentos"
ON public.process_documents FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Usuários autenticados podem excluir metadados dos documentos" ON public.process_documents;
CREATE POLICY "Usuários autenticados podem excluir metadados dos documentos"
ON public.process_documents FOR DELETE TO authenticated USING (true);
