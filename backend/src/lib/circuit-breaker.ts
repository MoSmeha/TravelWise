export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal 
  OPEN = 'OPEN',         // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

interface CircuitBreakerConfig {
  failureThreshold: number;  
  resetTimeout: number;      
  halfOpenRequests: number;  
}

interface CircuitBreakerState {
  failures: number;
  successes: number;
  state: CircuitState;
  lastFailureTime: number | null;
  halfOpenRequests: number;
}

export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private state: CircuitBreakerState;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      resetTimeout: config.resetTimeout ?? 60000, // 1 minute
      halfOpenRequests: config.halfOpenRequests ?? 3,
    };
    
    this.state = {
      failures: 0,
      successes: 0,
      state: CircuitState.CLOSED,
      lastFailureTime: null,
      halfOpenRequests: 0,
    };
  }

  isOpen(): boolean {
    if (this.state.state === CircuitState.OPEN) {
      if (this.state.lastFailureTime && 
          Date.now() - this.state.lastFailureTime >= this.config.resetTimeout) {
        this.state.state = CircuitState.HALF_OPEN;
        this.state.halfOpenRequests = 0;
        return false;
      }
      return true;
    }
    return false;
  }

  canAttempt(): boolean {
    if (this.state.state === CircuitState.CLOSED) {
      return true;
    }
    
    if (this.state.state === CircuitState.HALF_OPEN) {
      return this.state.halfOpenRequests < this.config.halfOpenRequests;
    }
    
    return !this.isOpen();
  }

  recordSuccess(): void {
    if (this.state.state === CircuitState.HALF_OPEN) {
      this.state.successes++;
      
      // If enough successes in half-open, close the circuit
      if (this.state.successes >= this.config.halfOpenRequests) {
        this.reset();
      }
    } else {
      // Reset failure count on success in closed state
      this.state.failures = 0;
    }
  }

  recordFailure(): void {
    this.state.failures++;
    this.state.lastFailureTime = Date.now();
    
    if (this.state.state === CircuitState.HALF_OPEN) {
      // Any failure in half-open immediately opens the circuit
      this.state.state = CircuitState.OPEN;
    } else if (this.state.failures >= this.config.failureThreshold) {
      this.state.state = CircuitState.OPEN;
    }
  }

  reset(): void {
    this.state = {
      failures: 0,
      successes: 0,
      state: CircuitState.CLOSED,
      lastFailureTime: null,
      halfOpenRequests: 0,
    };
  }

  getState(): CircuitState {
    // Check for automatic transition
    this.isOpen();
    return this.state.state;
  }

  getStats(): { state: CircuitState; failures: number; lastFailure: Date | null } {
    return {
      state: this.getState(),
      failures: this.state.failures,
      lastFailure: this.state.lastFailureTime ? new Date(this.state.lastFailureTime) : null,
    };
  }
}

// Pre-configured circuit breakers for external services
export const CIRCUIT_BREAKERS = {
  googlePlaces: new CircuitBreaker({ failureThreshold: 5, resetTimeout: 60000 }),
  openWeatherMap: new CircuitBreaker({ failureThreshold: 3, resetTimeout: 30000 }),
  openAI: new CircuitBreaker({ failureThreshold: 3, resetTimeout: 60000 }),
};

// Error class for circuit open state
export class CircuitOpenError extends Error {
  constructor(serviceName: string) {
    super(`Circuit breaker is open for ${serviceName} - using fallback`);
    this.name = 'CircuitOpenError';
  }
}

// Wrapper function to execute with circuit breaker
export async function withCircuitBreaker<T>(
  breaker: CircuitBreaker,
  serviceName: string,
  fn: () => Promise<T>
): Promise<T> {
  if (!breaker.canAttempt()) {
    throw new CircuitOpenError(serviceName);
  }
  
  try {
    const result = await fn();
    breaker.recordSuccess();
    return result;
  } catch (error) {
    breaker.recordFailure();
    throw error;
  }
}
