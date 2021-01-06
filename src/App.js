import React from "react";
import { Route, BrowserRouter as Router, Switch } from "react-router-dom";

import CallProvider from "./context/callProvider";
import Home, { Redirect } from "./routes/Home";
import NotFound from "./routes/NotFound";

import "./index.css";

function App() {
  return (
    <Router>
      <Switch>
        <Route path="/" exact>
          <Redirect />
        </Route>
        <Route path="/sip-call">
          <CallProvider>
            <Home />
          </CallProvider>
        </Route>
        <Route path="/*" exact>
          <NotFound />
        </Route>
      </Switch>
    </Router>
  );
}

export default App;
