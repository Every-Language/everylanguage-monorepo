import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  createSuccessResponse,
  createErrorResponse,
  createCorsResponse,
} from '../_shared/response-utils.ts';

/**
 * Scheduled function to expire bank transfers that haven't been received
 * Run daily via Supabase cron
 */
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return createCorsResponse();
  if (req.method !== 'POST')
    return createErrorResponse('Method not allowed', 405);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find expired adoptions on hold
    const { data: expiredAdoptions, error: fetchErr } = await supabase
      .from('language_adoptions')
      .select('id')
      .eq('status', 'on_hold')
      .not('bank_transfer_expiry_at', 'is', null)
      .lt('bank_transfer_expiry_at', new Date().toISOString());

    if (fetchErr) {
      console.error('Error fetching expired adoptions:', fetchErr);
      return createErrorResponse(`DB error: ${fetchErr.message}`, 500);
    }

    if (!expiredAdoptions || expiredAdoptions.length === 0) {
      console.log('No expired bank transfers found');
      return createSuccessResponse({
        expired: 0,
        message: 'No expired transfers',
      });
    }

    const expiredIds = expiredAdoptions.map(a => a.id);
    console.log(
      `Found ${expiredIds.length} expired bank transfers:`,
      expiredIds
    );

    // Update adoptions back to available
    const { error: updateAdoptionsErr } = await supabase
      .from('language_adoptions')
      .update({
        status: 'available',
        bank_transfer_expiry_at: null,
      })
      .in('id', expiredIds);

    if (updateAdoptionsErr) {
      console.error('Error updating adoptions:', updateAdoptionsErr);
      return createErrorResponse(
        `Failed to update adoptions: ${updateAdoptionsErr.message}`,
        500
      );
    }

    // Find and cancel related sponsorships
    const { data: relatedSponsorships, error: sponsorshipsErr } = await supabase
      .from('sponsorships')
      .select('id')
      .in('language_adoption_id', expiredIds)
      .eq('status', 'pending_bank_transfer');

    if (sponsorshipsErr) {
      console.error('Error fetching sponsorships:', sponsorshipsErr);
    } else if (relatedSponsorships && relatedSponsorships.length > 0) {
      const sponsorshipIds = relatedSponsorships.map(s => s.id);
      const { error: updateSponsorshipsErr } = await supabase
        .from('sponsorships')
        .update({ status: 'cancelled' })
        .in('id', sponsorshipIds);

      if (updateSponsorshipsErr) {
        console.error('Error updating sponsorships:', updateSponsorshipsErr);
      } else {
        console.log(`Cancelled ${sponsorshipIds.length} related sponsorships`);
      }
    }

    return createSuccessResponse({
      expired: expiredIds.length,
      adoptionIds: expiredIds,
      message: `Successfully expired ${expiredIds.length} bank transfers`,
    });
  } catch (e) {
    console.error('expire-bank-transfers error', e);
    return createErrorResponse((e as Error).message, 500);
  }
});
