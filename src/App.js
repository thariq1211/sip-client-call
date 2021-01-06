import React from "react";
import { Route, BrowserRouter as Router, Switch } from "react-router-dom";
import { css } from "@emotion/css";

import CallProvider from "./context/callProvider";
import Home from "./routes/Home";

import "./index.css";

function App() {
  const container = css`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 50px;
  `;

  return (
    <Router>
      <Switch>
        <Route path="/" exact>
          <div className={container}>
            <h2>Please redirect to /sip-call route</h2>
          </div>
        </Route>
        <Route path="/sip-call">
          <CallProvider>
            <Home />
          </CallProvider>
        </Route>
        <Route path="/*" exact>
          <div className={container}>
            <h2>404 Not Found</h2>
          </div>
        </Route>
      </Switch>
    </Router>
  );
}

export default App;
