-- Column user_id already exists in the database

-- We need to grant INSERT permissions since only SELECT and UPDATE were granted to authenticated users
GRANT INSERT ON public.reservations TO authenticated;
GRANT INSERT ON public.reservation_items TO authenticated;

-- Policies for Reservations
CREATE POLICY "users read own reservations" 
ON public.reservations 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "users insert own reservations" 
ON public.reservations 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Policies for Reservation Items
CREATE POLICY "users read own reservation items" 
ON public.reservation_items 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.reservations 
    WHERE reservations.id = reservation_items.reservation_id 
    AND reservations.user_id = auth.uid()
  )
);

CREATE POLICY "users insert own reservation items" 
ON public.reservation_items 
FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.reservations 
    WHERE reservations.id = reservation_items.reservation_id 
    AND reservations.user_id = auth.uid()
  )
);
