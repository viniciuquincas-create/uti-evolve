DO $$
BEGIN
  PERFORM key FROM public.config WHERE key IN ('historico_diario','pacientes_arquivados') FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.config WHERE key='long-v2-ready') THEN RAISE EXCEPTION 'Migration already initialized'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.config WHERE key='historico_diario') OR NOT EXISTS (SELECT 1 FROM public.config WHERE key='pacientes_arquivados') THEN RAISE EXCEPTION 'Source collections missing'; END IF;
  IF EXISTS (SELECT 1 FROM public.config c CROSS JOIN LATERAL jsonb_array_elements(c.value::jsonb) e WHERE c.key='pacientes_arquivados' AND coalesce(e->>'id','')='') THEN RAISE EXCEPTION 'Archive without ID'; END IF;
  IF (SELECT count(*) FROM public.config c CROSS JOIN LATERAL jsonb_array_elements(c.value::jsonb) e WHERE c.key='pacientes_arquivados') <> (SELECT count(DISTINCT e->>'id') FROM public.config c CROSS JOIN LATERAL jsonb_array_elements(c.value::jsonb) e WHERE c.key='pacientes_arquivados') THEN RAISE EXCEPTION 'Duplicate archive ID'; END IF;
  INSERT INTO public.config(key,value)
    SELECT 'backup-20261013-'||key,value FROM public.config WHERE key IN ('historico_diario','pacientes_arquivados');
  INSERT INTO public.config(key,value)
    SELECT 'long-v2/history/'||e.key,e.value::text FROM public.config c CROSS JOIN LATERAL jsonb_each(c.value::jsonb) e WHERE c.key='historico_diario';
  INSERT INTO public.config(key,value)
    SELECT 'long-v2/archive/'||(e->>'id'),e::text FROM public.config c CROSS JOIN LATERAL jsonb_array_elements(c.value::jsonb) e WHERE c.key='pacientes_arquivados';
  INSERT INTO public.config(key,value) VALUES ('long-v2-ready','1');
END $$;
CREATE OR REPLACE FUNCTION public.uti_block_legacy_longitudinal() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.config WHERE key='long-v2-ready' AND value='1') THEN
    RAISE EXCEPTION 'Esta versão do UTI Evolve está desatualizada. Atualize a página antes de salvar o histórico ou arquivar pacientes.' USING ERRCODE='55000';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER uti_block_legacy_longitudinal BEFORE INSERT OR UPDATE ON public.config
FOR EACH ROW WHEN (NEW.key IN ('historico_diario','pacientes_arquivados'))
EXECUTE FUNCTION public.uti_block_legacy_longitudinal();
