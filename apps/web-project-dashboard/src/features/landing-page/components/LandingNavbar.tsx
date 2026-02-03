import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Mic, Headphones } from 'lucide-react';
import { Button } from '../../../shared/design-system/components/Button';
import { ThemeToggle } from './ThemeToggle';

// Tools dropdown menu items
const toolsMenuItems = [
  { name: 'Recording App', href: '', icon: Mic },
  { name: 'Audio Bible App', href: '', icon: Headphones },
];

// Tools Dropdown Component
const ToolsDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className='relative' ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className='flex items-center gap-1 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors'>
        Tools
        <ChevronDown
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className='absolute top-full left-0 mt-2 w-48 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-xl shadow-neutral-200/50 dark:shadow-none overflow-hidden z-50'>
          {toolsMenuItems.map(item => {
            const Icon = item.icon;
            return (
              <a
                key={item.name}
                href={item.href || '#'}
                onClick={e => {
                  if (!item.href) e.preventDefault();
                  setIsOpen(false);
                }}
                className='flex items-center gap-3 px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white transition-colors'>
                <Icon className='h-4 w-4 text-accent-500' />
                {item.name}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const LandingNavbar: React.FC = () => {
  return (
    <nav className='relative z-10 mx-auto w-full flex max-w-[95%] items-center justify-between px-1 py-3 lg:px-2'>
      <Link to='/' className='flex items-center gap-2'>
        <img
          src='/images/every-language-logo-300x221.png'
          alt='Every Language Logo'
          className='h-10 w-auto object-contain'
        />
        <span className='text-xl font-bold tracking-tight text-neutral-900 dark:text-white'>
          Every
          <span className='text-accent-600 dark:text-accent-400'>Language</span>
        </span>
      </Link>

      <div className='flex items-center gap-6'>
        <div className='hidden md:flex items-center gap-6'>
          <Link
            to='/languages'
            className='text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors'>
            Languages
          </Link>
          <Link
            to='#'
            className='text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors'>
            Partnership
          </Link>
          <ToolsDropdown />
        </div>
        <ThemeToggle />
        <Link to='/login'>
          <Button
            variant='ghost'
            className='text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5'>
            Log in
          </Button>
        </Link>
        <Link to='/register'>
          <Button className='bg-accent-500 text-white dark:text-neutral-950 hover:bg-accent-600 dark:hover:bg-accent-400 shadow-lg shadow-accent-500/20 border-none'>
            Sign up
          </Button>
        </Link>
      </div>
    </nav>
  );
};
