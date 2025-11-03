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
  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={`flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-neutral-500 ${className}`}
      >
        {faqItems.map((item, index) => (
          <React.Fragment key={item.question}>
            <TooltipRoot>
              <TooltipTrigger asChild>
                <button className='hover:text-neutral-700 dark:hover:text-neutral-300 underline decoration-dotted cursor-help transition-colors'>
                  {item.question}
                </button>
              </TooltipTrigger>
              <TooltipContent className='max-w-xs'>
                <p className='text-sm'>{item.answer}</p>
              </TooltipContent>
            </TooltipRoot>
            {index < faqItems.length - 1 && (
              <span className='text-neutral-400'>•</span>
            )}
          </React.Fragment>
        ))}
      </div>
    </TooltipProvider>
  );
};

export default DonateFAQ;
