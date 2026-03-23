
ALTER TABLE public.service_orders
  ADD COLUMN technician_signature text,
  ADD COLUMN customer_signature text,
  ADD COLUMN device_received_at date;
