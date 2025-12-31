// lib/sdk/tx-loading.ts
// ------------------------------------------------------------
// Global Transaction Loading State Manager
// ------------------------------------------------------------
// Provides global state management for transaction loading overlays
// Prevents users from clicking buttons during transactions
// ------------------------------------------------------------

type LoadingState = {
  isLoading: boolean;
  label: string;
};

type Listener = (state: LoadingState) => void;

class TxLoadingManager {
  private state: LoadingState = {
    isLoading: false,
    label: "Processing transaction…",
  };

  private listeners = new Set<Listener>();

  /**
   * Subscribe to loading state changes
   */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    // Immediately call with current state
    listener(this.state);
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get current loading state
   */
  getState(): LoadingState {
    return { ...this.state };
  }

  /**
   * Show loading overlay
   */
  show(label: string = "Processing transaction…"): void {
    if (this.state.isLoading) {
      // Update label if already loading
      this.state.label = label;
      this.notify();
      return;
    }

    this.state = {
      isLoading: true,
      label,
    };
    this.notify();

    // Lock body scroll when loading
    if (typeof document !== "undefined") {
      document.body.style.overflow = "hidden";
    }
  }

  /**
   * Hide loading overlay
   */
  hide(): void {
    if (!this.state.isLoading) return;

    this.state = {
      isLoading: false,
      label: "Processing transaction…",
    };
    this.notify();

    // Unlock body scroll
    if (typeof document !== "undefined") {
      document.body.style.overflow = "";
    }
  }

  /**
   * Notify all listeners
   */
  private notify(): void {
    const state = { ...this.state };
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (e) {
        console.warn("[TxLoadingManager] Listener error:", e);
      }
    });
  }
}

// Singleton instance
export const txLoading = new TxLoadingManager();
