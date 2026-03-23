-- Add column to track if device was powered on when received
ALTER TABLE public.service_orders 
ADD COLUMN device_powered_on BOOLEAN DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.service_orders.device_powered_on IS 'Indica se o aparelho estava ligado quando recebido para reparo';