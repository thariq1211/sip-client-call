/* eslint-disable no-empty */
import React, { useContext, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import countdown from "countdown";

import { CallContext } from "../../context/callProvider";

import { callControls, container, container2, videoContainer } from "./styles";

export const Redirect = () => {
  return (
    <div className={container2}>
      <h2>Please redirect to /sip-call route</h2>
    </div>
  );
};

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
    referCallExt,
    referCall,
    sendTone,
    endCall
  } = useContext(CallContext);
  const { ongoingCall, incomingCall, callerId, onHold } = callState;
  const [status, setStatus] = useState();
  const [timer, setTimer] = useState();
  const [extToTransfer, setExtToTransfer] = useState();
  const [dtmf, setDtmf] = useState();
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
      alert(`Call duration ${timer}`);
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

  const transferExtension = ext => {
    if (extToTransfer) {
      referCallExt(ext);
    } else {
      alert("input extension tujuan");
    }
  };

  const transferQueue = tone => {
    if (dtmf) {
      referCall();
      setTimeout(() => sendTone(tone), 2000);
    } else {
      alert("input queue tujuan");
    }
  };

  const incomingUI = (
    <div className={callControls}>
      <button type="button" onClick={acceptCall}>
        Answer
      </button>
      <span>{`Call from ${callerId}`}</span>
      <button type="button" onClick={rejectCall}>
        Reject
      </button>
    </div>
  );

  const ongoingUI = (
    <>
      {onHold && <span>Call onHold</span>}
      <div className={callControls}>
        <input
          placeholder="Input DTMF"
          onChange={e => setDtmf(e.target.value)}
        />
        <button
          type="button"
          onClick={() => {
            transferQueue(dtmf);
          }}
        >
          Transfer Queue
        </button>
        <input
          placeholder="Input Extension"
          onChange={e => setExtToTransfer(e.target.value)}
        />
        <button
          type="button"
          onClick={() => {
            transferExtension(extToTransfer);
          }}
        >
          Transfer Extension
        </button>
        {onHold ? (
          <button type="button" onClick={unholdCall}>
            unhold
          </button>
        ) : (
          <button type="button" onClick={holdCall}>
            Hold
          </button>
        )}
        <button type="button" onClick={endCall}>
          hangup
        </button>
      </div>
    </>
  );

  if (extension && password) {
    return (
      <div className={container}>
        <div className={callControls}>
          <strong>{`Status: ${callState.sipStatus}`}</strong>
        </div>
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
        <video id="recordingVideo" hidden autoPlay muted />
        <div className={videoContainer}>
          <video id="remoteView" playsInline autoPlay poster={poster} />
          <video id="selfView" playsInline autoPlay muted poster={poster} />
        </div>
        {ongoingCall && <strong>{timer}</strong>}
        {ongoingCall && ongoingUI}
        {incomingCall && incomingUI}
      </div>
    );
  }
  return (
    <div className={container2}>
      <h2>Hello World</h2>
    </div>
  );
};

export default Home;
