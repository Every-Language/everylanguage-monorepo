import React, { useState } from 'react';
import { useJPCountryData, useJPLanguageData, useHasJPCountryData, useHasJPLanguageData } from '../hooks/useJoshuaProject';
import { ChevronDownIcon, ChevronUpIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

type JPResourcesSectionProps = {
  type: 'language' | 'region';
  entityId: string;
};

/**
 * Resources Section displays links to Joshua Project profiles and external resources
 * (JESUS Film, GRN recordings, etc.)
 */
export const JPResourcesSection: React.FC<JPResourcesSectionProps> = ({ type, entityId }) => {
  const isRegion = type === 'region';
  const hasCountryData = useHasJPCountryData(isRegion ? entityId : null);
  const hasLanguageData = useHasJPLanguageData(!isRegion ? entityId : null);
  
  const countryData = useJPCountryData(isRegion ? entityId : null);
  const languageData = useJPLanguageData(!isRegion ? entityId : null);

  const data = isRegion ? countryData : languageData;
  const stats = isRegion ? countryData.countryStats : languageData.languageStats;
  const peopleGroups = isRegion ? countryData.peopleGroups : languageData.peopleGroups;
  const hasAnyData = isRegion ? hasCountryData : hasLanguageData;

  const [expandedCategory, setExpandedCategory] = useState<string | null>('profiles');

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  };

  // Resource category component
  const ResourceCategory = ({ 
    title, 
    categoryId, 
    children 
  }: { 
    title: string; 
    categoryId: string; 
    children: React.ReactNode 
  }) => {
    const isExpanded = expandedCategory === categoryId;
    
    return (
      <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleCategory(categoryId)}
          className="w-full flex items-center justify-between p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
        >
          <span className="font-medium text-sm">{title}</span>
          {isExpanded ? (
            <ChevronUpIcon className="w-4 h-4 text-neutral-500" />
          ) : (
            <ChevronDownIcon className="w-4 h-4 text-neutral-500" />
          )}
        </button>
        {isExpanded && (
          <div className="px-3 pb-3 space-y-2">
            {children}
          </div>
        )}
      </div>
    );
  };

  // Resource link component
  const ResourceLink = ({ 
    label, 
    href, 
    status 
  }: { 
    label: string; 
    href: string; 
    status?: string 
  }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between py-2 px-3 bg-neutral-50 dark:bg-neutral-800/50 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors group"
    >
      <div className="flex-1">
        <div className="text-sm font-medium text-neutral-700 group-hover:text-blue-600">
          {label}
        </div>
        {status && (
          <div className="text-xs text-neutral-500 mt-0.5">{status}</div>
        )}
      </div>
      <ArrowTopRightOnSquareIcon className="w-4 h-4 text-neutral-400 group-hover:text-blue-600" />
    </a>
  );

  // Early returns AFTER all hooks
  // Don't show section if no external ID mapping exists
  if (!hasAnyData) {
    return null;
  }

  if (data.isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-12 bg-neutral-200 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (data.error || !stats) {
    return (
      <div className="text-sm text-neutral-500">
        Resource links not available
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Joshua Project Profiles */}
      <ResourceCategory title="Joshua Project Profiles" categoryId="profiles">
        {isRegion && countryData.countryStats && (
          <ResourceLink
            label={`${countryData.countryStats.Ctry} Country Profile`}
            href={`https://joshuaproject.net/countries/${countryData.countryStats.ROG3}`}
          />
        )}
        
        {!isRegion && languageData.languageStats && (
          <ResourceLink
            label={`${languageData.languageStats.Language} Language Profile`}
            href={`https://joshuaproject.net/languages/${languageData.languageStats.ROL3}`}
          />
        )}

        {/* Top 3 People Groups */}
        {peopleGroups && peopleGroups.length > 0 && (
          <>
            <div className="text-xs text-neutral-500 font-medium mt-2 mb-1">
              People Group Profiles
            </div>
            {peopleGroups.slice(0, 3).map((group) => (
              <ResourceLink
                key={`${group.PeopleID3}-${group.ROG3}`}
                label={group.PeopNameInCountry}
                href={group.PeopleGroupURL}
                status={`${group.Ctry} - ${group.Population != null ? group.Population.toLocaleString() : 'N/A'} pop.`}
              />
            ))}
          </>
        )}
      </ResourceCategory>

      {/* JESUS Film Resources */}
      {isRegion && countryData.countryStats?.JF === 'Y' && (
        <ResourceCategory title="JESUS Film" categoryId="jesus-film">
          <ResourceLink
            label="JESUS Film Project"
            href="https://jesusfilm.org"
            status={countryData.countryStats.JFPrimaryText || 'Available'}
          />
          {countryData.countryStats.PrimaryLanguageName && (
            <div className="text-xs text-neutral-600 dark:text-neutral-400 px-3 py-2 bg-neutral-50 dark:bg-neutral-800/50 rounded">
              Available in {countryData.countryStats.PrimaryLanguageName}
            </div>
          )}
        </ResourceCategory>
      )}

      {/* Audio Scripture & Recordings */}
      {(
        (isRegion && countryData.countryStats?.AudioScripture === 'Y') ||
        (!isRegion && languageData.languageStats?.AudioRecordings === 'Y')
      ) && (
        <ResourceCategory title="Audio Scripture" categoryId="audio">
          <ResourceLink
            label="Faith Comes By Hearing"
            href="https://www.faithcomesbyhearing.com"
            status="Audio Bible"
          />
          {isRegion && countryData.countryStats?.GRN === 'Y' && (
            <ResourceLink
              label="Global Recordings Network"
              href="https://globalrecordings.net"
              status="Gospel recordings"
            />
          )}
        </ResourceCategory>
      )}

      {/* Bible Translation Resources */}
      {stats.BibleStatus && stats.BibleStatus !== 'Unknown' && (
        <ResourceCategory title="Bible Translation" categoryId="bible">
          <ResourceLink
            label="Wycliffe Bible Translators"
            href="https://www.wycliffe.org"
            status="Bible translation organization"
          />
          <ResourceLink
            label="Bible.com"
            href="https://www.bible.com"
            status="Read the Bible online"
          />
          {stats.BibleYear && (
            <div className="text-xs text-neutral-600 dark:text-neutral-400 px-3 py-2 bg-neutral-50 dark:bg-neutral-800/50 rounded">
              Full Bible completed in {stats.BibleYear}
            </div>
          )}
        </ResourceCategory>
      )}

      {/* General Mission Resources */}
      <ResourceCategory title="Mission Resources" categoryId="mission">
        <ResourceLink
          label="Joshua Project Home"
          href="https://joshuaproject.net"
          status="Unreached peoples data"
        />
        <ResourceLink
          label="Operation World"
          href="https://operationworld.org"
          status="Prayer and mission info"
        />
        {isRegion && countryData.countryStats && (
          <ResourceLink
            label="PrayerCast"
            href={`https://www.prayercast.com/search.html?q=${encodeURIComponent(countryData.countryStats.Ctry)}`}
            status="Video prayer guides"
          />
        )}
      </ResourceCategory>

      {/* Map Resources */}
      {isRegion && countryData.countryStats && (
        <ResourceCategory title="Maps & Geography" categoryId="maps">
          <ResourceLink
            label="View on Joshua Project Map"
            href={`https://joshuaproject.net/countries/${countryData.countryStats.ROG3}`}
          />
          {countryData.countryStats.Longitude && countryData.countryStats.Latitude && (
            <ResourceLink
              label="View on Google Maps"
              href={`https://www.google.com/maps/search/?api=1&query=${countryData.countryStats.Latitude},${countryData.countryStats.Longitude}`}
            />
          )}
        </ResourceCategory>
      )}

      {/* Data Source Attribution */}
      <div className="text-xs text-neutral-400 pt-2 border-t border-neutral-200 dark:border-neutral-800">
        Resource links from{' '}
        <a
          href="https://joshuaproject.net"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-neutral-600"
        >
          Joshua Project
        </a>
        {' '}and partner organizations
      </div>
    </div>
  );
};


