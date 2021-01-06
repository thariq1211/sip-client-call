import React from "react";
import { Route, BrowserRouter as Router, Switch } from "react-router-dom";
import CallProvider from "./context/callProvider";
import Home from "./routes/Home";

function App() {
  return (
    <Router>
      <Switch>
        <Route path="/sip-call">
          <CallProvider>
            <Home />
          </CallProvider>
        </Route>
        <Route exact>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "50px"
            }}
          >
            <strong>404 Not Found</strong>
          </div>
        </Route>
      </Switch>
    </Router>
  );
}

export default App;
