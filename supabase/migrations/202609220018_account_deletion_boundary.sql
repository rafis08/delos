-- Account deletion must pass through the authenticated Edge Function so that
-- external processor data is removed before the local account identifier.
revoke all on function public.delete_own_account() from public;
revoke all on function public.delete_own_account() from anon;
revoke all on function public.delete_own_account() from authenticated;
grant execute on function public.delete_own_account() to service_role;
