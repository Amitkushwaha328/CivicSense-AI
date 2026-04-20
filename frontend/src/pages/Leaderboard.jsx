import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../api/auth';

const MEDAL = ['🥇', '🥈', '🥉'];
const BADGE_MAP = [
  { icon: 'shield', label: 'Road Guardian', color: 'text-primary bg-primary/10' },
  { icon: 'eco', label: 'Eco Sentinel', color: 'text-tertiary bg-tertiary/10' },
  { icon: 'electric_bolt', label: 'Grid Warden', color: 'text-secondary bg-secondary/10' },
  { icon: 'campaign', label: 'Civic Voice', color: 'text-on-surface bg-surface-container-high' },
];

export default function Leaderboard() {
  const { user } = useAuth();
  const [leaders, setLeaders]   = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    API.get('/rewards/leaderboard')
      .then(res => setLeaders(Array.isArray(res.data) ? res.data : []))
      .catch(() => setLeaders([]))
      .finally(() => setLoading(false));
  }, []);

  const top3 = leaders.slice(0, 3);
  const rest  = leaders.slice(3);
  // Find current user's rank
  const myRank = leaders.findIndex(l => l.name === user?.name) + 1;
  const myEntry = leaders.find(l => l.name === user?.name);

  return (
    <main className="pt-8 pb-24 lg:pt-8 lg:pb-8 flex-1 px-6 max-w-7xl mx-auto min-h-screen flex flex-col w-full">
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 w-full">
        <div>
          <h1 className="font-headline text-3xl font-semibold tracking-[0.02em] text-on-background mb-1">City Hero Rankings</h1>
          <p className="text-on-surface-variant text-sm font-body max-w-xl">Real-time civic engagement scores. Climb the ranks by reporting verified issues.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="glass-panel px-4 py-2 rounded-xl flex items-center gap-3 border border-outline-variant/15">
            <span className="material-symbols-outlined text-secondary">workspace_premium</span>
            <div className="flex flex-col">
              <span className="text-[10px] font-medium text-on-surface-variant uppercase tracking-wider">Current Season</span>
              <span className="text-sm font-semibold text-primary">Q3 Autumn Sentinel</span>
            </div>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : leaders.length === 0 ? (
        <div className="glass-panel rounded-xl p-12 flex flex-col items-center justify-center flex-1 gap-4">
          <span className="material-symbols-outlined text-6xl text-outline-variant/30">leaderboard</span>
          <p className="font-headline text-lg text-on-surface font-semibold">No Rankings Yet</p>
          <p className="text-on-surface-variant text-sm text-center max-w-sm">Be the first citizen to submit a report and claim the top rank!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 w-full">
          {/* Left: Podium + Personal rank */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Personal Rank Card */}
            {user && (
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-surface-container-low to-surface-container border border-primary/20 shadow-[0px_24px_40px_rgba(173,198,255,0.04)] p-6">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <span className="material-symbols-outlined text-9xl text-primary">military_tech</span>
                </div>
                <div className="relative z-10 flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-medium text-primary uppercase tracking-widest mb-1 block">Your Standing</span>
                      <h2 className="font-headline text-2xl font-semibold text-on-background">
                        {myRank > 0 ? `Rank #${myRank}` : 'Unranked'}
                      </h2>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-headline font-bold text-on-primary text-lg">
                      {user.name?.[0]?.toUpperCase()}
                    </div>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="font-headline text-4xl font-semibold text-primary">{(user.points || 0).toLocaleString()}</span>
                    <span className="text-sm text-on-surface-variant pb-1">Civic Points</span>
                  </div>
                  {myRank > 1 && leaders[myRank - 2] && (
                    <>
                      <div className="h-px w-full bg-outline-variant/30 my-1"></div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-on-surface-variant">Next: #{myRank - 1} {leaders[myRank - 2].name}</span>
                        <span className="text-secondary font-medium">{(leaders[myRank - 2].points - (user.points || 0)).toLocaleString()} pts away</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Top 3 Podium */}
            {top3.length >= 1 && (
              <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/15 flex-1 flex flex-col">
                <h3 className="font-headline text-sm font-semibold text-on-background mb-10 flex justify-between items-center">
                  Vanguard Leaders
                  <span className="material-symbols-outlined text-on-surface-variant text-lg">star</span>
                </h3>
                <div className="flex items-end justify-center gap-4 h-full min-h-[160px] pb-4">
                  {/* Render in podium order: 2, 1, 3 */}
                  {[top3[1], top3[0], top3[2]].map((leader, visualIdx) => {
                    if (!leader) return null;
                    const realRank = visualIdx === 0 ? 2 : visualIdx === 1 ? 1 : 3;
                    const heights = ['h-24', 'h-32', 'h-20'];
                    const highlights = [
                      'bg-surface-container-highest border-outline-variant/20',
                      'bg-gradient-to-t from-surface-container-high to-surface-container-highest border-secondary/30',
                      'bg-surface-container-highest border-outline-variant/20'
                    ];
                    return (
                      <div key={leader.name} className={`flex flex-col items-center w-1/3 relative ${realRank === 1 ? 'order-2' : realRank === 2 ? 'order-1' : 'order-3'}`}>
                        <div className={`absolute ${realRank === 1 ? '-top-16' : '-top-12'} flex flex-col items-center gap-1`}>
                          <div className={`${realRank === 1 ? 'w-14 h-14' : 'w-10 h-10'} rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center font-headline font-bold text-on-surface ${realRank === 1 ? 'text-xl ring-2 ring-secondary shadow-[0_0_20px_rgba(221,183,255,0.3)]' : 'text-lg'}`}>
                            {leader.name?.[0]?.toUpperCase()}
                          </div>
                          <span className={`text-xs font-medium ${realRank === 1 ? 'text-secondary font-semibold' : 'text-on-surface'}`}>{leader.name.split(' ')[0]}</span>
                        </div>
                        <div className={`w-full ${highlights[visualIdx]} rounded-t-lg border-t border-x flex flex-col items-center justify-start pt-4 ${heights[visualIdx]} relative overflow-hidden`}>
                          {realRank === 1 && <div className="absolute top-0 w-full h-1 bg-secondary"></div>}
                          <span className={`font-headline font-black ${realRank === 1 ? 'text-3xl text-secondary' : realRank === 2 ? 'text-2xl text-outline-variant' : 'text-xl text-tertiary'}`}>
                            {realRank}
                          </span>
                          <span className="text-[10px] text-on-surface-variant mt-1">{(leader.points || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right: Full List */}
          <div className="lg:col-span-7 bg-surface-container-low rounded-xl border border-outline-variant/15 flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-container-highest flex justify-between items-center bg-surface-container-low/50 backdrop-blur-sm sticky top-0 z-10">
              <h3 className="font-headline text-sm font-semibold text-on-background">Top Operatives</h3>
              <span className="text-xs text-on-surface-variant">{leaders.length} ranked</span>
            </div>
            <div className="flex flex-col overflow-y-auto">
              <div className="grid grid-cols-12 gap-4 px-6 py-2 text-[10px] font-medium text-on-surface-variant uppercase tracking-wider border-b border-surface-container-highest/50">
                <div className="col-span-1 text-center">Rank</div>
                <div className="col-span-5">Operative</div>
                <div className="hidden md:block md:col-span-3">Badge</div>
                <div className="col-span-6 md:col-span-3 text-right">Points</div>
              </div>

              {leaders.map((leader, i) => {
                const isMe = leader.name === user?.name;
                const badge = BADGE_MAP[i % BADGE_MAP.length];
                return (
                  <div key={i} className={`grid grid-cols-12 gap-4 px-6 py-3 items-center border-b border-surface-container-highest/50 transition-colors ${isMe ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-surface-container-highest/30'}`}>
                    <div className={`col-span-1 text-center font-headline text-sm font-medium ${i < 3 ? 'text-lg' : 'text-on-surface-variant'}`}>
                      {i < 3 ? MEDAL[i] : i + 1}
                    </div>
                    <div className="col-span-5 flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center font-headline font-bold text-sm shrink-0 ${isMe ? 'ring-1 ring-primary' : ''}`}>
                        {leader.name?.[0]?.toUpperCase()}
                      </div>
                      <span className={`text-sm font-medium truncate ${isMe ? 'text-primary font-semibold' : 'text-on-background'}`}>
                        {isMe ? `${leader.name} (You)` : leader.name}
                      </span>
                    </div>
                    <div className="hidden md:flex md:col-span-3 items-center gap-1.5">
                      <span className={`material-symbols-outlined text-sm p-1 rounded ${badge.color}`}>{badge.icon}</span>
                      <span className="text-xs text-on-surface-variant">{badge.label}</span>
                    </div>
                    <div className={`col-span-6 md:col-span-3 text-right text-sm font-medium ${isMe ? 'text-primary font-bold' : 'text-on-surface'}`}>
                      {(leader.points || 0).toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}