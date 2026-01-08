import { logger } from '../utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = true;

export interface SignOutProgress {
  progress: number; // 0-100
  currentStep: string;
  isVisible: boolean;
  isComplete: boolean; // New: indicates if sign-out is complete and showing completion message
}

export type ProgressCallback = (progress: SignOutProgress) => void;

/**
 * Service to manage sign-out progress and provide real-time updates
 */
class SignOutProgressService {
  private static instance: SignOutProgressService;
  private progress: SignOutProgress = {
    progress: 0,
    currentStep: '',
    isVisible: false,
    isComplete: false,
  };
  private listeners: ProgressCallback[] = [];

  public static getInstance(): SignOutProgressService {
    if (!SignOutProgressService.instance) {
      SignOutProgressService.instance = new SignOutProgressService();
    }
    return SignOutProgressService.instance;
  }

  /**
   * Subscribe to progress updates
   */
  public subscribe(callback: ProgressCallback): () => void {
    this.listeners.push(callback);
    // Immediately call with current state
    callback(this.progress);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Start the sign-out progress
   */
  public startProgress(): void {
    this.updateProgress({
      progress: 0,
      currentStep: 'Initializing sign out...',
      isVisible: true,
      isComplete: false,
    });
  }

  /**
   * Update progress with specific step
   */
  public updateStep(step: string, progress: number): void {
    this.updateProgress({
      progress: Math.min(100, Math.max(0, progress)),
      currentStep: step,
      isVisible: true,
      isComplete: false,
    });
  }

  /**
   * Complete the progress with a delay to ensure all reset operations are finished
   */
  public completeProgress(): void {
    // First, show completion message
    this.updateProgress({
      progress: 100,
      currentStep: 'Sign out complete!',
      isVisible: true,
      isComplete: true,
    });

    // Add a small delay to ensure all reset operations are fully completed
    // This gives time for database operations, file deletions, and store resets to finish
    setTimeout(() => {
      // Keep the modal visible with completion state - user will dismiss with "Okay" button
      logger.info(
        ENABLE_LOGGING,
        'SignOutProgress: Reset operations completed, showing completion state'
      );
    }, 1500); // 1.5 second delay to ensure everything is properly reset
  }

  /**
   * Hide the progress modal (called when user clicks "Okay" button)
   */
  public hideProgress(): void {
    this.updateProgress({
      progress: 0,
      currentStep: '',
      isVisible: false,
      isComplete: false,
    });
  }

  /**
   * Reset progress state
   */
  public reset(): void {
    this.updateProgress({
      progress: 0,
      currentStep: '',
      isVisible: false,
      isComplete: false,
    });
  }

  /**
   * Get current progress state
   */
  public getCurrentProgress(): SignOutProgress {
    return { ...this.progress };
  }

  /**
   * Update progress and notify listeners
   */
  private updateProgress(newProgress: SignOutProgress): void {
    this.progress = { ...newProgress };

    logger.info(
      ENABLE_LOGGING,
      `SignOutProgress: ${newProgress.progress}% - ${newProgress.currentStep}`
    );

    // Notify all listeners
    this.listeners.forEach(callback => {
      try {
        callback(this.progress);
      } catch (error) {
        logger.error(ENABLE_LOGGING, 'SignOutProgress: Listener error:', error);
      }
    });
  }
}

export const signOutProgressService = SignOutProgressService.getInstance();
