"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Goal = "strength" | "muscle" | "fat-loss" | "general";
type Experience = "beginner" | "intermediate" | "advanced";
type Profile = {
  goal: Goal;
  experience: Experience;
  age: number;
  weight: number;
  height: number;
  availableDays: number;
  sessionMinutes: number;
  sleep: number;
  meals: number;
  proteinMeals: number;
  steps: number;
};

type Exercise = {
  name: string;
  prescription: string;
  rest: string;
};

type TrainingDay = {
  day: string;
  focus: string;
  duration: string;
  exercises: Exercise[];
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type HistoryEntry = {
  id: number;
  userName: string;
  readiness: number;
  trainingDays: number;
  goal: Goal;
  split: string;
  createdAt: string;
};

const initialProfile: Profile = {
  goal: "muscle",
  experience: "beginner",
  age: 27,
  weight: 72,
  height: 174,
  availableDays: 4,
  sessionMinutes: 60,
  sleep: 7,
  meals: 3,
  proteinMeals: 2,
  steps: 6500,
};

const copy = {
  goal: {
    strength: "Build strength",
    muscle: "Build muscle",
    "fat-loss": "Lose fat",
    general: "Move better",
  },
  experience: {
    beginner: "New / returning",
    intermediate: "1–3 years",
    advanced: "3+ years",
  },
} as const;

const exercisePools = {
  upperA: [
    ["Bench press", "3 × 6–8"],
    ["Chest-supported row", "3 × 8–10"],
    ["Incline dumbbell press", "2 × 10–12"],
    ["Lat pulldown", "2 × 10–12"],
    ["Cable lateral raise", "2 × 12–15"],
  ],
  lowerA: [
    ["Back squat", "3 × 6–8"],
    ["Romanian deadlift", "3 × 8–10"],
    ["Leg press", "2 × 10–12"],
    ["Leg curl", "2 × 10–12"],
    ["Standing calf raise", "2 × 12–15"],
  ],
  upperB: [
    ["Overhead press", "3 × 6–8"],
    ["Assisted pull-up", "3 × 8–10"],
    ["Machine chest press", "2 × 10–12"],
    ["Seated cable row", "2 × 10–12"],
    ["Cable curl + pressdown", "2 × 12–15"],
  ],
  lowerB: [
    ["Trap-bar deadlift", "3 × 5–6"],
    ["Bulgarian split squat", "3 × 8 / side"],
    ["Hip thrust", "2 × 10–12"],
    ["Leg extension", "2 × 12–15"],
    ["Farmer carry", "3 × 30 m"],
  ],
  fullA: [
    ["Goblet squat", "3 × 8–10"],
    ["Machine chest press", "3 × 8–10"],
    ["Lat pulldown", "3 × 8–10"],
    ["Romanian deadlift", "2 × 10"],
    ["Pallof press", "2 × 10 / side"],
  ],
  fullB: [
    ["Trap-bar deadlift", "3 × 6"],
    ["Incline dumbbell press", "3 × 8–10"],
    ["Seated cable row", "3 × 8–10"],
    ["Reverse lunge", "2 × 10 / side"],
    ["Farmer carry", "3 × 30 m"],
  ],
  fullC: [
    ["Leg press", "3 × 10"],
    ["Overhead press", "3 × 8"],
    ["Assisted pull-up", "3 × 8"],
    ["Hip thrust", "2 × 10–12"],
    ["Cable chop", "2 × 10 / side"],
  ],
} as const;

function makeExercises(
  key: keyof typeof exercisePools,
  goal: Goal,
  experience: Experience,
): Exercise[] {
  const setOffset = experience === "advanced" ? 1 : 0;
  return exercisePools[key].map(([name, base], index) => {
    let prescription = base;
    if (goal === "strength" && index < 2) {
      prescription = experience === "beginner" ? "3 × 5–6" : "4 × 4–6";
    }
    if (goal === "fat-loss" && index > 1) {
      prescription = "2–3 × 10–15";
    }
    if (setOffset && index < 3 && !prescription.startsWith("4")) {
      prescription = prescription.replace(/^[23]/, (value) =>
        String(Number(value) + setOffset),
      );
    }
    return {
      name,
      prescription,
      rest: index < 2 ? "2 min" : "60–90 sec",
    };
  });
}

function buildPlan(profile: Profile) {
  const recoveryCap =
    profile.experience === "beginner"
      ? 3
      : profile.sleep < 6.5
        ? 3
        : profile.experience === "advanced"
          ? 5
          : 4;
  const recommendedDays = Math.max(2, Math.min(profile.availableDays, 5));
  const session = Math.max(35, Math.min(profile.sessionMinutes, 80));

  const templates: Record<
    number,
    Array<[string, string, keyof typeof exercisePools]>
  > = {
    2: [
      ["Tuesday", "Full body A", "fullA"],
      ["Friday", "Full body B", "fullB"],
    ],
    3: [
      ["Monday", "Full body A", "fullA"],
      ["Wednesday", "Full body B", "fullB"],
      ["Friday", "Full body C", "fullC"],
    ],
    4: [
      ["Monday", "Upper A", "upperA"],
      ["Tuesday", "Lower A", "lowerA"],
      ["Thursday", "Upper B", "upperB"],
      ["Saturday", "Lower B", "lowerB"],
    ],
    5: [
      ["Monday", "Upper A", "upperA"],
      ["Tuesday", "Lower A", "lowerA"],
      ["Wednesday", "Full body", "fullC"],
      ["Friday", "Upper B", "upperB"],
      ["Saturday", "Lower B", "lowerB"],
    ],
  };

  const days: TrainingDay[] = templates[recommendedDays].map(
    ([day, focus, key]) => ({
      day,
      focus,
      duration: `${session} min`,
      exercises: makeExercises(key, profile.goal, profile.experience),
    }),
  );

  const bmi = profile.weight / (profile.height / 100) ** 2;
  const proteinLow = Math.round(
    profile.weight * (profile.goal === "fat-loss" ? 1.8 : 1.6),
  );
  const proteinHigh = Math.round(profile.weight * 2.2);
  const sleepScore = Math.min(100, Math.round((profile.sleep / 8) * 100));
  const foodScore = Math.min(
    100,
    Math.round(
      ((Math.min(profile.meals, 4) + Math.min(profile.proteinMeals, 4)) / 8) *
        100,
    ),
  );
  const movementScore = Math.min(100, Math.round(profile.steps / 100));
  const readiness = Math.round(
    sleepScore * 0.5 + foodScore * 0.3 + movementScore * 0.2,
  );

  const flags: string[] = [];
  if (profile.sleep < 6.5) {
    flags.push("Low sleep limits productive training frequency.");
  }
  if (profile.proteinMeals < 2) {
    flags.push("Add a protein-rich meal before adding more training volume.");
  }
  if (recommendedDays > recoveryCap) {
    flags.push(
      `${recommendedDays} focused days is ambitious for your current recovery. Keep sessions controlled and reduce a day if performance drops.`,
    );
  }
  if (flags.length === 0) {
    flags.push("Your recovery inputs support the full weekly schedule.");
  }

  return {
    days,
    recommendedDays,
    bmi,
    proteinLow,
    proteinHigh,
    readiness,
    flags,
    cardio:
      profile.goal === "fat-loss"
        ? "2 × 20–30 min easy cardio"
        : "1–2 × 20 min easy cardio",
  };
}

function NumberField({
  label,
  value,
  unit,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="number-field">
      <span>{label}</span>
      <span className="number-input">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <small>{unit}</small>
      </span>
    </label>
  );
}

export default function Home() {
  const [profile, setProfile] = useState(initialProfile);
  const [userName, setUserName] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showSavePopup, setShowSavePopup] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [activeDay, setActiveDay] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi, I’m JUNIOUS Coach. Ask me about exercises, your weekly split, recovery, or gym nutrition.",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatError, setChatError] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const chatSessionId = useRef(
    `kinetic_${crypto.randomUUID().replaceAll("-", "")}`,
  );
  const plan = useMemo(() => buildPlan(profile), [profile]);
  const chartHistory = useMemo(() => [...history].reverse(), [history]);
  const selectedDay = plan.days[Math.min(activeDay, plan.days.length - 1)];
  const lastTracedPlan = useRef("");

  useEffect(() => {
    if (!showSavePopup) return;

    const timeout = window.setTimeout(() => setShowSavePopup(false), 2500);
    return () => window.clearTimeout(timeout);
  }, [showSavePopup]);

  useEffect(() => {
    const readinessBand =
      plan.readiness < 60 ? "low" : plan.readiness < 80 ? "moderate" : "high";
    const tracePayload = {
      goal: profile.goal,
      experience: profile.experience,
      availabilityBand:
        profile.availableDays <= 3 ? "2-3-days" : "4-5-days",
      recoveryBand:
        profile.sleep < 6.5
          ? "low"
          : profile.sleep < 8
            ? "moderate"
            : "high",
      nutritionBand:
        profile.proteinMeals < 2
          ? "low"
          : profile.proteinMeals < 4
            ? "moderate"
            : "high",
      movementBand:
        profile.steps < 5000
          ? "low"
          : profile.steps < 9000
            ? "moderate"
            : "high",
      recommendation: {
        trainingDays: plan.recommendedDays,
        split: plan.days.map((day) => day.focus).join(" / "),
        readinessBand,
        cardioFocus: profile.goal === "fat-loss" ? "fat-loss" : "standard",
      },
    };
    const fingerprint = JSON.stringify(tracePayload);
    if (fingerprint === lastTracedPlan.current) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      lastTracedPlan.current = fingerprint;
      void fetch("/api/trace-plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: fingerprint,
        signal: controller.signal,
        keepalive: true,
      }).catch(() => {
        // Observability must never interrupt the workout planning experience.
      });
    }, 1200);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [plan, profile]);

  useEffect(() => {
    const name = userName.trim();
    if (name.length < 2) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/history?name=${encodeURIComponent(name)}`,
          { signal: controller.signal },
        );
        const payload = (await response.json()) as {
          history?: HistoryEntry[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error ?? "Could not load history.");
        }
        setHistory(payload.history ?? []);
      } catch (error) {
        if (controller.signal.aborted) return;
        setHistoryError(
          error instanceof Error ? error.message : "Could not load history.",
        );
      }
    }, 500);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [userName]);

  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
    if (key === "availableDays" || key === "experience") setActiveDay(0);
  }

  function updateUserName(value: string) {
    setUserName(value);
    setShowSavePopup(false);
    setHistoryError("");
    if (value.trim().length < 2) setHistory([]);
  }

  async function savePlan() {
    const name = userName.trim();
    if (name.length < 2 || isSavingPlan) return;

    setIsSavingPlan(true);
    setHistoryError("");
    setShowSavePopup(false);
    try {
      const response = await fetch("/api/history", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          readiness: plan.readiness,
          trainingDays: plan.recommendedDays,
          goal: profile.goal,
          split: plan.days.map((day) => day.focus).join(" / "),
        }),
      });
      const payload = (await response.json()) as {
        entry?: HistoryEntry;
        error?: string;
      };
      if (!response.ok || !payload.entry) {
        throw new Error(payload.error ?? "Could not save this plan.");
      }
      setHistory((current) =>
        [
          payload.entry as HistoryEntry,
          ...current.filter((entry) => entry.id !== payload.entry?.id),
        ].slice(0, 5),
      );
      setShowSavePopup(true);
    } catch (error) {
      setHistoryError(
        error instanceof Error ? error.message : "Could not save this plan.",
      );
    } finally {
      setIsSavingPlan(false);
    }
  }

  async function sendChatMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = chatInput.trim();
    if (!content || isChatting) return;

    const nextMessages = [
      ...chatMessages,
      { role: "user" as const, content },
    ].slice(-10);
    setChatMessages(nextMessages);
    setChatInput("");
    setChatError("");
    setIsChatting(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.filter(
            (message, index) =>
              index > 0 || message.role === "user",
          ),
          sessionId: chatSessionId.current,
        }),
      });
      const payload = (await response.json()) as {
        message?: string;
        error?: string;
      };
      if (!response.ok || !payload.message) {
        throw new Error(payload.error ?? "Chat request failed");
      }
      setChatMessages((current) => [
        ...current,
        { role: "assistant", content: payload.message as string },
      ]);
    } catch (error) {
      setChatError(
        error instanceof Error
          ? error.message
          : "The coach is unavailable. Please try again.",
      );
    } finally {
      setIsChatting(false);
    }
  }

  return (
    <main>
      <nav className="nav-shell" aria-label="Primary navigation">
        <a className="brand" href="#top" aria-label="JUNIOUS home">
          JUNIOUS<span>.</span>
        </a>
        <div className="nav-meta">
          <span>Personal training analysis</span>
          <a href="#coach">Ask coach</a>
          <a href="#planner">Build my week ↓</a>
        </div>
      </nav>

      <header className="hero" id="top">
        <div className="eyebrow">
          <span className="pulse" />
          Adaptive gym programming
        </div>
        <h1>
          A week that
          <br />
          fits <em>your</em> body.
        </h1>
        <div className="hero-bottom">
          <p>
            Your schedule should reflect your body, recovery and real life—not
            a generic split pulled from the internet.
          </p>
          <div className="week-mark" aria-label="Example weekly cadence">
            {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
              <span className={[0, 2, 4].includes(index) ? "on" : ""} key={index}>
                {day}
              </span>
            ))}
          </div>
        </div>
      </header>

      <section className="planner" id="planner">
        <div className="section-heading">
          <span>01 / Your inputs</span>
          <h2>Tell us what your week looks like.</h2>
          <p>Adjust any input. Your recommendation updates instantly.</p>
        </div>

        <div className="planner-grid">
          <form className="profile-form" onSubmit={(event) => event.preventDefault()}>
            <fieldset>
              <legend>Your profile</legend>
              <label className="name-field">
                <span>Name</span>
                <input
                  type="text"
                  value={userName}
                  onChange={(event) => updateUserName(event.target.value)}
                  placeholder="Enter your name"
                  maxLength={50}
                  autoComplete="name"
                />
                <small>Used to save and find your plan history.</small>
              </label>
            </fieldset>

            <fieldset>
              <legend>Primary goal</legend>
              <div className="segment four">
                {(Object.keys(copy.goal) as Goal[]).map((goal) => (
                  <button
                    type="button"
                    className={profile.goal === goal ? "selected" : ""}
                    onClick={() => update("goal", goal)}
                    key={goal}
                  >
                    {copy.goal[goal]}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend>Training experience</legend>
              <div className="segment three">
                {(Object.keys(copy.experience) as Experience[]).map(
                  (experience) => (
                    <button
                      type="button"
                      className={
                        profile.experience === experience ? "selected" : ""
                      }
                      onClick={() => update("experience", experience)}
                      key={experience}
                    >
                      {copy.experience[experience]}
                    </button>
                  ),
                )}
              </div>
            </fieldset>

            <fieldset>
              <legend>Focused days</legend>
              <p className="field-help">
                Choose exactly how many days you want to train each week.
              </p>
              <div
                className="segment four focused-days"
                aria-label="Focused training days per week"
              >
                {[2, 3, 4, 5].map((days) => (
                  <button
                    type="button"
                    className={profile.availableDays === days ? "selected" : ""}
                    onClick={() => update("availableDays", days)}
                    aria-pressed={profile.availableDays === days}
                    key={days}
                  >
                    <strong>{days}</strong>
                    <span>days</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="number-grid">
              <NumberField
                label="Age"
                value={profile.age}
                unit="years"
                min={16}
                max={80}
                onChange={(value) => update("age", value)}
              />
              <NumberField
                label="Body weight"
                value={profile.weight}
                unit="kg"
                min={35}
                max={250}
                step={0.5}
                onChange={(value) => update("weight", value)}
              />
              <NumberField
                label="Height"
                value={profile.height}
                unit="cm"
                min={130}
                max={230}
                onChange={(value) => update("height", value)}
              />
              <NumberField
                label="Time per session"
                value={profile.sessionMinutes}
                unit="min"
                min={30}
                max={90}
                step={5}
                onChange={(value) => update("sessionMinutes", value)}
              />
              <NumberField
                label="Average sleep"
                value={profile.sleep}
                unit="hours"
                min={4}
                max={10}
                step={0.5}
                onChange={(value) => update("sleep", value)}
              />
              <NumberField
                label="Meals per day"
                value={profile.meals}
                unit="meals"
                min={1}
                max={6}
                onChange={(value) => update("meals", value)}
              />
              <NumberField
                label="Protein-rich meals"
                value={profile.proteinMeals}
                unit="/ day"
                min={0}
                max={6}
                onChange={(value) => update("proteinMeals", value)}
              />
              <NumberField
                label="Daily movement"
                value={profile.steps}
                unit="steps"
                min={1000}
                max={20000}
                step={500}
                onChange={(value) => update("steps", value)}
              />
            </div>
          </form>

          <aside className="analysis-card" aria-live="polite">
            <div className="analysis-top">
              <span>Readiness</span>
              <strong>{plan.readiness}</strong>
              <small>/ 100</small>
            </div>
            <div className="meter">
              <span style={{ width: `${plan.readiness}%` }} />
            </div>
            <div className="metric-row">
              <span>
                <small>Training frequency</small>
                <strong>{plan.recommendedDays} days</strong>
              </span>
              <span>
                <small>Strength sessions</small>
                <strong>{plan.recommendedDays}</strong>
              </span>
            </div>
            <div className="metric-row">
              <span>
                <small>Body mass index</small>
                <strong>{plan.bmi.toFixed(1)}</strong>
              </span>
              <span>
                <small>Support work</small>
                <strong>{plan.cardio.split(" easy")[0]}</strong>
              </span>
            </div>
            <div className="analysis-note">
              <span>Why this plan</span>
              <p>{plan.flags[0]}</p>
            </div>
            <button
              className="save-plan-button"
              type="button"
              onClick={savePlan}
              disabled={userName.trim().length < 2 || isSavingPlan}
            >
              {isSavingPlan ? "Saving…" : "Save this plan"}
            </button>
          </aside>
        </div>
      </section>

      <section className="schedule">
        <div className="section-heading inverse">
          <span>02 / Your week</span>
          <h2>{plan.recommendedDays} focused days. The rest helps them work.</h2>
        </div>

        <div className="day-tabs" role="tablist" aria-label="Training days">
          {plan.days.map((day, index) => (
            <button
              key={day.day}
              role="tab"
              aria-selected={activeDay === index}
              className={activeDay === index ? "active" : ""}
              onClick={() => setActiveDay(index)}
            >
              <small>0{index + 1}</small>
              <strong>{day.day.slice(0, 3)}</strong>
              <span>{day.focus}</span>
            </button>
          ))}
        </div>

        <div className="workout-card">
          <div className="workout-intro">
            <span>{selectedDay.day}</span>
            <h3>{selectedDay.focus}</h3>
            <p>
              Work at 2–3 reps in reserve. Add a little weight only when every
              set reaches the top of its range with clean form.
            </p>
            <div>
              <small>Target time</small>
              <strong>{selectedDay.duration}</strong>
            </div>
          </div>
          <ol className="exercise-list">
            {selectedDay.exercises.map((exercise, index) => (
              <li key={exercise.name}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{exercise.name}</strong>
                <small>{exercise.prescription}</small>
                <small>{exercise.rest} rest</small>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="history" id="history">
        <div className="section-heading">
          <span>03 / Your history</span>
          <h2>
            {userName.trim()
              ? `${userName.trim()}’s readiness over time.`
              : "Save a plan. See your progress take shape."}
          </h2>
          <p>The latest 5 saved plans appear here automatically.</p>
        </div>

        {historyError && (
          <p className="history-error" role="alert">
            {historyError}
          </p>
        )}

        {chartHistory.length > 0 ? (
          <div className="history-panel">
            <div
              className="history-chart"
              role="img"
              aria-label={`Readiness history for ${userName.trim()}`}
            >
              {chartHistory.map((entry) => (
                <div className="history-bar-column" key={entry.id}>
                  <strong>{entry.readiness}</strong>
                  <div className="history-bar-track">
                    <span style={{ height: `${entry.readiness}%` }} />
                  </div>
                  <small>
                    {new Date(`${entry.createdAt}Z`).toLocaleDateString(
                      undefined,
                      { month: "short", day: "numeric" },
                    )}
                  </small>
                </div>
              ))}
            </div>
            <div className="history-latest">
              <span>Latest saved plan</span>
              <strong>{history[0].trainingDays} training days</strong>
              <p>{history[0].split}</p>
              <small>{copy.goal[history[0].goal]}</small>
            </div>
          </div>
        ) : (
          <div className="history-empty">
            <strong>
              {userName.trim().length >= 2
                ? "No saved plans yet."
                : "Enter your name to load history."}
            </strong>
            <p>
              Adjust your inputs, then use “Save this plan” in the readiness
              card.
            </p>
          </div>
        )}
      </section>

      <section className="coach" id="coach">
        <div className="section-heading inverse">
          <span>04 / Ask the coach</span>
          <h2>A simple answer when your next step is not obvious.</h2>
        </div>
        <div className="chat-shell">
          <div
            className="chat-messages"
            aria-live="polite"
            aria-label="Conversation with JUNIOUS Coach"
          >
            {chatMessages.map((message, index) => (
              <div className={`chat-message ${message.role}`} key={index}>
                <span>{message.role === "assistant" ? "Coach" : "You"}</span>
                <p>{message.content}</p>
              </div>
            ))}
            {isChatting && (
              <div className="chat-message assistant waiting">
                <span>Coach</span>
                <p>Thinking about your question…</p>
              </div>
            )}
          </div>
          <form className="chat-form" onSubmit={sendChatMessage}>
            <label htmlFor="coach-question">Your fitness question</label>
            <div>
              <textarea
                id="coach-question"
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                placeholder="How should I warm up before leg day?"
                maxLength={1200}
                rows={3}
                disabled={isChatting}
              />
              <button
                type="submit"
                disabled={isChatting || !chatInput.trim()}
              >
                {isChatting ? "Thinking…" : "Ask coach →"}
              </button>
            </div>
            <p className="chat-hint">
              General fitness guidance only. For pain, injury, or medical
              concerns, speak with a qualified professional.
            </p>
            {chatError && (
              <p className="chat-error" role="alert">
                {chatError}
              </p>
            )}
          </form>
        </div>
      </section>

      <section className="support">
        <div className="section-heading">
          <span>05 / Support the work</span>
          <h2>Training is the signal. Recovery is the adaptation.</h2>
        </div>
        <div className="support-grid">
          <article>
            <span className="article-number">A</span>
            <h3>Protein target</h3>
            <strong>
              {plan.proteinLow}–{plan.proteinHigh} g
            </strong>
            <p>
              A practical daily range based on your body weight and goal. Spread
              it across {Math.max(3, profile.meals)} meals when possible.
            </p>
          </article>
          <article>
            <span className="article-number">B</span>
            <h3>Conditioning</h3>
            <strong>{plan.cardio}</strong>
            <p>
              Keep the pace conversational. Place it after a lifting session or
              on a separate easy day.
            </p>
          </article>
          <article>
            <span className="article-number">C</span>
            <h3>Progression</h3>
            <strong>+1 rep, then +2.5%</strong>
            <p>
              Add reps inside the range first. Increase load only after all sets
              are controlled for two sessions.
            </p>
          </article>
        </div>
        <div className="safety-note">
          <strong>Scope note</strong>
          <p>
            JUNIOUS is an educational planning tool, not medical advice. Stop
            if an exercise causes pain, and consult a qualified clinician or
            coach for injuries, pregnancy, chronic conditions, or eating
            concerns.
          </p>
        </div>
      </section>

      <footer>
        <a className="brand" href="#top">
          JUNIOUS<span>.</span>
        </a>
        <p>Train with intent. Recover on purpose.</p>
        <a href="#planner">Rebuild my week ↑</a>
      </footer>

      {showSavePopup && (
        <div className="save-popup" role="status" aria-live="polite">
          <span className="save-popup-icon" aria-hidden="true">
            ✓
          </span>
          <div>
            <strong>Saved</strong>
            <p>Your plan was added to {userName.trim()}’s history.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowSavePopup(false)}
            aria-label="Close saved message"
          >
            ×
          </button>
        </div>
      )}
    </main>
  );
}
