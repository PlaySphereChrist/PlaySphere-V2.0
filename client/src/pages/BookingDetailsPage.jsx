import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { cancelBooking, getBooking } from '../features/bookings/api';
import { formatDate } from '../utils/dateTime';
import {
  createGroundBookingOrder,
  processGroundBookingRefund,
  verifyGroundBookingPayment,
} from '../features/payments/api';
import {
  PsButton,
  PsCard,
  PsBadge,
  PsAlert,
  PsInput,
  PsPageHeader,
  PsLoading,
  PsBackButton,
  PsErrorState
} from '../components/ui';

const formatCurrency = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
}).format(Number(value) || 0);

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function BookingDetailsPage() {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentResult, setPaymentResult] = useState(null);

  const [refundLoading, setRefundLoading] = useState(false);
  const [refundError, setRefundError] = useState('');
  const [refundSuccess, setRefundSuccess] = useState('');

  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [cancelResult, setCancelResult] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const fetchBooking = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getBooking(bookingId);
      setBooking(res.data.booking);
    } catch (err) {
      setError(err.message || 'Failed to load booking details');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  const handleCancel = async (e) => {
    e.preventDefault();
    try {
      setCancelling(true);
      setCancelError('');
      const res = await cancelBooking(bookingId, cancelReason);
      setCancelResult(res.message);
      setShowCancelModal(false);
      fetchBooking();
    } catch (err) {
      setCancelError(err.message || 'Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  const handlePayNow = async () => {
    setPaymentLoading(true);
    setPaymentError('');
    setPaymentResult(null);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setPaymentError('Failed to load payment gateway. Please check your internet connection and try again.');
        setPaymentLoading(false);
        return;
      }

      let orderData;
      try {
        const orderRes = await createGroundBookingOrder(bookingId);
        orderData = orderRes.data;
      } catch (err) {
        setPaymentError(err.message || 'Failed to create payment order');
        setPaymentLoading(false);
        return;
      }

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.order_id,
        name: 'PlaySphere',
        description: `Ground Booking Advance Payment`,
        prefill: {
          email: booking?.booked_by_user_email || '',
        },
        theme: { color: '#6E1423' },
        handler: async function (response) {
          try {
            const verifyRes = await verifyGroundBookingPayment(bookingId, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setPaymentResult({
              captured: verifyRes.data.captured,
              status: verifyRes.data.status,
            });
            fetchBooking();
          } catch (err) {
            setPaymentError(
              err.message || 'Payment verification failed. Contact support if amount was deducted.'
            );
          } finally {
            setPaymentLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setPaymentLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        setPaymentError(
          `Payment failed: ${response.error?.description || 'Unknown error'}. Please try again.`
        );
        setPaymentLoading(false);
      });
      rzp.open();

    } catch (err) {
      setPaymentError(err.message || 'Unexpected payment error');
      setPaymentLoading(false);
    }
  };

  const handleProcessRefund = async () => {
    setRefundLoading(true);
    setRefundError('');
    setRefundSuccess('');
    try {
      const res = await processGroundBookingRefund(bookingId);
      setRefundSuccess(res.message || 'Refund processed successfully.');
      fetchBooking();
    } catch (err) {
      setRefundError(err.message || 'Refund processing failed');
    } finally {
      setRefundLoading(false);
    }
  };

  if (loading) return <PsLoading />;
  
  if (error && !booking) {
    return (
      <div className="space-y-4">
        <PsBackButton to="/bookings" label="Back to Bookings" />
        <PsErrorState message={error} retry={fetchBooking} />
      </div>
    );
  }

  if (!booking) return null;

  let dStr = booking.slot_date;
  if (dStr && dStr.includes('T')) dStr = dStr.split('T')[0];

  const getStatusVariant = (status) => {
    switch (status) {
      case 'confirmed': return 'success';
      case 'pending': return 'warning';
      case 'cancelled': return 'danger';
      case 'completed': return 'default';
      default: return 'default';
    }
  };

  const getPaymentStatusVariant = (status) => {
    switch (status) {
      case 'captured': return 'success';
      case 'failed': return 'danger';
      case 'refunded': return 'default';
      case 'authorized': return 'default';
      default: return 'warning';
    }
  };

  const isCancellable = ['pending', 'confirmed'].includes(booking.status);
  const isPending = booking.status === 'pending';
  const paymentCaptured = booking.payment_status === 'captured';
  const paymentAuthorized = booking.payment_status === 'authorized';
  const paymentRefunded = booking.payment_status === 'refunded';

  const canPay = isPending && !paymentCaptured && !paymentAuthorized && booking.status !== 'cancelled';
  const canRequestRefund = booking.status === 'cancelled' && paymentCaptured && !paymentRefunded;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <PsBackButton to="/bookings" label="Back to Bookings" />
      <PsPageHeader title="Booking Details" />

      {error && booking && (
        <PsAlert variant="warning" className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span>Could not refresh the booking details: {error}</span>
          <PsButton size="sm" variant="secondary" onClick={fetchBooking}>Retry</PsButton>
        </PsAlert>
      )}
      {cancelResult && <PsAlert variant="success">{cancelResult}</PsAlert>}
      {paymentResult?.captured && (
        <PsAlert variant="success">
          ✓ Payment captured successfully.
        </PsAlert>
      )}
      {(paymentResult?.status === 'authorized' || paymentAuthorized) && !paymentCaptured && (
        <PsAlert variant="info">
          Payment is authorized and awaiting capture by Razorpay. Your booking will be confirmed after capture.
        </PsAlert>
      )}
      {refundSuccess && <PsAlert variant="success">{refundSuccess}</PsAlert>}

      <PsCard>
        <div className="px-6 py-5 flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-border bg-pill-hover rounded-t-2xl">
          <div>
            <h3 className="text-xl font-serif font-bold text-primary">
              {booking.ground_name}
            </h3>
            <p className="mt-1 text-sm text-secondary">
              Booking ID: {booking.id}
            </p>
          </div>
          <PsBadge variant={getStatusVariant(booking.status)}>
            {booking.status.toUpperCase()}
          </PsBadge>
        </div>
        
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-secondary">Date &amp; Time</p>
            <p className="mt-1 text-sm text-primary">
              {formatDate(dStr)} at {booking.start_time?.slice(0,5)} - {booking.end_time?.slice(0,5)}
            </p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-secondary">Location</p>
            <p className="mt-1 text-sm text-primary">
              {booking.ground_address}, {booking.ground_city}
            </p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-secondary">Sport</p>
            <p className="mt-1 text-sm text-primary">
              {booking.sport_name || 'General'}
            </p>
          </div>
          
          <div className="bg-surface border border-border p-3 rounded-xl sm:col-span-2 sm:max-w-md">
            <p className="text-sm font-medium text-secondary mb-2 border-b border-border pb-1">Pricing</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-secondary">Total booking price</span>
                <span className="font-bold text-primary">{formatCurrency(booking.total_price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Advance payment</span>
                <span className="font-medium text-primary">{formatCurrency(booking.advance_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Remaining, due at venue</span>
                <span className="font-medium text-primary">{formatCurrency(booking.remaining_amount)}</span>
              </div>
            </div>
            <p className="mt-3 rounded-lg bg-pill p-3 text-xs text-secondary">
              Cancellation policy: the advance is refundable if you cancel more than 2 hours before the slot. If you cancel within 2 hours, the advance is retained.
            </p>
          </div>
          
          <div className="sm:col-span-2">
            <p className="text-sm font-medium text-secondary">Payment Status</p>
            <div className="mt-2 flex items-center gap-2">
              <PsBadge variant={getPaymentStatusVariant(booking.payment_status)} className="capitalize">
                {booking.payment_status || 'created'}
              </PsBadge>
              {booking.payment_type && (
                <span className="text-secondary text-xs">({booking.payment_type})</span>
              )}
            </div>
            {booking.advance_paid_at && (
              <p className="mt-2 text-xs text-secondary">
                Paid on: {new Date(booking.advance_paid_at).toLocaleString()}
              </p>
            )}
          </div>
          
          {booking.notes && (
            <div className="sm:col-span-2">
              <p className="text-sm font-medium text-secondary">Notes</p>
              <p className="mt-1 text-sm text-primary bg-pill p-3 rounded-lg">
                {booking.notes}
              </p>
            </div>
          )}
          
          {booking.status === 'cancelled' && (
            <div className="sm:col-span-2 bg-error/5 border border-error/20 p-4 rounded-xl">
              <p className="text-sm font-bold text-error">Cancellation Info</p>
              <div className="mt-1 text-sm text-error/80">
                {booking.cancelled_at && <p>Cancelled on: {new Date(booking.cancelled_at).toLocaleString()}</p>}
                {booking.cancellation_reason && <p>Reason: {booking.cancellation_reason}</p>}
              </div>
            </div>
          )}
        </div>
      </PsCard>

      {/* === PAYMENT SECTION === */}
      {canPay && (
        <PsCard className="p-6 border-maroon/20 bg-maroon/5">
          <p className="text-xs font-semibold uppercase tracking-wide text-maroon">Next step</p>
          <h3 className="mt-1 text-lg font-serif font-bold text-primary">Pay the booking advance</h3>
          <p className="mt-1 text-sm text-secondary">
            Pay {formatCurrency(booking.advance_amount)} now to confirm your booking. The remaining {formatCurrency(booking.remaining_amount)} is due at the venue.
          </p>
          {paymentError && <PsAlert variant="error" className="mt-4">{paymentError}</PsAlert>}
          <div className="mt-5">
            <PsButton
              onClick={handlePayNow}
              disabled={paymentLoading}
              className="w-full sm:w-auto"
            >
              {paymentLoading ? 'Processing...' : `Pay ${formatCurrency(booking.advance_amount)} via Razorpay`}
            </PsButton>
          </div>
          <p className="mt-3 text-xs text-muted">Powered by Razorpay Test Mode. No real money is charged.</p>
        </PsCard>
      )}

      {/* === CASUAL GAME HOSTING SECTION === */}
      {booking.status !== 'cancelled' && (
        <PsCard className="p-6 border-maroon/20 bg-surface">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-serif font-bold text-primary flex items-center gap-2">
                <span>⚽</span> Casual Pickup Game
              </h3>
              <p className="mt-1 text-sm text-secondary">
                {booking.casual_games_count > 0
                  ? 'A casual game is hosted for this ground reservation.'
                  : 'Want to play with others? Host an open casual game for this booked slot and invite players!'}
              </p>
            </div>
            {booking.casual_games_count > 0 ? (
              <Link to={`/casual-games/${booking.casual_game_id}`}>
                <PsButton variant="secondary">View Casual Game</PsButton>
              </Link>
            ) : (
              <Link to={`/casual-games/create?booking_id=${booking.id}`}>
                <PsButton>Host Casual Game</PsButton>
              </Link>
            )}
          </div>
        </PsCard>
      )}

      {/* === REFUND SECTION === */}
      {canRequestRefund && (
        <PsCard className="p-6 border-gold/40 bg-gold/5">
          <h3 className="text-lg font-serif font-bold text-primary">Advance Refund</h3>
          <p className="mt-1 text-sm text-secondary">
            Your booking was cancelled more than 2 hours before the slot. Your advance payment of {formatCurrency(booking.advance_amount)} is eligible for a refund.
          </p>
          {refundError && <PsAlert variant="error" className="mt-4">{refundError}</PsAlert>}
          <div className="mt-5">
            <PsButton
              onClick={handleProcessRefund}
              disabled={refundLoading}
              style={{ backgroundColor: '#D97706', color: 'white' }}
            >
              {refundLoading ? 'Processing Refund...' : 'Process Refund'}
            </PsButton>
          </div>
        </PsCard>
      )}

      {/* === CANCELLATION SECTION === */}
      {isCancellable && !showCancelModal && (
        <div className="flex justify-end pt-4">
          <PsButton
            variant="danger"
            onClick={() => setShowCancelModal(true)}
            className="bg-transparent text-error hover:bg-error/10 border border-error/50"
          >
            Cancel Booking
          </PsButton>
        </div>
      )}

      {showCancelModal && (
        <PsCard className="p-6 border-error/50">
          <h3 className="text-lg font-serif font-bold text-error">Cancel Booking</h3>
          <div className="mt-2 text-sm text-secondary">
            <p>Are you sure you want to cancel this booking?</p>
            <ul className="list-disc pl-5 mt-2 text-muted">
              <li>More than 2 hours before start: Advance is fully refundable.</li>
              <li>Within 2 hours of start: Advance is retained.</li>
            </ul>
          </div>
          <form onSubmit={handleCancel} className="mt-5 space-y-4">
            <PsInput
              label="Reason (optional)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Why are you cancelling?"
            />
            
            {cancelError && <PsAlert variant="error">{cancelError}</PsAlert>}
            
            <div className="flex gap-3 pt-2">
              <PsButton
                variant="danger"
                type="submit"
                disabled={cancelling}
              >
                {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </PsButton>
              <PsButton
                variant="ghost"
                type="button"
                onClick={() => { setShowCancelModal(false); setCancelError(''); }}
                disabled={cancelling}
              >
                Keep Booking
              </PsButton>
            </div>
          </form>
        </PsCard>
      )}
    </div>
  );
}
