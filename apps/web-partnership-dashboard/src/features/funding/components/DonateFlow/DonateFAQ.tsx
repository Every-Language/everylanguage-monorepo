import React from 'react';
import {
  TooltipProvider,
  TooltipRoot,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/components/ui/Tooltip';

const faqItems = [
  {
    question: 'Is my donation secure?',
    answer:
      'Yes, absolutely. We use industry-standard encryption and secure payment processing through Stripe. Your payment information is never stored on our servers and all transactions are protected with bank-level security.',
  },
  {
    question: 'Is this tax-deductible?',
    answer:
      'Yes, Every Language is a registered 501(c)(3) nonprofit organization. All donations are tax-deductible to the fullest extent allowed by law. You will receive a receipt for your records after completing your donation.',
  },
  {
    question: 'Can I cancel my recurring donation?',
    answer:
      'Yes, you can cancel your recurring donation at any time from your dashboard. Simply navigate to your donation history and select "Cancel Subscription". No questions asked, and there are no cancellation fees.',
  },
];

interface DonateFAQProps {
  className?: string;
}

export const DonateFAQ: React.FC<DonateFAQProps> = ({ className = '' }) => {
  const [openStates, setOpenStates] = React.useState<Record<number, boolean>>(
    {}
  );
  const [clickOpened, setClickOpened] = React.useState<Record<number, boolean>>(
    {}
  );

  const handleOpenChange = (index: number, open: boolean, isHover: boolean) => {
    // If it was opened by click, don't let hover-out close it
    if (!open && clickOpened[index] && isHover) {
      return; // Don't close if it was click-opened and this is a hover-out event
    }

    setOpenStates(prev => ({
      ...prev,
      [index]: open,
    }));

    // Clear click-opened flag when closing
    if (!open) {
      setClickOpened(prev => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
    }
  };

  const handleClick = (
    index: number,
    currentOpen: boolean,
    e: React.MouseEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();
    // If already open, keep it open; if closed, open it
    if (!currentOpen) {
      setOpenStates(prev => ({
        ...prev,
        [index]: true,
      }));
      setClickOpened(prev => ({
        ...prev,
        [index]: true,
      }));
    }
    // If already open, do nothing (keep it open)
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={`flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-neutral-500 ${className}`}
      >
        {faqItems.map((item, index) => {
          const isOpen = openStates[index] ?? false;
          return (
            <React.Fragment key={item.question}>
              <TooltipRoot
                open={isOpen}
                onOpenChange={open => {
                  // This fires for both hover and other interactions
                  // If it's closing and was click-opened, assume it's hover-out (click-outside handled separately)
                  const isHover = !open && clickOpened[index];
                  handleOpenChange(index, open, isHover);
                }}
              >
                <TooltipTrigger asChild>
                  <button
                    onClick={e => handleClick(index, isOpen, e)}
                    className='hover:text-neutral-700 dark:hover:text-neutral-300 underline decoration-dotted cursor-help transition-colors'
                  >
                    {item.question}
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  className='max-w-xs p-4'
                  sideOffset={8}
                  onPointerDownOutside={() => {
                    // Click outside closes it - clear click-opened flag first
                    setClickOpened(prev => {
                      const next = { ...prev };
                      delete next[index];
                      return next;
                    });
                    handleOpenChange(index, false, false);
                  }}
                  onEscapeKeyDown={() => {
                    // ESC key closes it - clear click-opened flag first
                    setClickOpened(prev => {
                      const next = { ...prev };
                      delete next[index];
                      return next;
                    });
                    handleOpenChange(index, false, false);
                  }}
                >
                  <p className='text-sm leading-relaxed'>{item.answer}</p>
                </TooltipContent>
              </TooltipRoot>
              {index < faqItems.length - 1 && (
                <span className='text-neutral-400'>•</span>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </TooltipProvider>
  );
};

export default DonateFAQ;
