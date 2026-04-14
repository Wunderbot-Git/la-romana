'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/lib/api';
import { usePlaceBet, usePlaceGeneralBet } from '@/hooks/useBetting';

interface MissingMatch {
  flightId: string;
  flightNumber: number;
  segmentType: string;
  players: string;
}

interface MandatoryStatus {
  total: number;
  placed: number;
  missing: {
    general: string[];
    matches: MissingMatch[];
  };
}

interface Props {
  eventId: string;
  onComplete: () => void;
  onDismiss: () => void;
}

type StepType =
  | { kind: 'general'; betType: string }
  | { kind: 'match'; match: MissingMatch };

const GENERAL_BET_ORDER = ['tournament_winner', 'exact_score', 'mvp', 'worst_player'];

const GENERAL_BET_LABELS: Record<string, { title: string; description: string }> = {
  tournament_winner: { title: 'Ganador del Torneo', description: '¿Qué equipo ganará el torneo?' },
  exact_score: { title: 'Marcador Exacto', description: '¿Cuál será el marcador final? (suma = 25)' },
  mvp: { title: 'MVP', description: '¿Quién será el mejor jugador del torneo?' },
  worst_player: { title: 'Peor Jugador', description: '¿Quién será el peor jugador?' },
};

const SEGMENT_LABELS: Record<string, string> = {
  singles1: 'Individual 1',
  singles2: 'Individual 2',
  fourball: 'Mejor Bola',
  scramble: 'Scramble',
};

const SEGMENT_ORDER = ['singles1', 'singles2', 'fourball', 'scramble'];

function parsePlayersFromMatches(matches: MissingMatch[]): string[] {
  const names = new Set<string>();
  for (const m of matches) {
    const parts = m.players.split(' vs ');
    for (const part of parts) {
      // Handle "A / B" scramble format
      const subNames = part.split('/').map(s => s.trim());
      for (const n of subNames) {
        if (n) names.add(n);
      }
    }
  }
  return Array.from(names).sort();
}

function parseMatchSides(players: string): { red: string; blue: string } {
  const [red = '', blue = ''] = players.split(' vs ').map(s => s.trim());
  return { red, blue };
}

// ──────────────────────────────────────────────
// ExactScorePicker (inline)
// ──────────────────────────────────────────────
function ExactScorePicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (outcome: string) => void;
}) {
  const parsed = value ? value.split('-').map(Number) : [12.5, 12.5];
  const pitufos = parsed[0] ?? 12.5;
  const cariniositos = 25 - pitufos;

  const adjust = (delta: number) => {
    const next = pitufos + delta;
    if (next >= 0 && next <= 25 && next % 0.5 === 0) {
      onChange(`${next}-${25 - next}`);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-4 w-full justify-center">
        <div className="flex flex-col items-center gap-1 flex-1">
          <span className="text-[10px] font-bangers text-team-blue uppercase tracking-wider">
            Pitufos
          </span>
          <div className="bg-team-blue/10 border-2 border-team-blue/30 rounded-xl px-4 py-3 min-w-[80px] text-center">
            <span className="text-4xl font-bangers text-team-blue">{pitufos}</span>
          </div>
        </div>

        <span className="text-cream/40 font-bangers text-lg mt-4">vs</span>

        <div className="flex flex-col items-center gap-1 flex-1">
          <span className="text-[10px] font-bangers text-team-red uppercase tracking-wider">
            Cariñositos
          </span>
          <div className="bg-team-red/10 border-2 border-team-red/30 rounded-xl px-4 py-3 min-w-[80px] text-center">
            <span className="text-4xl font-bangers text-team-red">{cariniositos}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => adjust(-0.5)}
          disabled={pitufos <= 0}
          className="w-12 h-12 rounded-full border-2 border-team-red/40 bg-team-red/10 text-team-red font-bangers text-xl disabled:opacity-30 transition-all hover:bg-team-red/20 active:scale-95"
        >
          −
        </button>
        <span className="text-xs text-cream/50 font-fredoka w-20 text-center">
          {pitufos === cariniositos
            ? 'Empate'
            : pitufos > cariniositos
              ? 'Ganan Pitufos'
              : 'Ganan Cariñositos'}
        </span>
        <button
          onClick={() => adjust(0.5)}
          disabled={pitufos >= 25}
          className="w-12 h-12 rounded-full border-2 border-team-blue/40 bg-team-blue/10 text-team-blue font-bangers text-xl disabled:opacity-30 transition-all hover:bg-team-blue/20 active:scale-95"
        >
          +
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// PlayerPicker
// ──────────────────────────────────────────────
function PlayerPicker({
  players,
  selected,
  onSelect,
}: {
  players: string[];
  selected: string | null;
  onSelect: (name: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
      {players.map((name) => (
        <button
          key={name}
          onClick={() => onSelect(name)}
          className={`px-3 py-3 rounded-xl border-2 text-sm font-fredoka font-bold transition-all text-center active:scale-95 ${
            selected === name
              ? 'border-gold-border bg-gold-light/20 text-forest-deep'
              : 'border-cream/20 bg-cream/5 text-cream/80 hover:border-cream/40'
          }`}
        >
          {name}
        </button>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────
// Main Wizard
// ──────────────────────────────────────────────
export function MandatoryBetWizard({ eventId, onComplete, onDismiss }: Props) {
  const [status, setStatus] = useState<MandatoryStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  const { placeBet, isSubmitting: isSubmittingMatch, error: matchError } = usePlaceBet();
  const { placeGeneralBet, isSubmitting: isSubmittingGeneral, error: generalError } = usePlaceGeneralBet();

  const isSubmitting = isSubmittingMatch || isSubmittingGeneral;
  const submitError = matchError || generalError;

  // Fetch mandatory status
  const fetchStatus = useCallback(async () => {
    try {
      setIsLoadingStatus(true);
      setLoadError(null);
      const res = await api.get<MandatoryStatus>(`/events/${eventId}/bets/mandatory-status`);
      setStatus(res);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error cargando estado de apuestas');
    } finally {
      setIsLoadingStatus(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Build steps from missing data
  const steps = useMemo<StepType[]>(() => {
    if (!status) return [];

    const result: StepType[] = [];

    // General bets in canonical order
    for (const betType of GENERAL_BET_ORDER) {
      if (status.missing.general.includes(betType)) {
        result.push({ kind: 'general', betType });
      }
    }

    // Match bets sorted by segment order, then flight number
    const sortedMatches = [...status.missing.matches].sort((a, b) => {
      const aIdx = SEGMENT_ORDER.indexOf(a.segmentType);
      const bIdx = SEGMENT_ORDER.indexOf(b.segmentType);
      if (aIdx !== bIdx) return aIdx - bIdx;
      return a.flightNumber - b.flightNumber;
    });

    for (const match of sortedMatches) {
      result.push({ kind: 'match', match });
    }

    return result;
  }, [status]);

  // Extract unique player names from all match data (both missing and placed)
  const allPlayerNames = useMemo(() => {
    if (!status) return [];
    return parsePlayersFromMatches(status.missing.matches);
  }, [status]);

  const totalMissing = steps.length;
  const totalBets = status?.total ?? 24;
  const alreadyPlaced = status?.placed ?? 0;
  const progressPlaced = alreadyPlaced + currentStep;

  // Reset selection when step changes
  useEffect(() => {
    const step = steps[currentStep];
    if (step?.kind === 'general' && step.betType === 'exact_score') {
      setSelectedOutcome('12.5-12.5');
    } else {
      setSelectedOutcome(null);
    }
  }, [currentStep, steps]);

  const handleNext = async () => {
    if (!selectedOutcome || !status) return;

    const step = steps[currentStep];
    let success = false;

    if (step.kind === 'general') {
      success = await placeGeneralBet({
        eventId,
        betType: step.betType,
        pickedOutcome: selectedOutcome,
      });
    } else {
      const outcomeMap: Record<string, 'A' | 'B' | 'AS'> = { A: 'A', B: 'B', AS: 'AS' };
      const pick = outcomeMap[selectedOutcome];
      if (!pick) return;

      success = await placeBet({
        eventId,
        flightId: step.match.flightId,
        segmentType: step.match.segmentType,
        pickedOutcome: pick,
      });
    }

    if (success) {
      if (currentStep < totalMissing - 1) {
        setCurrentStep((s) => s + 1);
      } else {
        setCompleted(true);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  // ── Loading state ──
  if (isLoadingStatus) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="bg-forest-deep rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-8 h-8 border-2 border-gold-border/30 border-t-gold-border rounded-full animate-spin mx-auto mb-3" />
          <p className="text-cream/60 font-fredoka text-sm">Cargando apuestas...</p>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (loadError) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="bg-forest-deep rounded-2xl p-8 text-center shadow-2xl max-w-sm mx-4">
          <p className="text-team-red font-fredoka text-sm mb-4">{loadError}</p>
          <button
            onClick={fetchStatus}
            className="gold-button text-[#1e293b] shadow-[0_4px_0_#1e293b] active:translate-y-1 active:shadow-none font-bangers px-6 py-2 rounded-xl text-sm"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // ── Nothing missing ──
  if (totalMissing === 0) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="bg-forest-deep rounded-2xl p-8 text-center shadow-2xl max-w-sm mx-4">
          <h2 className="text-2xl font-bangers text-gold-light mb-2">Ya tienes todas</h2>
          <p className="text-cream/60 font-fredoka text-sm mb-6">
            Todas tus apuestas obligatorias han sido registradas.
          </p>
          <button
            onClick={onComplete}
            className="gold-button text-[#1e293b] shadow-[0_4px_0_#1e293b] active:translate-y-1 active:shadow-none font-bangers px-8 py-3 rounded-xl text-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  // ── Completed ──
  if (completed) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col justify-end bg-black/70 backdrop-blur-sm">
        <div className="bg-forest-deep relative w-full rounded-t-3xl shadow-2xl flex flex-col items-center px-6 py-12 animate-slide-up">
          <div className="w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-400/40 flex items-center justify-center mb-4">
            <span className="text-3xl">&#10003;</span>
          </div>
          <h2 className="text-3xl font-bangers text-gold-light mb-2">Listo!</h2>
          <p className="text-cream/60 font-fredoka text-sm text-center mb-8">
            Todas tus apuestas obligatorias han sido registradas.
          </p>
          <button
            onClick={onComplete}
            className="gold-button text-[#1e293b] shadow-[0_4px_0_#1e293b] active:translate-y-1 active:shadow-none font-bangers px-10 py-3 rounded-xl text-base w-full max-w-xs"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  // ── Active wizard ──
  const step = steps[currentStep];
  const stepNumber = currentStep + 1;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col justify-end bg-black/70 backdrop-blur-sm">
      <div className="bg-forest-deep relative w-full rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-slide-up">
        {/* Header: progress + close */}
        <div className="px-5 pt-4 pb-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bangers text-cream/50 uppercase tracking-wider">
              Apuestas Obligatorias
            </span>
            <button
              onClick={onDismiss}
              className="w-8 h-8 rounded-full bg-cream/10 flex items-center justify-center text-cream/60 hover:bg-cream/20 transition-colors"
              aria-label="Cerrar"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-cream/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${(progressPlaced / totalBets) * 100}%`,
                background: 'linear-gradient(90deg, #4A90D9, #E75480)',
              }}
            />
          </div>
          <div className="flex justify-between items-center mt-1.5">
            <span className="text-[10px] font-fredoka text-cream/40">
              {progressPlaced} de {totalBets}
            </span>
            <span className="text-[10px] font-fredoka text-cream/40">
              Paso {stepNumber} de {totalMissing} pendientes
            </span>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pb-6">
          {step.kind === 'general' ? (
            <GeneralBetStep
              betType={step.betType}
              selected={selectedOutcome}
              onSelect={setSelectedOutcome}
              players={allPlayerNames}
            />
          ) : (
            <MatchBetStep
              match={step.match}
              selected={selectedOutcome}
              onSelect={setSelectedOutcome}
            />
          )}

          {/* Error */}
          {submitError && (
            <div className="mt-3 bg-team-red/10 border border-team-red/30 rounded-xl px-4 py-2.5 text-center">
              <p className="text-team-red text-xs font-fredoka">{submitError}</p>
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="flex-shrink-0 px-5 pb-6 pt-3 border-t border-cream/10">
          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                disabled={isSubmitting}
                className="px-5 py-3 rounded-xl border-2 border-cream/20 text-cream/60 font-bangers text-sm hover:border-cream/40 transition-colors disabled:opacity-40"
              >
                &#8592; Anterior
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!selectedOutcome || isSubmitting}
              className={`flex-1 py-3 rounded-xl font-bangers text-sm shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                isSubmitting
                  ? 'bg-forest-mid text-cream/50 cursor-wait'
                  : 'gold-button text-[#1e293b] shadow-[0_4px_0_#1e293b] active:translate-y-1 active:shadow-none'
              }`}
            >
              {isSubmitting
                ? 'Guardando...'
                : currentStep === totalMissing - 1
                  ? 'Finalizar \u2713'
                  : 'Siguiente \u2192'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// General Bet Step
// ──────────────────────────────────────────────
function GeneralBetStep({
  betType,
  selected,
  onSelect,
  players,
}: {
  betType: string;
  selected: string | null;
  onSelect: (outcome: string) => void;
  players: string[];
}) {
  const meta = GENERAL_BET_LABELS[betType] ?? { title: betType, description: '' };

  return (
    <div className="py-4">
      <h2 className="text-2xl font-bangers text-gold-light mb-1">{meta.title}</h2>
      <p className="text-sm font-fredoka text-cream/50 mb-6">{meta.description}</p>

      {betType === 'tournament_winner' && (
        <div className="flex gap-3">
          <button
            onClick={() => onSelect('blue')}
            className={`flex-1 py-6 rounded-2xl border-3 text-center transition-all active:scale-95 ${
              selected === 'blue'
                ? 'border-team-blue bg-team-blue/15 ring-2 ring-team-blue/30'
                : 'border-team-blue/30 bg-team-blue/5 hover:border-team-blue/60'
            }`}
          >
            <span className="text-xl font-bangers text-team-blue">Pitufos</span>
          </button>
          <button
            onClick={() => onSelect('red')}
            className={`flex-1 py-6 rounded-2xl border-3 text-center transition-all active:scale-95 ${
              selected === 'red'
                ? 'border-team-red bg-team-red/15 ring-2 ring-team-red/30'
                : 'border-team-red/30 bg-team-red/5 hover:border-team-red/60'
            }`}
          >
            <span className="text-xl font-bangers text-team-red">Cariñositos</span>
          </button>
        </div>
      )}

      {betType === 'exact_score' && (
        <ExactScorePicker value={selected} onChange={onSelect} />
      )}

      {(betType === 'mvp' || betType === 'worst_player') && (
        <PlayerPicker players={players} selected={selected} onSelect={onSelect} />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Match Bet Step
// ──────────────────────────────────────────────
function MatchBetStep({
  match,
  selected,
  onSelect,
}: {
  match: MissingMatch;
  selected: string | null;
  onSelect: (outcome: string) => void;
}) {
  const { red, blue } = parseMatchSides(match.players);
  const segmentLabel = SEGMENT_LABELS[match.segmentType] ?? match.segmentType;

  return (
    <div className="py-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-bangers text-cream/40 uppercase tracking-wider bg-cream/10 px-2 py-0.5 rounded">
          {segmentLabel}
        </span>
        <span className="text-[10px] font-fredoka text-cream/30">
          Vuelo {match.flightNumber}
        </span>
      </div>

      <h2 className="text-xl font-bangers text-gold-light mb-6">{match.players}</h2>

      <div className="flex flex-col gap-3">
        <button
          onClick={() => onSelect('A')}
          className={`relative p-5 rounded-xl border-2 text-center transition-all active:scale-[0.98] ${
            selected === 'A'
              ? 'border-team-red bg-team-red/10 ring-2 ring-team-red/20'
              : 'border-team-red/30 bg-team-red/5 hover:border-team-red/50'
          }`}
        >
          <div className="font-fredoka font-bold text-team-red text-base">{red}</div>
        </button>

        <button
          onClick={() => onSelect('AS')}
          className={`relative p-5 rounded-xl border-2 text-center transition-all active:scale-[0.98] ${
            selected === 'AS'
              ? 'border-cream/60 bg-cream/10 ring-2 ring-cream/20'
              : 'border-cream/20 bg-cream/5 hover:border-cream/40'
          }`}
        >
          <div className="font-fredoka font-bold text-cream/80 text-base">Empate (A/S)</div>
        </button>

        <button
          onClick={() => onSelect('B')}
          className={`relative p-5 rounded-xl border-2 text-center transition-all active:scale-[0.98] ${
            selected === 'B'
              ? 'border-team-blue bg-team-blue/10 ring-2 ring-team-blue/20'
              : 'border-team-blue/30 bg-team-blue/5 hover:border-team-blue/50'
          }`}
        >
          <div className="font-fredoka font-bold text-team-blue text-base">{blue}</div>
        </button>
      </div>
    </div>
  );
}
