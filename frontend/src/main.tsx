import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { MotionConfig } from "motion/react";
import * as Tooltip from "@radix-ui/react-tooltip";
import "./styles.css";
import "./styles/modern.css";
import "./styles/radar.css";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <Tooltip.Provider delayDuration={200}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Tooltip.Provider>
    </MotionConfig>
  </React.StrictMode>,
);
