-- Create transactions table for tracking all palm print activities
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('payment', 'access_entry', 'access_exit', 'registration', 'verification')),
  amount DECIMAL(10, 2),
  currency TEXT DEFAULT 'SAR',
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  location TEXT,
  device_id TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own transactions
CREATE POLICY "Users can view their own transactions"
ON public.transactions
FOR SELECT
USING (auth.uid() = user_id);

-- System can insert transactions
CREATE POLICY "System can insert transactions"
ON public.transactions
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_type ON public.transactions(transaction_type);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at DESC);

-- Add foreign key constraint
ALTER TABLE public.transactions
ADD CONSTRAINT fk_transactions_user_id
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;