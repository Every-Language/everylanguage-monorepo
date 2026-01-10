import React from 'react';
import { Link } from 'react-router-dom';
import { Mic, Headphones, Globe, Mail, MapPin } from 'lucide-react';

export const LandingFooter: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className='relative z-10 bg-neutral-100 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800'>
      <div className='max-w-6xl mx-auto px-4 py-12 lg:py-16'>
        {/* Main Footer Content */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12'>
          {/* Brand Column */}
          <div className='lg:col-span-1'>
            <Link to='/' className='flex items-center gap-2 mb-4'>
              <img
                src='/images/every-language-logo-300x221.png'
                alt='Every Language Logo'
                className='h-10 w-auto object-contain'
              />
              <span className='text-lg font-bold tracking-tight text-neutral-900 dark:text-white'>
                Every
                <span className='text-accent-600 dark:text-accent-400'>
                  Language
                </span>
              </span>
            </Link>
            <p className='text-sm text-neutral-600 dark:text-neutral-400 mb-4 leading-relaxed'>
              Making the gospel available to all tribes and tongues through
              Bible translation and audio recordings.
            </p>
            <div className='flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-500'>
              <Globe className='h-4 w-4' />
              <span>Reaching every nation</span>
            </div>
          </div>

          {/* Navigation Column */}
          <div>
            <h3 className='text-sm font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-4'>
              Navigation
            </h3>
            <ul className='space-y-3'>
              <li>
                <Link
                  to='/'
                  className='text-sm text-neutral-600 dark:text-neutral-400 hover:text-accent-600 dark:hover:text-accent-400 transition-colors'>
                  Home
                </Link>
              </li>
              <li>
                <Link
                  to='/languages'
                  className='text-sm text-neutral-600 dark:text-neutral-400 hover:text-accent-600 dark:hover:text-accent-400 transition-colors'>
                  Languages
                </Link>
              </li>
              <li>
                <Link
                  to='/dashboard'
                  className='text-sm text-neutral-600 dark:text-neutral-400 hover:text-accent-600 dark:hover:text-accent-400 transition-colors'>
                  Partnership
                </Link>
              </li>
              <li>
                <Link
                  to='/login'
                  className='text-sm text-neutral-600 dark:text-neutral-400 hover:text-accent-600 dark:hover:text-accent-400 transition-colors'>
                  Log in
                </Link>
              </li>
              <li>
                <Link
                  to='/register'
                  className='text-sm text-neutral-600 dark:text-neutral-400 hover:text-accent-600 dark:hover:text-accent-400 transition-colors'>
                  Sign up
                </Link>
              </li>
            </ul>
          </div>

          {/* Tools Column */}
          <div>
            <h3 className='text-sm font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-4'>
              Tools
            </h3>
            <ul className='space-y-3'>
              <li>
                <a
                  href='#'
                  className='flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-accent-600 dark:hover:text-accent-400 transition-colors'>
                  <Mic className='h-4 w-4' />
                  Recording App
                </a>
              </li>
              <li>
                <a
                  href='#'
                  className='flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-accent-600 dark:hover:text-accent-400 transition-colors'>
                  <Headphones className='h-4 w-4' />
                  Audio Bible App
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Column */}
          <div>
            <h3 className='text-sm font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-4'>
              Contact
            </h3>
            <ul className='space-y-3'>
              <li>
                <a
                  href='mailto:info@everylanguage.org'
                  className='flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-accent-600 dark:hover:text-accent-400 transition-colors'>
                  <Mail className='h-4 w-4' />
                  info@everylanguage.org
                </a>
              </li>
              <li>
                <div className='flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-400'>
                  <MapPin className='h-4 w-4 mt-0.5 flex-shrink-0' />
                  <span>Serving communities worldwide</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className='border-t border-neutral-200 dark:border-neutral-800 mt-10 pt-8'>
          <div className='flex flex-col md:flex-row items-center justify-between gap-4'>
            {/* Copyright */}
            <p className='text-sm text-neutral-500 dark:text-neutral-500'>
              © {currentYear} Every Language. All rights reserved.
            </p>

            {/* Legal Links */}
            <div className='flex items-center gap-6'>
              <a
                href='#'
                className='text-sm text-neutral-500 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors'>
                Privacy Policy
              </a>
              <a
                href='#'
                className='text-sm text-neutral-500 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors'>
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
