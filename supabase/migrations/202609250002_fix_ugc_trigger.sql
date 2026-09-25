-- Access trigger rows through JSON so this shared function never resolves a
-- column that does not exist on the table currently firing the trigger.
create or replace function public.enforce_ugc_text_safety()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  row_data jsonb := to_jsonb(new);
  payload text;
begin
  payload := case tg_table_name
    when 'musician_profiles' then concat_ws(' ', row_data->>'display_name', row_data->>'bio')
    when 'messages' then row_data->>'body'
    when 'band_calls' then concat_ws(' ', row_data->>'title', row_data->>'description')
    when 'band_call_applications' then row_data->>'intro'
    when 'collaboration_items' then row_data->>'text'
    else ''
  end;

  if not public.text_passes_safety_filter(payload) then
    raise exception 'This content cannot be posted. Review the Delos Community Standards.';
  end if;
  return new;
end;
$$;
