import React from 'react';
import { CheckCircleIcon, XCircleIcon, MinusCircleIcon } from '@heroicons/react/24/solid';
import { useJPCountryData, useJPLanguageData, useHasJPCountryData, useHasJPLanguageData } from '../hooks/useJoshuaProject';

type JPGospelAccessSectionProps = {
  type: 'language' | 'region';
  entityId: string;
};

/**
 * Gospel Access Section displays Joshua Project gospel access data
 * including Progress Scale, primary religion, and resource availability
 * (Bible, JESUS Film, Radio, etc.)
 */
export const JPGospelAccessSection: React.FC<JPGospelAccessSectionProps> = ({ type, entityId }) => {
  const isRegion = type === 'region';
  const hasCountryData = useHasJPCountryData(isRegion ? entityId : null);
  const hasLanguageData = useHasJPLanguageData(!isRegion ? entityId : null);
  
  const countryData = useJPCountryData(isRegion ? entityId : null);
  const languageData = useJPLanguageData(!isRegion ? entityId : null);

  // Select appropriate data based on type
  const data = isRegion ? countryData : languageData;
  const stats = isRegion ? countryData.countryStats : languageData.languageStats;
  const hasAnyData = isRegion ? hasCountryData : hasLanguageData;

  // Don't show section if no external ID mapping exists
  if (!hasAnyData) {
    return null;
  }

  if (data.isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-4 bg-neutral-200 rounded animate-pulse w-3/4" />
        <div className="h-20 bg-neutral-200 rounded animate-pulse" />
        <div className="h-16 bg-neutral-200 rounded animate-pulse" />
      </div>
    );
  }

  if (data.error || !stats) {
    return (
      <div className="text-sm text-neutral-500">
        Gospel access data not available
      </div>
    );
  }

  // Helper to render status indicator
  const renderStatus = (value: string | null | undefined, trueValue: string = 'Yes') => {
    const isAvailable = value === trueValue || value === 'Y' || value === '1' || value === 'true';
    const isPartial = value && value !== trueValue && value !== 'N' && value !== 'No' && value !== '0' && value !== 'false';
    
    if (isAvailable) {
      return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
    } else if (isPartial) {
      return <MinusCircleIcon className="w-5 h-5 text-yellow-600" />;
    } else {
      return <XCircleIcon className="w-5 h-5 text-neutral-400" />;
    }
  };

  // Helper to format JP Scale
  const getJPScaleInfo = () => {
    const scale = (stats as any).JPScale || (stats as any).JPScalePC;
    const scaleText = (stats as any).JPScaleText;
    
    if (!scale) return null;
    
    const scaleColors: Record<number, string> = {
      1: 'bg-red-600',
      2: 'bg-orange-500',
      3: 'bg-yellow-500',
      4: 'bg-lime-500',
      5: 'bg-green-600',
    };
    
    return {
      scale,
      text: scaleText || `Level ${scale}`,
      color: scaleColors[scale] || 'bg-neutral-500',
    };
  };

  const jpScaleInfo = getJPScaleInfo();

  return (
    <div className="space-y-4">
      {/* Joshua Project Progress Scale */}
      {jpScaleInfo && (
        <div>
          <div className="font-semibold text-sm mb-2">Gospel Progress</div>
          <div className="flex items-center gap-3">
            <div className={`${jpScaleInfo.color} text-white font-bold rounded-full w-10 h-10 flex items-center justify-center text-lg`}>
              {jpScaleInfo.scale}
            </div>
            <div className="text-sm flex-1">
              <div className="font-medium">{jpScaleInfo.text}</div>
              {(stats as any).GospelAccess && (
                <div className="text-neutral-600 text-xs mt-0.5">
                  {(stats as any).GospelAccess}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Primary Religion and Language */}
      <div className="grid grid-cols-2 gap-3">
        {stats.PrimaryReligion && (
          <div>
            <div className="text-xs text-neutral-500 mb-1">Primary Religion</div>
            <div className="text-sm font-medium">{stats.PrimaryReligion}</div>
          </div>
        )}
        {isRegion && countryData.countryStats?.PrimaryLanguageName && (
          <div>
            <div className="text-xs text-neutral-500 mb-1">Primary Language</div>
            <div className="text-sm font-medium">{countryData.countryStats.PrimaryLanguageName}</div>
          </div>
        )}
      </div>

      {/* Christian and Evangelical Percentages */}
      <div className="grid grid-cols-2 gap-3">
        {typeof (stats as any).PercentChristianPC === 'number' && (
          <div>
            <div className="text-xs text-neutral-500 mb-1">% Christian</div>
            <div className="text-lg font-semibold text-blue-600">
              {(stats as any).PercentChristianPC != null ? `${(stats as any).PercentChristianPC.toFixed(1)}%` : 'N/A'}
            </div>
          </div>
        )}
        {typeof (stats as any).PercentEvangelical === 'number' && (
          <div>
            <div className="text-xs text-neutral-500 mb-1">% Evangelical</div>
            <div className="text-lg font-semibold text-purple-600">
              {(stats as any).PercentEvangelical != null ? `${(stats as any).PercentEvangelical.toFixed(1)}%` : 'N/A'}
            </div>
          </div>
        )}
      </div>

      {/* Resource Availability */}
      <div>
        <div className="font-semibold text-sm mb-2">Gospel Resources</div>
        <div className="space-y-2">
          {/* Bible Translation */}
          <div className="flex items-center justify-between">
            <span className="text-sm">Bible Translation</span>
            <div className="flex items-center gap-2">
              {renderStatus(stats.BibleStatus, 'Yes')}
              <span className="text-xs text-neutral-500">
                {stats.BibleStatus || 'Unknown'}
              </span>
            </div>
          </div>

          {/* JESUS Film */}
          {isRegion && countryData.countryStats?.JF && (
            <div className="flex items-center justify-between">
              <span className="text-sm">JESUS Film</span>
              <div className="flex items-center gap-2">
                {renderStatus(countryData.countryStats.JF)}
                <span className="text-xs text-neutral-500">
                  {countryData.countryStats.JFPrimaryText || countryData.countryStats.JF}
                </span>
              </div>
            </div>
          )}

          {/* Audio Scripture */}
          {isRegion && countryData.countryStats?.AudioScripture && (
            <div className="flex items-center justify-between">
              <span className="text-sm">Audio Scripture</span>
              <div className="flex items-center gap-2">
                {renderStatus(countryData.countryStats.AudioScripture)}
                <span className="text-xs text-neutral-500">
                  {countryData.countryStats.AudioScripture}
                </span>
              </div>
            </div>
          )}

          {/* GRN Recordings */}
          {isRegion && countryData.countryStats?.GRN && (
            <div className="flex items-center justify-between">
              <span className="text-sm">GRN Recordings</span>
              <div className="flex items-center gap-2">
                {renderStatus(countryData.countryStats.GRN)}
                <span className="text-xs text-neutral-500">
                  {countryData.countryStats.GRN}
                </span>
              </div>
            </div>
          )}

          {/* Audio Recordings for Languages */}
          {!isRegion && languageData.languageStats?.AudioRecordings && (
            <div className="flex items-center justify-between">
              <span className="text-sm">Audio Recordings</span>
              <div className="flex items-center gap-2">
                {renderStatus(languageData.languageStats.AudioRecordings)}
                <span className="text-xs text-neutral-500">
                  {languageData.languageStats.AudioRecordings}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bible Translation Years */}
      {(stats.BibleYear || stats.NTYear || stats.PortionsYear) && (
        <div>
          <div className="font-semibold text-sm mb-2">Translation History</div>
          <div className="text-xs space-y-1">
            {stats.BibleYear && (
              <div className="flex justify-between">
                <span className="text-neutral-500">Full Bible:</span>
                <span className="font-medium">{stats.BibleYear}</span>
              </div>
            )}
            {stats.NTYear && (
              <div className="flex justify-between">
                <span className="text-neutral-500">New Testament:</span>
                <span className="font-medium">{stats.NTYear}</span>
              </div>
            )}
            {stats.PortionsYear && (
              <div className="flex justify-between">
                <span className="text-neutral-500">Portions:</span>
                <span className="font-medium">{stats.PortionsYear}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Translation Need */}
      {stats.BibleTranslationNeed && stats.BibleTranslationNeed !== 'Unknown' && (
        <div className="text-xs text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800/50 p-2 rounded">
          <span className="font-semibold">Translation Need: </span>
          {stats.BibleTranslationNeed}
        </div>
      )}

      {/* Data Source Attribution */}
      <div className="text-xs text-neutral-400 pt-2 border-t border-neutral-200 dark:border-neutral-800">
        Data from{' '}
        <a
          href="https://joshuaproject.net"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-neutral-600"
        >
          Joshua Project
        </a>
      </div>
    </div>
  );
};

