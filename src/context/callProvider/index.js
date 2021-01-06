/* eslint-disable no-use-before-define */
/* eslint-disable no-unused-vars */
import React, { useEffect, useReducer, useState } from "react";
import { node } from "prop-types";
import JsSIP from "jssip";
import Cookie from "js-cookie";

import actions from "./actions";
import { callReducer, initialState } from "./reducers";

import ringtone from "../../assets/incoming_call.mp3";

export const CallContext = React.createContext();

const CallProvider = ({ children }) => {
  const url = "iswitch.ddns.net";
  let socket = "";
  let configuration = {};
  let rtcSession;
  let callSession;
  const incomingCallRingTone = new Audio(ringtone);
  incomingCallRingTone.loop = true;
  const [state, dispatch] = useReducer(callReducer, initialState);

  const [params, setParams] = useState();
  const [rtcSessionState, updateRtcSession] = useState();
  const [sessionCallState, updateCallSession] = useState();

  const extension = params ? params.extension : undefined;
  const password = params ? params.password : undefined;

  const initJsSIP = () => {
    JsSIP.debug.enable("JsSIP:WebSocketInterface");
    JsSIP.debug.enable("JsSIP:Transport");
    socket = new JsSIP.WebSocketInterface("wss://iswitch.ddns.net:8089/ws");
    configuration = {
      sockets: [socket],
      uri: `sip:${extension}@${url}`,
      password
    };
    rtcSession = new JsSIP.UA(configuration);
    updateRtcSession(rtcSession);

    rtcSession.on("newRTCSession", data => {
      console.log("RTC SESSION START");
      dispatch({ type: actions.REGISTER });
      callSession = data.session;
      updateCallSession(data.session);

      if (callSession.direction === "incoming") {
        console.log("[Event Incoming]");
        incomingCallRingTone.play();
        /**
         * @TODO Fix redundant logic
         */
        const callerId = data.request.getHeader("From");
        const temp = callerId.substring(
          callerId.indexOf("<sip:") + 5,
          callerId.indexOf("@")
        );

        const temp2 = callerId.substring(
          callerId.indexOf("-"),
          callerId.indexOf("@")
        );
        const extensionCaller = temp.substring(0, temp.indexOf("*"));
        const uniqueId = temp.substring(temp.indexOf("*") + 1);
        sessionStorage.setItem("uniqueId", uniqueId);
        dispatch({ type: actions.SETCALLER, payload: temp });
        Cookie.set("extension", extensionCaller);
        dispatch({ type: actions.INCOMING_START });

        // incoming call here

        /* On accept incoming call */
        callSession.on("accepted", acceptedCall);

        callSession.on("confirmed", () => {
          console.log("[CALL CONFIRMED]");
          handleSession(callSession);
          // const recorder = new Recording(callSession);
          // recordRef.current = recorder;
          // dispatchRecord(recorder);
          // recorder.startRecording();
          // this handler will be called for incoming calls too
        });

        callSession.on("hold", holdSession);

        callSession.on("unhold", unholdSession);

        /* On end ongoing call */
        callSession.on("ended", () => {
          console.log("[Call ended]");
          videoCallStop();
        });

        /**
         * On call failed
         * call was canceled by the caller
         */
        callSession.on("failed", failedCall);
      }
    });

    rtcSession.on("connecting", _data => {
      dispatch({ type: actions.CONNECTING });
      console.log("sip connecting");
    });

    rtcSession.on("connected", _data => {
      dispatch({ type: actions.CONNECTED });
      console.log("connected");
    });

    rtcSession.on("disconnected", _data => {
      dispatch({ type: actions.DISCONNECTED });
      console.log("disconnected");
    });

    rtcSession.on("registered", cb => {
      dispatch({ type: actions.REGISTERED });
      const { data, status_code } = cb.response;
      console.log(`registered ${data} ${status_code}`);
    });

    rtcSession.on("unregistered", cb => {
      dispatch({ type: actions.UNREGISTERED });
      const { data, status_code } = cb.response;
      console.log(`unregister ${data} ${status_code}`);
    });

    rtcSession.on("registrationFailed", cb => {
      dispatch({ type: actions.REGISTERFAILED });
      const { data, status_code } = cb.response;
      console.log(`unregister failed ${cb.cause} ${data} ${status_code}`);
    });

    // rtcSession.start();
  };

  /**
   * LIST SIP HANDLE FUNCTION
   */

  const holdSession = () => {
    console.log("[Hold call]");
    dispatch({ type: actions.TOGGLE_HOLD });
  };

  const unholdSession = () => {
    console.log("[Unhold call]");
    dispatch({ type: actions.TOGGLE_HOLD });
  };

  const failedCall = () => {
    // unable to establish the call
    console.log("[FAILED CALL]");
    Cookie.remove("extension");
    Cookie.remove("ts");
    incomingCallRingTone.pause();
    dispatch({ type: actions.DECLINE_CALL });
  };

  const handleRemoteStream = (stream, uivideo) => {
    console.log("[Handle Remote Stream]");
    // console.log(stream.getVideoTracks.length);

    if ("srcObject" in uivideo) {
      uivideo.srcObject = stream;
    } else {
      uivideo.src = URL.createObjectURL(stream);
    }

    stream.addEventListener("addtrack", event => {
      const { track } = event;

      if (uivideo.srcObject !== stream) return;

      console.log('[remote stream "addtrack" event]');
      // Refresh remote video
      if ("srcObject" in uivideo) {
        uivideo.srcObject = stream;
      } else {
        uivideo.src = URL.createObjectURL(stream);
      }

      track.addEventListener("ended", () => {
        console.log(`[remote track "ended" event track: ${track}]`);
        // JsSIP.Utils.closeMediaStream(stream);
      });
    });
    stream.addEventListener("removetrack", () => {
      if (uivideo.srcObject !== stream) return;
      // Refresh remote video
      if ("srcObject" in uivideo) {
        uivideo.srcObject = stream;
      } else {
        uivideo.src = URL.createObjectURL(stream);
      }
    });
  };

  const handleSession = session => {
    const peerConnection = session.connection;
    const selfView = document.getElementById("selfView");
    const remoteView = document.getElementById("remoteView");
    const localStream = peerConnection.getLocalStreams()[0];
    const remoteStream = peerConnection.getRemoteStreams()[0];
    let localClonedStream = null;
    console.log("[Handle Session Call]");

    if (localStream) {
      localClonedStream = localStream.clone();
      // console.log(localClonedStream);

      if ("srcObject" in selfView) {
        selfView.srcObject = localClonedStream;
      } else {
        selfView.src = URL.createObjectURL(localClonedStream);
      }
    }
    if (remoteStream) {
      handleRemoteStream(remoteStream, remoteView);
    }
    session.on("ended", _data => {
      console.log("[Session Ended]");
      JsSIP.Utils.closeMediaStream(localClonedStream);
    });
    peerConnection.addEventListener("addstream", event => {
      console.log('peerconnection "addstream" event');
      // addLog('peerconnection "addstream" event');
      handleRemoteStream(event.stream, remoteView);
    });
  };

  const videoCallStop = () => {
    const selfView = document.getElementById("selfView");
    const remoteView = document.getElementById("remoteView");

    // selfView.pause();
    // selfView.removeAttribute("src"); // empty source
    // selfView.load();

    // remoteView.pause();
    // remoteView.removeAttribute("src"); // empty source
    // remoteView.load();

    sessionStorage.setItem("incomingCall", "false");
    // deleteExt(Cookie.get("extension"));
    dispatch({ type: actions.END_CALL });
  };

  const acceptedCall = () => {
    console.log("[CALL ACCEPTED]");
    incomingCallRingTone.pause();

    // GET EXTENTION USER ID
    sessionStorage.setItem("hidden", "1");
    dispatch({ type: actions.ACCEPT_CALL });
  };

  /**
   * LIST SIP FUNCTION
   */

  const holdCall = () => {
    if (sessionCallState && sessionCallState.hold) sessionCallState.hold();
  };

  const unholdCall = () => {
    if (sessionCallState && sessionCallState.unhold) sessionCallState.unhold();
  };

  const acceptCall = () => {
    const callOptions = {
      mediaConstraints: {
        audio: true,
        video: true
      },
      pcConfig: {
        iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }]
      }
    };

    if (sessionCallState && sessionCallState.answer) {
      sessionCallState.answer(callOptions);
    }
  };

  const rejectCall = () => {
    if (sessionCallState && sessionCallState.terminate)
      sessionCallState.terminate();
    dispatch({ type: actions.DECLINE_CALL });
  };

  const referCall = () => {
    if (sessionCallState) sessionCallState.sendDTMF("#1");
  };

  const sendTone = tones => {
    if (sessionCallState && sessionCallState.sendDTMF)
      sessionCallState.sendDTMF(tones);
    dispatch({ type: actions.TRANSFER_CALL });
  };

  const referCallExt = ext => {
    const options = {
      eventHandlers: {
        requestSucceeded(e) {
          console.log(`[requestSucceeded] ${e}`);
          /** saat mencoba call dengan sukses (extension aktif) akan berjalan */
        },
        requestFailed(e) {
          console.log(`[requestFailed] ${e}`);
          /** saat mencoba call gagal (extension nonaktif / tidak teregister) akan berjalan */
          setTimeout(() => {
            videoCallStop();
          }, 1000);
        },
        trying(e) {
          console.log(`[trying] ${e}`);
          /** setelah requestSucceeded akan dijalankan */
        },
        progress(e) {
          console.log(`[progress] ${e}`);
          /** setelah trying akan dijalankan */
        },
        accepted(e) {
          console.log(`[accepted] ${e}`);
          /** setelah tujuan answer call akan dijalankan */
          setTimeout(() => {
            videoCallStop();
          }, 1000);
        },
        failed(e) {
          console.log(`[failed] ${e}`);
          /** setelah tujuan reject call akan dijalankan */
          setTimeout(() => {
            videoCallStop();
          }, 1000);
        }
      }
    };

    if (sessionCallState) sessionCallState.refer(ext, options);
    setTimeout(() => {
      videoCallStop();
    }, 2000);
    dispatch({ type: actions.TRANSFER_CALL });
  };

  const endCall = () => {
    if (sessionCallState && sessionCallState.terminate)
      sessionCallState.terminate();
  };

  const registerSip = () => {
    rtcSessionState.start();
  };

  const unregisterSip = () => {
    rtcSessionState.stop();
  };

  useEffect(() => {
    if (extension && password) initJsSIP();
  }, [extension, password]);

  const exported = {
    params,
    setParams,
    callState: state,
    registerSip,
    unregisterSip,
    acceptCall,
    referCallExt,
    referCall,
    sendTone,
    holdCall,
    unholdCall,
    rejectCall,
    endCall
  };

  return (
    <CallContext.Provider value={exported}>{children}</CallContext.Provider>
  );
};

CallProvider.propTypes = {
  children: node.isRequired
};

export default CallProvider;
