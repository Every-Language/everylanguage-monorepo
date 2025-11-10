import React from 'react';
import { useJPLanguageData, useHasJPLanguageData } from '../hooks/useJoshuaProject';
import { UsersIcon, GlobeAltIcon, UserGroupIcon } from '@heroicons/react/24/outline';

type JPLanguageStatsSectionProps = {
  entityId: string;
};

/**
 * Language Stats Section displays overview statistics for a language
 * from Joshua Project (only for language entities)
 */
export const JPLanguageStatsSection: React.FC<JPLanguageStatsSectionProps> = ({ entityId }) => {
  const hasLanguageData = useHasJPLanguageData(entityId);
  const { languageStats, isLoading, error } = useJPLanguageData(entityId);

  // Don't show section if no external ID mapping exists
  if (!hasLanguageData) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-4 bg-neutral-200 rounded animate-pulse w-3/4" />
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-neutral-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !languageStats) {
    return (
      <div className="text-sm text-neutral-500">
        Language statistics not available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 rounded-lg p-3">
          <UsersIcon className="w-5 h-5 text-blue-600 mb-1" />
          <div className="text-xs text-blue-600 mb-1">Population</div>
          <div className="text-lg font-bold text-blue-900">
            {languageStats.PoplPeoples != null ? `${(languageStats.PoplPeoples / 1000000).toFixed(1)}M` : 'N/A'}
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-3">
          <GlobeAltIcon className="w-5 h-5 text-green-600 mb-1" />
          <div className="text-xs text-green-600 mb-1">Countries</div>
          <div className="text-lg font-bold text-green-900">
            {languageStats.Countries}
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-3">
          <UserGroupIcon className="w-5 h-5 text-purple-600 mb-1" />
          <div className="text-xs text-purple-600 mb-1">People Groups</div>
          <div className="text-lg font-bold text-purple-900">
            {languageStats.Peoples}
          </div>
        </div>
      </div>

      {/* Hub Country */}
      {languageStats.HubCountry && (
        <div>
          <div className="font-semibold text-sm mb-2">Hub Country</div>
          <div className="text-sm">
            <span className="font-medium">{languageStats.HubCountry}</span>
            {languageStats.HubCountryISO && (
              <span className="text-neutral-500 ml-2">({languageStats.HubCountryISO})</span>
            )}
          </div>
        </div>
      )}

      {/* Unreached Populations */}
      {(languageStats.PoplPeoplesLR > 0 || languageStats.PoplPeoplesFPG > 0) && (
        <div>
          <div className="font-semibold text-sm mb-2">Unreached Populations</div>
          <div className="space-y-2">
            {languageStats.PoplPeoplesLR != null && languageStats.PoplPeoplesLR > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600">Least Reached</span>
                <div className="text-right">
                  <div className="font-medium text-sm">
                    {(languageStats.PoplPeoplesLR / 1000000).toFixed(2)}M
                  </div>
                  {languageStats.PoplPeoples != null && languageStats.PoplPeoples > 0 && (
                    <div className="text-xs text-neutral-500">
                      {((languageStats.PoplPeoplesLR / languageStats.PoplPeoples) * 100).toFixed(1)}%
                    </div>
                  )}
                </div>
              </div>
            )}
            {languageStats.PoplPeoplesFPG != null && languageStats.PoplPeoplesFPG > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600">Frontier People Groups</span>
                <div className="text-right">
                  <div className="font-medium text-sm">
                    {(languageStats.PoplPeoplesFPG / 1000000).toFixed(2)}M
                  </div>
                  {languageStats.PoplPeoples != null && languageStats.PoplPeoples > 0 && (
                    <div className="text-xs text-neutral-500">
                      {((languageStats.PoplPeoplesFPG / languageStats.PoplPeoples) * 100).toFixed(1)}%
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Religious Context */}
      {languageStats.PrimaryReligion && (
        <div>
          <div className="font-semibold text-sm mb-2">Religious Context</div>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-neutral-500">Primary Religion:</span>
              <span className="font-medium">{languageStats.PrimaryReligion}</span>
            </div>
            {languageStats.PercentChristianPC != null && (
              <div className="flex justify-between">
                <span className="text-neutral-500">% Christian:</span>
                <span className="font-medium text-blue-600">
                  {languageStats.PercentChristianPC.toFixed(1)}%
                </span>
              </div>
            )}
            {languageStats.PercentEvangelicalPC != null && (
              <div className="flex justify-between">
                <span className="text-neutral-500">% Evangelical:</span>
                <span className="font-medium text-purple-600">
                  {languageStats.PercentEvangelicalPC.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bible Translation Status */}
      <div>
        <div className="font-semibold text-sm mb-2">Bible Translation</div>
        <div className="space-y-2">
          {/* Status */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-neutral-600">Status</span>
            <span className={`text-sm font-medium px-2 py-1 rounded ${
              languageStats.BibleStatus === 'Yes' 
                ? 'bg-green-100 text-green-700'
                : languageStats.BibleStatus === 'New Testament'
                ? 'bg-blue-100 text-blue-700'
                : languageStats.BibleStatus === 'Portions'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-neutral-100 text-neutral-700'
            }`}>
              {languageStats.BibleStatus}
            </span>
          </div>

          {/* Years */}
          <div className="text-xs space-y-1">
            {languageStats.BibleYear && (
              <div className="flex justify-between">
                <span className="text-neutral-500">Full Bible:</span>
                <span className="font-medium">{languageStats.BibleYear}</span>
              </div>
            )}
            {languageStats.NTYear && (
              <div className="flex justify-between">
                <span className="text-neutral-500">New Testament:</span>
                <span className="font-medium">{languageStats.NTYear}</span>
              </div>
            )}
            {languageStats.PortionsYear && (
              <div className="flex justify-between">
                <span className="text-neutral-500">Portions:</span>
                <span className="font-medium">{languageStats.PortionsYear}</span>
              </div>
            )}
          </div>

          {/* Translation Need */}
          {languageStats.BibleTranslationNeed && languageStats.BibleTranslationNeed !== 'Unknown' && (
            <div className="text-xs bg-neutral-50 dark:bg-neutral-800/50 p-2 rounded">
              <span className="font-semibold text-neutral-700 dark:text-neutral-300">Need: </span>
              <span className="text-neutral-600 dark:text-neutral-400">{languageStats.BibleTranslationNeed}</span>
            </div>
          )}

          {/* Primary Text Status */}
          {(languageStats.BiblePrimaryText || languageStats.NTPrimaryText) && (
            <div className="text-xs space-y-1">
              {languageStats.BiblePrimaryText && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Bible Primary Text:</span>
                  <span className="font-medium">{languageStats.BiblePrimaryText}</span>
                </div>
              )}
              {languageStats.NTPrimaryText && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">NT Primary Text:</span>
                  <span className="font-medium">{languageStats.NTPrimaryText}</span>
                </div>
              )}
            </div>
          )}

          {/* Audio Status */}
          {(languageStats.BiblePrimaryAudio || languageStats.NTPrimaryAudio) && (
            <div className="text-xs space-y-1">
              {languageStats.BiblePrimaryAudio && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Bible Audio:</span>
                  <span className="font-medium">{languageStats.BiblePrimaryAudio}</span>
                </div>
              )}
              {languageStats.NTPrimaryAudio && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">NT Audio:</span>
                  <span className="font-medium">{languageStats.NTPrimaryAudio}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Audio Recordings */}
      {languageStats.AudioRecordings && (
        <div>
          <div className="font-semibold text-sm mb-2">Audio Resources</div>
          <div className="text-sm">
            <span className="text-neutral-600">Audio Recordings: </span>
            <span className="font-medium">{languageStats.AudioRecordings}</span>
          </div>
        </div>
      )}

      {/* Joshua Project Scale */}
      {languageStats.JPScalePC && (
        <div>
          <div className="font-semibold text-sm mb-2">Gospel Progress Scale</div>
          <div className="flex items-center gap-3">
            <div className={`${
              languageStats.JPScalePC === 1 ? 'bg-red-600' :
              languageStats.JPScalePC === 2 ? 'bg-orange-500' :
              languageStats.JPScalePC === 3 ? 'bg-yellow-500' :
              languageStats.JPScalePC === 4 ? 'bg-lime-500' :
              'bg-green-600'
            } text-white font-bold rounded-full w-10 h-10 flex items-center justify-center text-lg`}>
              {languageStats.JPScalePC}
            </div>
            <div className="text-sm">
              {languageStats.JPScaleText && (
                <div className="font-medium">{languageStats.JPScaleText}</div>
              )}
            </div>
          </div>
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


