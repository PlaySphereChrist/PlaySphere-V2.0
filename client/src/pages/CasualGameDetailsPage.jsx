import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  cancelCasualGame,
  getCasualGame,
  joinCasualGame,
  leaveCasualGame,
} from '../features/casual-games/api';
import { useAuth } from '../store/AuthContext';
import {
  PsButton,
  PsCard,
  PsBadge,
  PsAlert,
  PsLoading,
  PsBackButton
} from '../components/ui';

export default function CasualGameDetailsPage() {
  const { gameId } = useParams();
  const { user } = useAuth();
  
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchGame = async () => {
      try {
        setLoading(true);
        const res = await getCasualGame(gameId);
        setGame(res.data.game);
        setError('');
      } catch (err) {
        setError(err.data?.error || err.message || 'Failed to load game details');
      } finally {
        setLoading(false);
      }
    };
    fetchGame();
  }, [gameId]);

  const handleJoin = async () => {
    try {
      setActionLoading(true);
      await joinCasualGame(gameId);
      window.location.reload();
    } catch (err) {
      window.alert(err.data?.error || err.message || 'Failed to join game');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!window.confirm('Are you sure you want to leave this game?')) return;
    try {
      setActionLoading(true);
      await leaveCasualGame(gameId);
      window.location.reload();
    } catch (err) {
      window.alert(err.data?.error || err.message || 'Failed to leave game');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this game? This cannot be undone.')) return;
    try {
      setActionLoading(true);
      await cancelCasualGame(gameId);
      window.location.reload();
    } catch (err) {
      window.alert(err.data?.error || err.message || 'Failed to cancel game');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <PsLoading />;
  
  if (error && !game) {
    return (
      <div className="space-y-4">
        <PsBackButton to="/casual-games" label="Back to Casual Games" />
        <PsAlert variant="error">{error}</PsAlert>
      </div>
    );
  }
  
  if (!game) return null;

  const isCreator = user?.id === game.organized_by_user_id;
  const isParticipant = game.participants?.some(p => p.user_id === user?.id);

  const getStatusVariant = (s) => {
    switch (s) {
      case 'open': return 'success';
      case 'full': return 'warning';
      case 'cancelled': return 'danger';
      case 'completed': return 'default';
      default: return 'default';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <PsBackButton to="/casual-games" label="Back to Casual Games" />

      {error && <PsAlert variant="error">{error}</PsAlert>}

      <PsCard>
        <div className="px-6 py-5 flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-border bg-pill-hover rounded-t-2xl">
          <div>
            <h1 className="text-3xl font-serif font-bold text-primary">{game.title}</h1>
            <p className="mt-1 text-sm text-secondary">
              {game.sport_name} • Organized by {isCreator ? 'You' : game.creator_name}
            </p>
          </div>
          <PsBadge variant={getStatusVariant(game.status)}>
            {game.status.toUpperCase()}
          </PsBadge>
        </div>
        
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-secondary">Date &amp; Time</p>
            <p className="mt-1 text-sm text-primary">
              {new Date(game.scheduled_at).toLocaleDateString()} at {new Date(game.scheduled_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-secondary">Location</p>
            {game.ground_id ? (
              <div className="mt-1">
                <Link
                  to={`/grounds/${game.ground_id}`}
                  className="font-bold text-maroon hover:underline flex items-center gap-1.5"
                >
                  <span>🏟️</span> {game.ground_name}
                </Link>
                <p className="text-xs text-secondary mt-0.5">{game.location_name}</p>
              </div>
            ) : (
              <p className="mt-1 text-sm text-primary">
                {game.location_name}
              </p>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-secondary">Skill Level</p>
            <p className="mt-1 text-sm text-primary">
              {game.skill_level}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-secondary">Participants</p>
            <p className="mt-1 text-sm text-primary">
              {game.current_participants} / {game.max_participants} ({(game.max_participants - game.current_participants)} slots available)
            </p>
          </div>
          {isCreator && game.ground_booking_id && (
            <div className="sm:col-span-2 p-3 bg-maroon/5 border border-maroon/20 rounded-xl text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <span className="text-secondary">
                Linked Ground Reservation: <strong className="text-primary">{game.ground_name || game.ground_booking_id}</strong>
              </span>
              <Link to={`/bookings/${game.ground_booking_id}`} className="text-maroon font-semibold hover:underline">
                View Ground Booking Details &rarr;
              </Link>
            </div>
          )}
          {game.description && (
            <div className="sm:col-span-2">
              <p className="text-sm font-medium text-secondary">Description</p>
              <p className="mt-1 text-sm text-primary whitespace-pre-wrap leading-relaxed">
                {game.description}
              </p>
            </div>
          )}
        </div>
        
        <div className="px-6 py-4 bg-pill flex flex-wrap gap-3 rounded-b-2xl border-t border-border">
          {isCreator && game.status !== 'cancelled' && game.status !== 'completed' && (
            <>
              <Link to={`/casual-games/${game.id}/edit`}>
                <PsButton variant="secondary">Edit Game</PsButton>
              </Link>
              <PsButton
                variant="danger"
                onClick={handleCancel}
                disabled={actionLoading}
                className="bg-transparent text-error hover:bg-error/10 border border-error/50"
              >
                Cancel Game
              </PsButton>
            </>
          )}
          
          {!isCreator && isParticipant && game.status !== 'cancelled' && game.status !== 'completed' && (
            <PsButton
              variant="danger"
              onClick={handleLeave}
              disabled={actionLoading}
              className="bg-transparent text-error hover:bg-error/10 border border-error/50"
            >
              Leave Game
            </PsButton>
          )}
          
          {!user && game.status === 'open' && (
            <Link to="/login" state={{ from: `/casual-games/${game.id}` }}>
              <PsButton>Sign in to join</PsButton>
            </Link>
          )}

          {user && !isCreator && !isParticipant && game.status === 'open' && (
            <PsButton
              onClick={handleJoin}
              disabled={actionLoading}
            >
              Join Game
            </PsButton>
          )}
        </div>
      </PsCard>

      <PsCard>
        <div className="px-6 py-4 border-b border-border bg-pill-hover rounded-t-2xl">
          <h3 className="text-lg font-serif font-bold text-primary">
            Players ({game.participants?.length || 0})
          </h3>
        </div>
        <ul className="divide-y divide-border">
          {game.participants?.map((participant) => (
            <li key={participant.participant_id} className="px-6 py-4 flex items-center justify-between hover:bg-pill-hover transition">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-12 w-12 bg-maroon/10 border border-maroon/20 rounded-full flex items-center justify-center overflow-hidden">
                  {participant.avatar_url ? (
                    <img src={participant.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-maroon font-serif font-bold text-lg">{participant.user_name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="ml-4">
                  <div className="text-sm font-bold text-primary">
                    {participant.user_name} {(participant.is_organizer || participant.user_id === game.organized_by_user_id) && <span className="font-normal text-secondary ml-1">(Organizer)</span>}
                  </div>
                  {participant.player_skill_level && (
                    <div className="text-xs text-secondary capitalize mt-0.5">{participant.player_skill_level}</div>
                  )}
                </div>
              </div>
              <div className="text-xs text-muted">
                Joined {new Date(participant.joined_at).toLocaleDateString()}
              </div>
            </li>
          ))}
          {!game.participants?.length && (
            <li className="px-6 py-8 text-sm text-secondary text-center">No participants yet</li>
          )}
        </ul>
      </PsCard>
    </div>
  );
}
