/*
  RUN THIS IN YOUR SUPABASE SQL EDITOR

  -- 1. Create Users table (extending auth.users)
  CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    name TEXT,
    email TEXT,
    role TEXT CHECK (role IN ('client', 'barber')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
  );

  -- 2. Create Barbershops table
  CREATE TABLE public.barbershops (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
  );

  -- 3. Create Services table
  CREATE TABLE public.services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
  );

  -- 4. Create Slots table
  CREATE TABLE public.slots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE NOT NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
    original_price DECIMAL(10,2) NOT NULL,
    discount_price DECIMAL(10,2) NOT NULL,
    slot_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'reserved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
  );

  -- 5. Create Bookings table
  CREATE TABLE public.bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slot_id UUID REFERENCES public.slots(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
  );

  -- Enable RLS
  ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.barbershops ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.slots ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

  -- Basic Policies (Simplified for demo, refine for production)
  CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
  CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

  CREATE POLICY "Barbershops are viewable by everyone" ON public.barbershops FOR SELECT USING (true);
  CREATE POLICY "Barbers can insert their own shop" ON public.barbershops FOR INSERT WITH CHECK (auth.uid() = owner_id);

  CREATE POLICY "Services are viewable by everyone" ON public.services FOR SELECT USING (true);
  CREATE POLICY "Barbers can manage their own services" ON public.services FOR ALL USING (
    EXISTS (SELECT 1 FROM public.barbershops WHERE id = barbershop_id AND owner_id = auth.uid())
  );

  CREATE POLICY "Slots are viewable by everyone" ON public.slots FOR SELECT USING (true);
  CREATE POLICY "Barbers can manage their own slots" ON public.slots FOR ALL USING (
    EXISTS (SELECT 1 FROM public.barbershops WHERE id = barbershop_id AND owner_id = auth.uid())
  );

  CREATE POLICY "Bookings are viewable by owner or barber" ON public.bookings FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.slots s JOIN public.barbershops b ON s.barbershop_id = b.id WHERE s.id = slot_id AND b.owner_id = auth.uid())
  );
  CREATE POLICY "Clients can create bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
*/
