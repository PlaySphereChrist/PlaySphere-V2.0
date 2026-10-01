import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  cancelTournamentRegistration,
  cancelMyTournamentWaitlistEntry,
  getMyTournamentRegistration,
  getMyTournamentWaitlistEntry,
  getTournament,
  getTournamentPublicParticipants,
  registerForTournament,
} from '../../features/tournaments/api';
import { getTeams } from '../../features/teams/api';
import {
  createTournamentRegistrationOrder,
  verifyTournamentRegistrationPayment,
} from '../../features/payments/api';
import { useAuth } from '../../store/AuthContext';
import { resolveDemoImageUrl } from '../../utils/demoImages';
import {
  PsButton,
  PsCard,
  PsSelect,
  PsBadge,
  PsAlert,
  PsLoading,
  PsBackButton,
  PsErrorState
} from '../../components/ui';
import LeaderboardPanel from './LeaderboardPanel';
import TournamentSportStatsPanel from './TournamentSportStatsPanel';

export default function TournamentDetailsPage() {
  const { tournamentId } = useParams();
  const { user } = useAuth();

  const [tournament, setTournament] = useState(null);
  const [myRegistration, setMyRegistration] = useState(null);
  const [myWaitlist, setMyWaitlist] = useState(null);
  const [myTeams, setMyTeams] = useState([]);
  const [publicParticipants, setPublicParticipants] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [activeStatsTab, setActiveStatsTab] = useState('leaderboards');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const res = await getTournament(tournamentId);
      setTournament(res.data.tournament);

      try {
        const participantsRes = await getTournamentPublicParticipants(tournamentId);
        setPublicParticipants(participantsRes.data.participants || []);
      } catch (participantsError) {
        console.error('Could not load tournament participants', participantsError);
        setPublicParticipants([]);
      }

      if (user) {
        try {
          const regRes = await getMyTournamentRegistration(tournamentId);
          setMyRegistration(regRes.data.registration);
        } catch (e) {
          if (e.status !== 404 && e.status !== 401) console.error(e);
        }

        try {
          const waitRes = await getMyTournamentWaitlistEntry(tournamentId);
          setMyWaitlist(waitRes.data.waitlist_entry);
        } catch (e) {
          if (e.status !== 404 && e.status !== 401) console.error(e);
        }

        if (res.data.tournament.participation_type === 'team') {
          try {
            const teamsRes = await getTeams();
            setMyTeams(teamsRes.data.teams || []);
          } catch (e) {
            if (e.status !== 401) console.error(e);
          }
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load tournament details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  const handleRegister = async () => {
    if (tournament.participation_type === 'team' && !selectedTeamId) {
      setRegError('Please select a team to register');
      return;
    }

    setRegLoading(true);
    setRegError('');

    try {
      const payload = {};
      if (tournament.participation_type === 'team') {
        payload.team_id = selectedTeamId;
      }

      const res = await registerForTournament(tournamentId, payload);

      if (res.payment_required) {
        await startRegistrationPayment(res.registration.id);
      } else {
        await loadData();
      }
    } catch (err) {
      setRegError(err.data?.error || err.message || 'Registration failed');
    } finally {
      setRegLoading(false);
    }
  };

  const startRegistrationPayment = async (registrationId) => {
    const orderRes = await createTournamentRegistrationOrder(tournamentId, registrationId);
    const orderData = orderRes.data;

    if (!window.Razorpay) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Could not load payment checkout. Please try again.'));
        document.body.appendChild(script);
      });
    }

    const options = {
      key: orderData.key_id,
      amount: orderData.amount,
      currency: orderData.currency,
      order_id: orderData.order_id,
      name: 'PlaySphere',
      description: 'Tournament Registration Fee',
      prefill: { email: user?.email || '' },
      theme: { color: '#6E1423' },
      handler: async function (response) {
        try {
          await verifyTournamentRegistrationPayment(tournamentId, registrationId, {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          await loadData();
        } catch (err) {
          setRegError(err.message || 'Payment verification failed. Contact support.');
          await loadData();
        }
      },
      modal: {
        ondismiss: async function () {
          setRegError('Payment cancelled. Your registration is incomplete.');
          await loadData();
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', function (response) {
      setRegError(`Payment failed: ${response.error?.description || 'Unknown error'}`);
      loadData();
    });
    rzp.open();
  };

  const handlePayRegistration = async () => {
    setRegLoading(true);
    setRegError('');
    try {
      await startRegistrationPayment(myRegistration.id);
    } catch (err) {
      setRegError(err.data?.error || err.message || 'Could not start payment');
    } finally {
      setRegLoading(false);
    }
  };

  const handleCancelRegistration = async () => {
    if (!window.confirm('Are you sure you want to cancel your registration?')) return;
    setRegLoading(true);
    try {
      await cancelTournamentRegistration(tournamentId, myRegistration.id);
      await loadData();
    } catch (err) {
      setRegError(err.message || 'Cancellation failed');
    } finally {
      setRegLoading(false);
    }
  };

  const handleCancelWaitlist = async () => {
    if (!window.confirm('Leave this tournament waitlist?')) return;
    setRegLoading(true);
    setRegError('');
    try {
      await cancelMyTournamentWaitlistEntry(tournamentId);
      await loadData();
    } catch (err) {
      setRegError(err.message || 'Could not leave the waitlist');
    } finally {
      setRegLoading(false);
    }
  };

  if (loading) return <PsLoading />;
  
  if (error && !tournament) {
    return (
      <div className="space-y-4">
        <PsBackButton to="/tournaments" label="Back to Tournaments" />
        <PsErrorState message={error} retry={loadData} />
      </div>
    );
  }

  if (!tournament) return null;

  const isOpen = tournament.status === 'registration_open';
  const isOrganizerOrAdmin = user?.roles?.includes('ADMIN') || (
    user?.roles?.includes('ORGANIZER')
    && [tournament.organizer_user_id, tournament.co_organizer_user_id].includes(user.id)
  );
  const registrationComplete = ['registration_closed', 'in_progress', 'completed'].includes(tournament.status);
  const matchesComplete = tournament.status === 'completed';
  const nextStepMessage = myRegistration?.status === 'pending' && Number(tournament.registration_fee) > 0
    ? 'Your place is reserved, but registration is waiting for payment.'
    : tournament.status === 'cancelled'
      ? 'This tournament has been cancelled.'
      : tournament.status === 'completed'
        ? 'The tournament is complete. Review the final standings and player statistics.'
        : tournament.status === 'in_progress'
          ? 'Matches are underway. Follow fixtures and results as they are recorded.'
          : myWaitlist
            ? `You are on the waitlist at position ${myWaitlist.position}.`
            : myRegistration
              ? `Your registration is ${myRegistration.status.replace(/_/g, ' ')}. Check the fixture schedule for updates.`
              : isOpen && user
                ? 'Registration is open. Choose an eligible team or register as a player.'
                : isOpen
                  ? 'Registration is open. Sign in to reserve your place.'
                  : tournament.status === 'registration_closed'
                    ? 'Registration is closed. Check the match schedule for fixture updates.'
                    : 'The organizer is preparing this tournament.';

  const getSportEmoji = (name) => {
    const lower = name?.toLowerCase() || '';
    if (lower.includes('football')) return '⚽';
    if (lower.includes('basketball')) return '🏀';
    if (lower.includes('cricket')) return '🏏';
    if (lower.includes('volleyball')) return '🏐';
    return '🏆';
  };

  const getStatusBadgeVariant = (s) => {
    switch (s) {
      case 'registration_open': return 'success';
      case 'in_progress': return 'maroon';
      case 'completed': return 'default';
      case 'cancelled': return 'danger';
      case 'draft': return 'warning';
      default: return 'default';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <PsBackButton to="/tournaments" label="Back to Tournaments" />

      {error && <PsAlert variant="warning" className="flex flex-wrap items-center justify-between gap-3"><span>Could not refresh tournament details: {error}</span><PsButton size="sm" variant="secondary" onClick={() => loadData()}>Retry</PsButton></PsAlert>}

      <PsCard>
        <div className="h-40 sm:h-56 bg-maroon/10 border-b border-border relative overflow-hidden flex items-center justify-center rounded-t-2xl">
          {tournament.banner_url ? (
            <img
              src={resolveDemoImageUrl(tournament.banner_url, tournament.id || tournament.name)}
              alt={`${tournament.name} tournament poster`}
              className="absolute inset-0 h-full w-full object-cover object-[center_72%]"
              onError={(event) => { event.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <div className="relative text-6xl drop-shadow-md">{getSportEmoji(tournament.sport_name)}</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/30" />
        </div>
        
        <div className="px-6 py-5 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-primary">{tournament.name}</h1>
            <p className="mt-1 text-sm text-secondary">
              {tournament.sport_name} • {tournament.format.replace(/_/g, ' ')}
            </p>
          </div>
          <div className="flex flex-col sm:items-end gap-3 shrink-0">
            <PsBadge variant={getStatusBadgeVariant(tournament.status)} className="self-start sm:self-end text-sm px-3 py-1">
              {tournament.status.replace(/_/g, ' ').toUpperCase()}
            </PsBadge>
            <div className="flex gap-2">
              <Link to={`/tournaments/${tournament.id}/matches`}>
                <PsButton variant="secondary">Matches</PsButton>
              </Link>
              {isOrganizerOrAdmin && (
                <Link to={`/organizer/tournaments/${tournament.id}/manage`}>
                  <PsButton variant="secondary">Organizer tools</PsButton>
                </Link>
              )}
              {tournament.community_id && (
                <Link to={`/community?community_id=${tournament.community_id}`}>
                  <PsButton variant="secondary">Community</PsButton>
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-border p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="sm:col-span-2">
            <p className="text-sm font-medium text-secondary">Description</p>
            <p className="mt-1 text-sm text-primary whitespace-pre-wrap">
              {tournament.description || 'No description provided.'}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-secondary">Dates</p>
            <p className="mt-1 text-sm text-primary">
              {new Date(tournament.starts_at).toLocaleDateString()} to {new Date(tournament.ends_at).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-secondary">Location</p>
            <p className="mt-1 text-sm text-primary">
              {tournament.venue_details ? `${tournament.venue_details}, ${tournament.city}` : (tournament.city || 'TBD')}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-secondary">Participation</p>
            <p className="mt-1 text-sm text-primary capitalize">{tournament.participation_type}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-secondary">Registration Fee</p>
            <p className="mt-1 text-sm text-primary">
              {tournament.registration_fee > 0 ? `₹${tournament.registration_fee}` : 'Free'}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-sm font-medium text-secondary">Registration Window</p>
            <p className="mt-1 text-sm text-primary">
              {new Date(tournament.registration_opens_at).toLocaleDateString()} to {new Date(tournament.registration_closes_at).toLocaleDateString()}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-sm font-medium text-secondary">Organizer</p>
            <p className="mt-1 text-sm text-primary">{tournament.organizer_name}</p>
          </div>
        </div>
      </PsCard>

      <PsCard className="p-5 sm:p-6" role="region" aria-labelledby="tournament-progress-heading">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h2 id="tournament-progress-heading" className="text-base font-semibold text-primary">Tournament progress</h2>
            {tournament.status === 'cancelled' ? (
              <PsAlert variant="warning" className="mt-3">This tournament is cancelled; registration and fixtures are no longer active.</PsAlert>
            ) : (
              <ol className="mt-4 grid grid-cols-3 gap-2" aria-label="Registration, matches, and results">
                {[
                  { label: 'Registration', complete: registrationComplete, active: isOpen },
                  { label: 'Matches', complete: matchesComplete, active: tournament.status === 'in_progress' },
                  { label: 'Results', complete: matchesComplete, active: matchesComplete },
                ].map((step, index) => (
                  <li key={step.label} aria-current={step.active ? 'step' : undefined} className="min-w-0">
                    <div className={`mb-2 h-1.5 rounded-full ${step.complete || step.active ? 'bg-maroon' : 'bg-border'}`} />
                    <p className={`text-xs sm:text-sm ${step.active ? 'font-semibold text-primary' : 'text-secondary'}`}>
                      <span aria-hidden="true">{step.complete ? '✓ ' : `${index + 1}. `}</span>{step.label}
                    </p>
                  </li>
                ))}
              </ol>
            )}
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-secondary">Your next step</p>
            <p className="mt-1 text-sm text-secondary">{nextStepMessage}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {((isOpen && user && !myRegistration && !myWaitlist)
              || (myRegistration?.status === 'pending' && Number(tournament.registration_fee) > 0)) && (
              <PsButton type="button" onClick={() => document.getElementById('registration')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                {myRegistration?.status === 'pending' ? 'Complete registration' : 'Go to registration'}
              </PsButton>
            )}
            {isOpen && !user && (
              <PsButton type="button" onClick={() => document.getElementById('registration')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                Sign in to register
              </PsButton>
            )}
            {myWaitlist && (
              <PsButton type="button" variant="secondary" onClick={() => document.getElementById('registration')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                View waitlist
              </PsButton>
            )}
            {['registration_closed', 'in_progress'].includes(tournament.status) && (
              <Link to={`/tournaments/${tournament.id}/matches`}><PsButton>View matches</PsButton></Link>
            )}
            {tournament.status === 'completed' && (
              <PsButton type="button" onClick={() => document.getElementById('tournament-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                View standings
              </PsButton>
            )}
          </div>
        </div>
      </PsCard>

      <PsCard className="p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-serif font-semibold text-primary">
            {tournament.participation_type === 'team' ? 'Enrolled teams' : 'Participants'}
          </h2>
          <span className="text-sm text-secondary">
            {publicParticipants.length} {tournament.participation_type === 'team' ? 'teams' : 'entrants'}
          </span>
        </div>
        {publicParticipants.length === 0 ? (
          <p className="mt-4 text-sm text-secondary">No approved participants are listed yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {publicParticipants.map((participant) => (
              <li key={participant.registration_id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-start gap-3">
                  {participant.logo_url ? (
                    <img src={participant.logo_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-maroon/10 text-lg">
                      {participant.participant_type === 'team' ? '🏅' : '👤'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-primary">{participant.participant_name}</p>
                    {participant.city && <p className="mt-0.5 text-sm text-secondary">{participant.city}</p>}
                    {participant.players?.length > 0 && (
                      <details className="mt-2 text-sm">
                        <summary className="cursor-pointer text-secondary hover:text-primary">
                          Public roster ({participant.players.length})
                        </summary>
                        <ul className="mt-2 flex flex-wrap gap-2">
                          {participant.players.map((player, index) => (
                            <li key={`${player.display_name}-${index}`} className="rounded-full bg-pill-hover px-3 py-1 text-xs text-primary">
                              {player.display_name}{player.jersey_number !== null && player.jersey_number !== undefined ? ` · #${player.jersey_number}` : ''}{player.is_captain ? ' · Captain' : ''}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PsCard>

      {/* Registration Section */}
      <PsCard id="registration" className="p-6 border-maroon/20 scroll-mt-24">
        <h2 className="text-xl font-serif font-semibold text-primary mb-4">Registration</h2>

        {regError && <PsAlert variant="error" className="mb-4">{regError}</PsAlert>}

        {myRegistration ? (
          <div className="rounded-xl border border-success/30 bg-success/10 p-4">
            <h3 className="text-sm font-semibold text-success">
              {myRegistration.status === 'pending' ? 'Registration pending payment' : 'You are registered'}
            </h3>
            <div className="mt-2 text-sm text-success/80 flex flex-col gap-1">
              <p>Status: <span className="font-semibold uppercase">{myRegistration.status}</span></p>
              <p>Eligibility: <span className="font-semibold uppercase">{myRegistration.eligibility_status}</span></p>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {myRegistration.status === 'pending' && Number(tournament.registration_fee) > 0 && (
                <PsButton
                  size="sm"
                  onClick={handlePayRegistration}
                  disabled={regLoading}
                >
                  {regLoading ? 'Opening checkout...' : 'Complete Fee Payment'}
                </PsButton>
              )}
              <PsButton
                variant="danger"
                size="sm"
                onClick={handleCancelRegistration}
                disabled={regLoading}
              >
                {regLoading ? 'Cancelling...' : 'Cancel Registration'}
              </PsButton>
            </div>
          </div>
        ) : myWaitlist ? (
          <div className="rounded-xl border border-warning/30 bg-warning/10 p-4">
            <h3 className="text-sm font-semibold text-warning">You are on the waitlist</h3>
            <div className="mt-2 text-sm text-warning/80 flex flex-col gap-1">
              <p>Position: <span className="font-semibold">{myWaitlist.position}</span></p>
              <p>Status: <span className="font-semibold uppercase">{myWaitlist.status}</span></p>
            </div>
            <div className="mt-4">
              <PsButton
                variant="danger"
                size="sm"
                onClick={handleCancelWaitlist}
                disabled={regLoading}
              >
                {regLoading ? 'Leaving waitlist...' : 'Leave Waitlist'}
              </PsButton>
            </div>
          </div>
        ) : isOpen && user ? (
          <div>
            {tournament.participation_type === 'team' ? (
              <div className="space-y-4 max-w-sm">
                <PsSelect
                  label="Select Team to Register"
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                >
                  <option value="">-- Select Team --</option>
                  {myTeams.filter(t => t.sport_id === tournament.sport_id && t.is_manager).map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </PsSelect>
                
                {myTeams.length > 0 && myTeams.filter(t => t.sport_id === tournament.sport_id && t.is_manager).length === 0 && (
                  <p className="text-sm text-error">You manage no teams for this sport.</p>
                )}
                
                <PsButton
                  className="w-full"
                  onClick={handleRegister}
                  disabled={regLoading || !selectedTeamId}
                >
                  {regLoading ? 'Processing...' : 'Register Team'}
                </PsButton>
              </div>
            ) : (
              <div>
                <p className="text-sm text-secondary mb-4">Register as an individual. Your player profile will be evaluated against the tournament eligibility rules.</p>
                <PsButton
                  onClick={handleRegister}
                  disabled={regLoading}
                >
                  {regLoading ? 'Processing...' : 'Register Now'}
                </PsButton>
              </div>
            )}
          </div>
        ) : isOpen ? (
          <div className="text-sm text-secondary p-4 bg-pill-hover rounded-xl border border-border">
            Registration is open. <Link to="/login" state={{ from: `/tournaments/${tournamentId}` }} className="font-semibold text-maroon hover:underline">Sign in</Link> to register.
          </div>
        ) : (
          <div className="text-sm text-secondary p-4 bg-pill-hover rounded-xl border border-border">
            Registration is currently closed for this tournament.
          </div>
        )}
      </PsCard>

      <section id="tournament-results" className="space-y-4 scroll-mt-24" aria-label="Tournament statistics">
        <div className="flex gap-2 border-b border-border" role="tablist" aria-label="Tournament statistics tabs">
          {[
            ['leaderboards', 'Leaderboards'],
            ['sport-stats', `${tournament.sport_name} stats`],
          ].map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeStatsTab === tab}
              onClick={() => setActiveStatsTab(tab)}
              className={`border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                activeStatsTab === tab
                  ? 'border-maroon text-maroon'
                  : 'border-transparent text-secondary hover:text-primary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div role="tabpanel">
          {activeStatsTab === 'leaderboards' ? (
            <LeaderboardPanel
              tournamentId={tournamentId}
              tournament={tournament}
              isOrganizerOrAdmin={isOrganizerOrAdmin}
            />
          ) : (
            <TournamentSportStatsPanel
              tournamentId={tournamentId}
              sportId={tournament.sport_id}
              sportName={tournament.sport_name}
            />
          )}
        </div>
      </section>
    </div>
  );
}
