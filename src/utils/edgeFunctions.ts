/**
 * Utility functions for Supabase Edge Functions
 */

export interface EdgeFunctionError {
  code: 'NOT_FOUND' | 'UNAUTHORIZED' | 'NETWORK_ERROR' | 'UNKNOWN';
  message: string;
  details?: string;
}

/**
 * Check if Edge Function is available
 */
export async function checkEdgeFunction(
  functionName: string,
  supabaseUrl: string,
  anonKey: string
): Promise<{ available: boolean; error?: EdgeFunctionError }> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      return {
        available: false,
        error: {
          code: 'NOT_FOUND',
          message: `Edge Function "${functionName}" غير منشورة`,
          details: `يرجى نشر Edge Function "${functionName}" من Supabase Dashboard → Edge Functions`,
        },
      };
    }

    if (response.status === 401) {
      return {
        available: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Anon Key غير صحيح',
          details: 'يرجى التحقق من VITE_SUPABASE_PUBLISHABLE_KEY في ملف .env',
        },
      };
    }

    // Any other status means the function exists (even if it returns an error)
    return { available: true };
  } catch (error: unknown) {
    return {
      available: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'فشل الاتصال بالخادم',
        details: error instanceof Error ? error.message : 'تأكد من الاتصال بالإنترنت وأن Edge Functions منشورة',
      },
    };
  }
}

/**
 * Call Edge Function with better error handling
 */
export async function callEdgeFunction(
  functionName: string,
  options: {
    method?: 'GET' | 'POST';
    body?: Json;
    supabaseUrl: string;
    anonKey: string;
  }
): Promise<{ success: boolean; data?: Json; error?: EdgeFunctionError }> {
  const { method = 'GET', body, supabaseUrl, anonKey } = options;

  // Clean URL and key (remove quotes)
  const cleanUrl = supabaseUrl.replace(/^["']|["']$/g, '').trim();
  const cleanKey = anonKey.replace(/^["']|["']$/g, '').trim();

  try {
    const response = await fetch(`${cleanUrl}/functions/v1/${functionName}`, {
      method,
      headers: {
        'Authorization': `Bearer ${cleanKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 404) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Edge Function "${functionName}" غير منشورة`,
          details: `يرجى نشر Edge Function "${functionName}" من Supabase Dashboard → Edge Functions → Create a new function`,
        },
      };
    }

    if (response.status === 401) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Anon Key غير صحيح',
          details: 'يرجى التحقق من VITE_SUPABASE_PUBLISHABLE_KEY في ملف .env',
        },
      };
    }

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: {
          code: 'UNKNOWN',
          message: `خطأ من الخادم (${response.status})`,
          details: errorText,
        },
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error: unknown) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'فشل الاتصال بالخادم',
        details: error instanceof Error ? error.message : 'تأكد من الاتصال بالإنترنت وأن Edge Functions منشورة',
      },
    };
  }
}

/**
 * Get Supabase configuration from environment
 */
export function getSupabaseConfig(): {
  url: string;
  anonKey: string;
  error?: string;
} {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      url: '',
      anonKey: '',
      error: 'إعدادات Supabase مفقودة. تأكد من وجود ملف .env مع VITE_SUPABASE_URL و VITE_SUPABASE_PUBLISHABLE_KEY',
    };
  }

  // Remove quotes if present and trim
  const cleanUrl = supabaseUrl.replace(/^["']|["']$/g, '').trim();
  const cleanKey = supabaseAnonKey.replace(/^["']|["']$/g, '').trim();

  // Validate URL format
  if (!cleanUrl.startsWith('https://') || !cleanUrl.includes('.supabase.co')) {
    return {
      url: '',
      anonKey: '',
      error: 'URL غير صحيح. يجب أن يكون: https://[project-id].supabase.co',
    };
  }

  return { url: cleanUrl, anonKey: cleanKey };
}

import type { Json } from "@/integrations/supabase/types";

