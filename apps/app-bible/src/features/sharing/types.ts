export type PackageKind = 'audio' | 'text';

export interface AudioPackageScopeFull {
  mode: 'full';
}

export interface AudioPackageScopeBooks {
  mode: 'books';
  bookIds: string[]; // books.id
}

export type AudioPackageScope = AudioPackageScopeFull | AudioPackageScopeBooks;

export interface TextPackageScopeFull {
  mode: 'full';
}

export interface TextPackageScopeBooks {
  mode: 'books';
  bookIds: string[]; // books.id
}

export type TextPackageScope = TextPackageScopeFull | TextPackageScopeBooks;

export type PackageScope = AudioPackageScope | TextPackageScope;

export interface PackageEstimate {
  totalBytes: number;
  fileCount: number;
  willSplit: boolean;
  partCount: number;
}

export interface PackageManifest {
  schemaVersion: number;
  createdAt: string;
  appVersion?: string;
  kind: PackageKind;
  audioVersionId?: string;
  textVersionId?: string;
  scope?: PackageScope;
  dbFilename: string; // single packaged db, e.g. package.db
  mediaRoot?: string; // media/
  parts?: Array<{
    name: string; // part filename
    sizeBytes: number;
    checksums: Record<string, string>; // relativePath -> sha256
  }>;
  checksums: Record<string, string>; // filename -> sha256
}
