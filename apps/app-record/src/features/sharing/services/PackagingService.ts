import type {
  AudioPackageScope,
  TextPackageScope,
  PackageManifest,
} from '../types';
import { AudioPackagingService } from './AudioPackagingService';
import { TextPackagingService } from './TextPackagingService';

/**
 * Facade service that delegates to specialized packaging services.
 * Maintains backwards compatibility while providing clean separation of concerns.
 */
export class PackagingService {
  /**
   * Create an audio package with media files and database.
   *
   * @param audioVersionId - The ID of the audio version to package
   * @param scope - The scope configuration (full or specific books)
   * @returns Package URIs and manifests for sharing
   */
  static async createAudioPackage(
    audioVersionId: string,
    scope: AudioPackageScope
  ): Promise<{ packageUris: string[]; manifests: PackageManifest[] }> {
    return AudioPackagingService.createPackage(audioVersionId, scope);
  }

  /**
   * Create a text package with verse texts and database.
   *
   * @param textVersionId - The ID of the text version to package
   * @param scope - The scope configuration (full or specific books)
   * @returns Package URIs and manifests for sharing
   */
  static async createTextPackage(
    textVersionId: string,
    scope: TextPackageScope
  ): Promise<{ packageUris: string[]; manifests: PackageManifest[] }> {
    return TextPackagingService.createPackage(textVersionId, scope);
  }
}
