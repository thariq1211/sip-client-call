/* eslint-disable no-empty */
import React, { useContext, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import countdown from "countdown";

import { CallContext } from "../../context/callProvider";

import { callControls, container, videoContainer } from "./styles";

const Home = () => {
  const query = new URLSearchParams(useLocation().search);
  const {
    callState,
    setParams,
    registerSip,
    unregisterSip,
    acceptCall,
    holdCall,
    unholdCall,
    rejectCall,
    endCall
  } = useContext(CallContext);
  const { ongoingCall, incomingCall, callerId } = callState;
  const [status, setStatus] = useState();
  const [timer, setTimer] = useState();
  const timerRef = useRef();
  const sipConfig = option => ({
    extension: option.has("extension") ? option.get("extension") : "",
    password: option.has("password") ? option.get("password") : ""
  });
  const [opt] = useState(sipConfig(query));
  const { extension, password } = opt;
  const poster =
    "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Icons8_flat_video_call.svg/600px-Icons8_flat_video_call.svg.png";

  useEffect(() => {
    if (ongoingCall) {
      timerRef.current = countdown(
        new Date(),
        ts => {
          setTimer(`${ts.hours}:${ts.minutes}:${ts.seconds}`);
        },
        countdown.HOURS | countdown.MINUTES | countdown.SECONDS
      );
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      setTimer(null);
    }
  }, [ongoingCall]);

  useEffect(() => {
    if (extension && password) setParams(sipConfig(query));
  }, [extension, password]);

  useEffect(() => {
    if (status) {
      if (status === "0") {
        unregisterSip();
      } else if (status === "1") {
        registerSip();
      } else {
        console.debug("disconnected");
      }
    }
  }, [status]);

  const incomingUI = (
    <div className={callControls}>
      <button type="button" onClick={acceptCall}>
        answer
      </button>
      <span>{`Call from ${callerId}`}</span>
      <button type="button" onClick={rejectCall}>
        reject
      </button>
    </div>
  );

  const ongoingUI = (
    <div className={callControls}>
      <input placeholder="input dtmf" />
      <button type="button">transfer queue</button>
      <input placeholder="input extension" />
      <button type="button">transfer extension</button>
      <button type="button" onClick={holdCall}>
        hold
      </button>
      <button type="button" onClick={unholdCall}>
        unhold
      </button>
      <button type="button" onClick={endCall}>
        hangup
      </button>
    </div>
  );

  if (extension && password) {
    return (
      <div className={container}>
        <div className={callControls}>
          <strong>{`Status: ${callState.sipStatus}`}</strong>
          <br />
          <select
            onChange={e => {
              setStatus(e.target.value);
            }}
          >
            <option value="null" defaultValue>
              Select Status
            </option>
            <option value={1}>Register</option>
            <option value={0}>UnRegister</option>
          </select>
        </div>
        <div className={videoContainer}>
          <video id="remoteView" playsInline autoPlay poster={poster} />
          <video id="selfView" playsInline autoPlay muted poster={poster} />
        </div>
        <strong>{ongoingCall && timer}</strong>
        {ongoingCall && ongoingUI}
        {incomingCall && incomingUI}
      </div>
    );
  }
  return <div className={container}>hello</div>;
};

export default Home;
