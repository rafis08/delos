-- A conservative first-line UGC filter. Human report review remains authoritative.
create or replace function public.text_passes_safety_filter(value text)
returns boolean language sql immutable set search_path=public as $$
  select value is null or not lower(value) ~
    '(kill yourself|explicit sexual services|send nudes|racial supremacy|terrorist recruitment|buy (cocaine|heroin|meth)|underage sex)';
$$;

create or replace function public.enforce_ugc_text_safety()
returns trigger language plpgsql set search_path=public as $$
declare row_data jsonb:=to_jsonb(new); payload text;
begin
  payload:=case tg_table_name
    when 'musician_profiles' then concat_ws(' ',row_data->>'display_name',row_data->>'bio')
    when 'messages' then row_data->>'body'
    when 'band_calls' then concat_ws(' ',row_data->>'title',row_data->>'description')
    when 'band_call_applications' then row_data->>'intro'
    when 'collaboration_items' then row_data->>'text'
    else '' end;
  if not public.text_passes_safety_filter(payload) then
    raise exception 'This content cannot be posted. Review the Delos Community Standards.';
  end if;
  return new;
end $$;

drop trigger if exists musician_profile_text_safety on public.musician_profiles;
create trigger musician_profile_text_safety before insert or update on public.musician_profiles
for each row execute procedure public.enforce_ugc_text_safety();
drop trigger if exists message_text_safety on public.messages;
create trigger message_text_safety before insert or update on public.messages
for each row execute procedure public.enforce_ugc_text_safety();
drop trigger if exists band_call_text_safety on public.band_calls;
create trigger band_call_text_safety before insert or update on public.band_calls
for each row execute procedure public.enforce_ugc_text_safety();
drop trigger if exists band_call_application_text_safety on public.band_call_applications;
create trigger band_call_application_text_safety before insert or update on public.band_call_applications
for each row execute procedure public.enforce_ugc_text_safety();
drop trigger if exists collaboration_item_text_safety on public.collaboration_items;
create trigger collaboration_item_text_safety before insert or update on public.collaboration_items
for each row execute procedure public.enforce_ugc_text_safety();

revoke all on function public.text_passes_safety_filter(text) from public;
