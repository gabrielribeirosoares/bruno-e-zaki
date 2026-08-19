CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.reservation_status AS ENUM ('pending', 'paid', 'cancelled');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.miniatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  price_cents integer NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_path text,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.miniatures TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.miniatures TO authenticated;
GRANT ALL ON public.miniatures TO service_role;
ALTER TABLE public.miniatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "published miniatures are public" ON public.miniatures FOR SELECT TO anon, authenticated USING (published = true);
CREATE POLICY "admins read all miniatures" ON public.miniatures FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins insert miniatures" ON public.miniatures FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update miniatures" ON public.miniatures FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete miniatures" ON public.miniatures FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER miniatures_updated_at BEFORE UPDATE ON public.miniatures FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  note text,
  total_cents integer NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
  status public.reservation_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.reservations TO authenticated;
GRANT ALL ON public.reservations TO service_role;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read reservations" ON public.reservations FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update reservations" ON public.reservations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER reservations_updated_at BEFORE UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.reservation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  miniature_id uuid REFERENCES public.miniatures(id) ON DELETE SET NULL,
  title text NOT NULL,
  unit_price_cents integer NOT NULL CHECK (unit_price_cents >= 0),
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reservation_items_reservation_id_idx ON public.reservation_items (reservation_id);
GRANT SELECT ON public.reservation_items TO authenticated;
GRANT ALL ON public.reservation_items TO service_role;
ALTER TABLE public.reservation_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read reservation items" ON public.reservation_items FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.mark_reservation_paid(_reservation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item record;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.reservations WHERE id = _reservation_id AND status = 'pending') THEN
    RAISE EXCEPTION 'reservation not pending';
  END IF;

  FOR item IN SELECT miniature_id, quantity FROM public.reservation_items WHERE reservation_id = _reservation_id AND miniature_id IS NOT NULL LOOP
    UPDATE public.miniatures SET stock = GREATEST(stock - item.quantity, 0) WHERE id = item.miniature_id;
  END LOOP;

  UPDATE public.reservations SET status = 'paid' WHERE id = _reservation_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.mark_reservation_paid(uuid) TO authenticated;

CREATE POLICY "admins read miniature images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'miniatures' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins upload miniature images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'miniatures' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update miniature images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'miniatures' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete miniature images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'miniatures' AND public.has_role(auth.uid(), 'admin'));