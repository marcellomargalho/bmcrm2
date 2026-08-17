CREATE OR REPLACE FUNCTION get_process_stats()
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  total INT;
  ativos INT;
  arquivados INT;
  inativos INT;
BEGIN
  -- Count total
  SELECT COUNT(*) INTO total FROM processes;
  
  -- Count ativos (não arquivados)
  SELECT COUNT(*) INTO ativos FROM processes p WHERE p.status != 'Arquivado';
  
  -- Count arquivados
  SELECT COUNT(*) INTO arquivados FROM processes p WHERE p.status = 'Arquivado';
  
  -- Count inativos (cliente inativo or process_client inativo)
  SELECT COUNT(DISTINCT p.id) INTO inativos
  FROM processes p
  LEFT JOIN clients c ON p.client_id = c.id
  LEFT JOIN process_clients pc ON p.id = pc.process_id
  LEFT JOIN clients c2 ON pc.client_id = c2.id
  WHERE c.status = 'Inativo' OR c2.status = 'Inativo';

  -- Ajuste: Ativos no front-end excluem inativos
  -- Então ativos real = ativos - inativos (mas os inativos que estão ativos)
  -- Para simplificar e manter a lógica do front, retornamos tudo e o front resolve,
  -- ou já devolvemos o json:
  RETURN json_build_object(
    'total', total,
    'ativos', (SELECT COUNT(DISTINCT p.id) 
               FROM processes p
               LEFT JOIN clients c ON p.client_id = c.id
               LEFT JOIN process_clients pc ON p.id = pc.process_id
               LEFT JOIN clients c2 ON pc.client_id = c2.id
               WHERE p.status != 'Arquivado' 
                 AND (c.status IS NULL OR c.status != 'Inativo')
                 AND (c2.status IS NULL OR c2.status != 'Inativo')),
    'arquivados', arquivados,
    'inativos', inativos
  );
END;
$$;
