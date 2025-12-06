/**
 * Safe error handler that prevents leaking database schema information to clients
 * while logging full details server-side for debugging
 */

export interface SafeError {
  message: string;
  code: string;
}

export function mapToSafeError(error: unknown): SafeError {
  if (!(error instanceof Error)) {
    return { 
      message: 'Ocorreu um erro inesperado', 
      code: 'UNKNOWN_ERROR' 
    };
  }

  // Log full error server-side for debugging
  console.error('[ERROR]', error.message, error.stack);

  // Map to safe client messages based on error patterns
  const message = error.message.toLowerCase();
  
  // Duplicate key / unique constraint violations
  if (message.includes('duplicate') || message.includes('unique') || message.includes('already exists')) {
    return { 
      message: 'Este registro já existe', 
      code: 'DUPLICATE_ENTRY' 
    };
  }
  
  // Foreign key constraint violations
  if (message.includes('foreign key') || message.includes('referenced') || message.includes('violates')) {
    return { 
      message: 'Não é possível realizar esta operação: registro está em uso', 
      code: 'RESOURCE_IN_USE' 
    };
  }
  
  // Not found errors
  if (message.includes('not found') || message.includes('does not exist') || message.includes('no rows')) {
    return { 
      message: 'Registro não encontrado', 
      code: 'NOT_FOUND' 
    };
  }
  
  // Permission/access denied errors
  if (message.includes('permission') || message.includes('access denied') || message.includes('forbidden')) {
    return { 
      message: 'Você não tem permissão para realizar esta ação', 
      code: 'FORBIDDEN' 
    };
  }

  // Authentication errors
  if (message.includes('auth') || message.includes('unauthorized') || message.includes('token')) {
    return { 
      message: 'Erro de autenticação', 
      code: 'AUTH_ERROR' 
    };
  }

  // Generic fallback - never expose raw error messages
  return { 
    message: 'Ocorreu um erro ao processar sua solicitação', 
    code: 'INTERNAL_ERROR' 
  };
}
