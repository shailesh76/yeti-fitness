-- Supabase Schema for Food and Meal Logging

CREATE TABLE IF NOT EXISTS public.foods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    brand TEXT,
    calories INTEGER NOT NULL DEFAULT 0,
    protein NUMERIC NOT NULL DEFAULT 0,
    carbs NUMERIC NOT NULL DEFAULT 0,
    fat NUMERIC NOT NULL DEFAULT 0,
    serving_size TEXT,
    barcode TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.meal_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    food_id UUID NOT NULL REFERENCES public.foods(id) ON DELETE CASCADE,
    meal_type TEXT NOT NULL, -- BREAKFAST, LUNCH, DINNER, SNACK
    servings NUMERIC NOT NULL DEFAULT 1,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexing for speed
CREATE INDEX IF NOT EXISTS idx_foods_barcode ON public.foods(barcode);
CREATE INDEX IF NOT EXISTS idx_meal_logs_user_id ON public.meal_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_logs_logged_at ON public.meal_logs(logged_at);

-- Enable RLS
ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow authenticated read/write access to foods" ON public.foods
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow users to manage their own meal logs" ON public.meal_logs
    FOR ALL TO authenticated USING (auth.uid() = user_id);
