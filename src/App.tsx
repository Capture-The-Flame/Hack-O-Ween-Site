// App.tsx
import React, { useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useSearchParams } from "react-router-dom";
import IntroOverlay from "./Intro";
import ChallengeFlow, {STORAGE_KEY} from "./Challenge";
import "./intro.css";
import "./Challenge.css";
import "./Congrats.css"
import { asset } from "./asset";

const dancing = asset("cuteGifs/dancingPumpkin.gif");

function toCentralWithMs(input: string | number) {
  const d = new Date(input);
  const base = d.toLocaleString("en-US", {
    timeZone: "America/Chicago",
    hour12: false,
  });
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  return `${base}.${ms} CT`; // label “CT” covers CST/CDT
}


function CongratsRoute({ onReset }: { onReset: () => void }) {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const finishedIso = sp.get("finished");
  const finishedMs  = sp.get("ms"); 

  const handlePlayAgain = () => {
    onReset();                       // clears storage + bumps game key in App
    navigate("/", { replace: true }); // go back to start
  };

  return (
    <main className="congrats-screen">
      <h1 className="congrats-text">Congratulations</h1>
      <img src={dancing} className="dancingPumpkin" aria-hidden/>
      <div className="text-button">
        {finishedIso && (
          <p className="time-ticket">
            Finished at: <code>{toCentralWithMs(finishedIso)}</code> ({finishedMs} ms)
          </p>
        )}

        <button
          onClick={handlePlayAgain}
          className="mt-6 rounded-xl border px-4 py-2 hover:bg-slate-50"
        >
          Play again (reset)
        </button>
      </div>
    </main>
  );
}

export default function App() {
  const [done, setDone] = useState(false);

  const [gameKey, setGameKey] = React.useState(0);
  const handleResetAll = () => {
    localStorage.removeItem(STORAGE_KEY);
    setGameKey((k) => k + 1);
  };

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      {!done && <IntroOverlay onDone={() => setDone(true)} />}
      <Routes>
        <Route
          path="/"
          element={
            <main>
              <ChallengeFlow 
                key={gameKey}
                onRequestReset={handleResetAll}
              />
            </main>
          }
        />
        <Route path="/congrats"
         element={<CongratsRoute onReset={handleResetAll} />}
        />
      </Routes>
    </BrowserRouter>
  );
}
