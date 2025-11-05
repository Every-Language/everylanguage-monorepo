import React from 'react';
import { Input } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';
import { createLead } from '../../api/fundingApi';
import { CustomPhoneInput } from '@/features/auth/components/CustomPhoneInput';
import { PartnerOrgSelector } from './PartnerOrgSelector';
import { StepActionsContext } from './StepActionsContext';
import type { OrgSelection } from '../../state/types';

export const StepDetails: React.FC<{ flow: any; hideButton?: boolean }> = ({
  flow,
  hideButton = false,
}) => {
  const { setSubmitAction } = React.useContext(StepActionsContext);
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [orgSelection, setOrgSelection] = React.useState<OrgSelection>({
    orgMode: 'individual',
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isAdoptionFlow = flow.state.intent === 'adopt';

  const handleSubmit = React.useCallback(async () => {
    // simple validation
    const emailValid = /.+@.+\..+/.test(email);
    if (!firstName || !lastName || !emailValid) {
      setError('Please enter first name, last name, and a valid email.');
      return;
    }

    // Validate org selection for adoption
    if (isAdoptionFlow) {
      if (
        orgSelection.orgMode === 'new' &&
        !orgSelection.new_partner_org?.name
      ) {
        setError('Please enter an organization name.');
        return;
      }
      if (orgSelection.orgMode === 'existing' && !orgSelection.partner_org_id) {
        setError('Please select an organization.');
        return;
      }
    }

    setError(null);
    setLoading(true);
    try {
      const intent = flow.state.intent;
      const languageIds =
        intent === 'adopt' ? (flow.state.adopt?.languageIds ?? []) : undefined;
      // Non-blocking CRM call
      void createLead({
        firstName,
        lastName,
        email,
        phone,
        intent,
        languageIds,
      });
      flow.setDonor({ firstName, lastName, email, phone });
      if (isAdoptionFlow) {
        flow.setOrgSelection(orgSelection);
      }

      // Note: Pre-fetching for ops flow happens in StepConversion instead
      // because the user might change from one-time to monthly there

      flow.next();
    } finally {
      setLoading(false);
    }
  }, [firstName, lastName, email, phone, orgSelection, isAdoptionFlow, flow]);

  // Register submit action when button is hidden (adopt flow)
  React.useEffect(() => {
    if (hideButton) {
      setSubmitAction(() => handleSubmit);
      return () => setSubmitAction(null);
    }
  }, [hideButton, handleSubmit, setSubmitAction]);

  return (
    <div className='space-y-3'>
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
        <Input
          placeholder='First name'
          value={firstName}
          onChange={e => setFirstName(e.target.value)}
        />
        <Input
          placeholder='Last name'
          value={lastName}
          onChange={e => setLastName(e.target.value)}
        />
        <div className='sm:col-span-2'>
          <Input
            placeholder='Email'
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>
        <div className='sm:col-span-2'>
          <CustomPhoneInput value={phone} onChange={v => setPhone(v || '')} />
        </div>
      </div>

      {/* Only show PartnerOrgSelector for adoption flow */}
      {isAdoptionFlow && (
        <div className='pt-2'>
          <PartnerOrgSelector value={orgSelection} onChange={setOrgSelection} />
        </div>
      )}

      {error && <div className='text-sm text-error-600'>{error}</div>}
      {!hideButton && (
        <div className='pt-2 flex justify-end'>
          <Button onClick={handleSubmit} loading={loading}>
            Continue
          </Button>
        </div>
      )}
    </div>
  );
};

export default StepDetails;
