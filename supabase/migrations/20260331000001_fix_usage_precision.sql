-- Update user_usage_logs to allow decimal minutes
ALTER TABLE public.user_usage_logs ALTER COLUMN duration_minutes TYPE NUMERIC(10,2);

-- Update increment_user_usage to accept numeric for precision
CREATE OR REPLACE FUNCTION public.increment_user_usage(minutes_to_add NUMERIC)
RETURNS void AS $$
DECLARE
    current_user_id UUID;
    today DATE;
BEGIN
    current_user_id := auth.uid();
    today := CURRENT_DATE;

    IF current_user_id IS NULL THEN
        RETURN;
    END IF;

    INSERT INTO public.user_usage_logs (user_id, usage_date, duration_minutes)
    VALUES (current_user_id, today, minutes_to_add)
    ON CONFLICT (user_id, usage_date)
    DO UPDATE SET 
        duration_minutes = public.user_usage_logs.duration_minutes + EXCLUDED.duration_minutes,
        updated_at = timezone('utc'::text, now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
