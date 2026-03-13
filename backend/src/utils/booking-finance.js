export const RECEIVER_TYPES = new Set(['studio', 'artist']);

export function computeBookingTotalAmount(booking) {
  if (booking?.pricingType === 'hourly' && Array.isArray(booking?.projects) && booking.projects.length > 0) {
    const sum = booking.projects.reduce(
      (acc, project) => acc + (Number(project.hourlyRate) || 0) * (Number(project.agreedHours) || 0),
      0,
    );
    return sum > 0 ? sum : null;
  }
  return booking?.totalAmount != null ? Number(booking.totalAmount) : null;
}

export function computeCompletedPaymentTotals(payments = []) {
  return payments.reduce(
    (totals, payment) => {
      if (payment.status !== 'completed') return totals;
      const amount = Number(payment.amount) || 0;
      if (payment.receiverType === 'studio') totals.studioPaidTotal += amount;
      else if (payment.receiverType === 'artist') totals.artistPaidTotal += amount;
      totals.paidTotal += amount;
      return totals;
    },
    { studioPaidTotal: 0, artistPaidTotal: 0, paidTotal: 0 },
  );
}

export function decorateBookingFinancials(booking) {
  const computedTotalAmount = computeBookingTotalAmount(booking);
  const paid = computeCompletedPaymentTotals(booking?.payments || []);
  const remainingAmount = computedTotalAmount != null
    ? Math.max(0, computedTotalAmount - paid.paidTotal)
    : null;
  const status = remainingAmount != null && remainingAmount <= 0 && paid.paidTotal > 0 ? 'Paid' : 'Unpaid';

  return {
    ...booking,
    computedTotalAmount,
    studioPaidTotal: paid.studioPaidTotal,
    artistPaidTotal: paid.artistPaidTotal,
    paidTotal: paid.paidTotal,
    remainingAmount,
    status,
  };
}

export async function syncBookingReceivableCache(tx, bookingId) {
  const booking = await tx.booking.findUnique({
    where: { id: bookingId },
    include: { payments: true, projects: true },
  });
  if (!booking) return null;

  const paid = computeCompletedPaymentTotals(booking.payments || []);
  const computedTotalAmount = computeBookingTotalAmount(booking);
  const remainingAmount = computedTotalAmount != null
    ? Math.max(0, computedTotalAmount - paid.paidTotal)
    : null;
  const status = remainingAmount != null && remainingAmount <= 0 && paid.paidTotal > 0 ? 'Paid' : 'Unpaid';

  return tx.booking.update({
    where: { id: bookingId },
    data: {
      status,
    },
    include: {
      artist: true,
      customer: true,
      studio: true,
      payments: {
        include: {
          paymentDestination: { include: { studio: true, artist: true } },
          receiverStudio: true,
          receiverArtist: true,
        },
      },
      projects: { include: { sessions: true } },
    },
  });
}
