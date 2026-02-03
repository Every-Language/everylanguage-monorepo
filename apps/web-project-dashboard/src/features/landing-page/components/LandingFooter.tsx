import React from 'react';
import { Link } from 'react-router-dom';
import {
  Mic,
  Headphones,
  Globe,
  Mail,
  MapPin,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';

const socialLinks = [
  {
    name: 'Facebook',
    href: '#',
    icon: (
      <svg className='w-5 h-5' fill='currentColor' viewBox='0 0 24 24'>
        <path d='M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' />
      </svg>
    ),
  },
  {
    name: 'Twitter',
    href: '#',
    icon: (
      <svg className='w-5 h-5' fill='currentColor' viewBox='0 0 24 24'>
        <path d='M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' />
      </svg>
    ),
  },
  {
    name: 'Instagram',
    href: '#',
    icon: (
      <svg className='w-5 h-5' fill='currentColor' viewBox='0 0 24 24'>
        <path d='M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z' />
      </svg>
    ),
  },
  {
    name: 'YouTube',
    href: '#',
    icon: (
      <svg className='w-5 h-5' fill='currentColor' viewBox='0 0 24 24'>
        <path d='M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z' />
      </svg>
    ),
  },
];

const navigationLinks = [
  { name: 'Home', to: '/' },
  { name: 'Languages', to: '/languages' },
  { name: 'Partnership', to: '/dashboard' },
  { name: 'Log in', to: '/login' },
  { name: 'Sign up', to: '/register' },
];

const toolsLinks = [
  { name: 'Recording App', href: '#', icon: Mic },
  { name: 'Audio Bible App', href: '#', icon: Headphones },
];

export const LandingFooter: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className='relative z-10 bg-neutral-900 dark:bg-neutral-950 overflow-hidden'>
      {/* Decorative gradient */}
      <div className='absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-neutral-700 to-transparent' />

      {/* Background pattern */}
      <div
        className='absolute inset-0 opacity-[0.02]'
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className='relative max-w-6xl mx-auto px-4 pt-16 pb-8'>
        {/* Main Footer Content */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12 mb-12'>
          {/* Brand Column */}
          <div className='lg:col-span-1'>
            <Link to='/' className='inline-flex items-center gap-2 mb-5 group'>
              <img
                src='/images/every-language-logo-300x221.png'
                alt='Every Language Logo'
                className='h-10 w-auto object-contain transition-transform group-hover:scale-105'
              />
              <span className='text-lg font-bold tracking-tight text-white'>
                Every
                <span className='text-accent-400'>Language</span>
              </span>
            </Link>
            <p className='text-sm text-neutral-400 mb-5 leading-relaxed'>
              Making the gospel available to all tribes and tongues through
              Bible translation and audio recordings.
            </p>
            <div className='flex items-center gap-2 text-sm text-neutral-500'>
              <Globe className='h-4 w-4 text-accent-500' />
              <span>Reaching every nation</span>
            </div>

            {/* Social Links */}
            <div className='flex items-center gap-3 mt-6'>
              {socialLinks.map(social => (
                <a
                  key={social.name}
                  href={social.href}
                  className='flex items-center justify-center w-9 h-9 rounded-lg bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white transition-all duration-200'
                  aria-label={social.name}>
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Navigation Column */}
          <div>
            <h3 className='text-xs font-semibold text-white uppercase tracking-wider mb-5'>
              Navigation
            </h3>
            <ul className='space-y-3'>
              {navigationLinks.map(link => (
                <li key={link.name}>
                  <Link
                    to={link.to}
                    className='group inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-white transition-colors'>
                    {link.name}
                    <ArrowUpRight className='w-3 h-3 opacity-0 -translate-y-0.5 translate-x-0.5 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0 transition-all' />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Tools Column */}
          <div>
            <h3 className='text-xs font-semibold text-white uppercase tracking-wider mb-5'>
              Tools
            </h3>
            <ul className='space-y-3'>
              {toolsLinks.map(link => {
                const Icon = link.icon;
                return (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className='group inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors'>
                      <Icon className='h-4 w-4 text-neutral-500 group-hover:text-accent-400 transition-colors' />
                      {link.name}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Contact Column */}
          <div>
            <h3 className='text-xs font-semibold text-white uppercase tracking-wider mb-5'>
              Contact
            </h3>
            <ul className='space-y-4'>
              <li>
                <a
                  href='mailto:info@everylanguage.org'
                  className='group flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors'>
                  <Mail className='h-4 w-4 text-neutral-500 group-hover:text-accent-400 transition-colors' />
                  info@everylanguage.org
                </a>
              </li>
              <li>
                <div className='flex items-start gap-2 text-sm text-neutral-400'>
                  <MapPin className='h-4 w-4 mt-0.5 flex-shrink-0 text-neutral-500' />
                  <span>Serving communities worldwide</span>
                </div>
              </li>
            </ul>

            {/* Newsletter signup hint */}
            <div className='mt-6 p-4 rounded-xl bg-white/5 border border-white/10'>
              <p className='text-xs text-neutral-400 mb-2'>
                Stay updated on our mission
              </p>
              <p className='text-sm text-white font-medium'>
                Newsletter coming soon
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className='border-t border-white/10 pt-8'>
          <div className='flex flex-col md:flex-row items-center justify-between gap-4'>
            {/* Copyright */}
            <div className='flex items-center gap-1.5 text-sm text-neutral-500'>
              <span>© {currentYear} Every Language.</span>
              <span className='hidden sm:inline'>Made with</span>
              <Sparkles className='hidden sm:inline w-3.5 h-3.5 text-amber-500' />
              <span className='hidden sm:inline'>for the nations.</span>
            </div>

            {/* Legal Links */}
            <div className='flex items-center gap-6'>
              <a
                href='#'
                className='text-sm text-neutral-500 hover:text-neutral-300 transition-colors'>
                Privacy Policy
              </a>
              <a
                href='#'
                className='text-sm text-neutral-500 hover:text-neutral-300 transition-colors'>
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
